#!/usr/bin/env python3
"""
WhatsApp History Sync Script
Fetches messages from Evolution API and stores them in PostgreSQL.
Handles LID→phone resolution and deduplication.
"""

import json
import sys
import time
import requests
import psycopg2
from datetime import datetime

# Config
EVOLUTION_URL = "http://localhost:8080"
API_KEY = "pratica_evolution_key_2026_secure"
INSTANCE = "corretor-26eb9297-5254-4dae-b459-42889b822cb3-1769665293128"
USER_ID = "26eb9297-5254-4dae-b459-42889b822cb3"
TENANT_ID = 1  # Will be verified

DB_CONFIG = {
    "dbname": "pratica",
    "user": "postgres",
    "host": "/var/run/postgresql"
}

HEADERS = {
    "apikey": API_KEY,
    "Content-Type": "application/json"
}

def get_db():
    return psycopg2.connect(**DB_CONFIG)

def api_post(path, body=None):
    url = f"{EVOLUTION_URL}{path}"
    r = requests.post(url, headers=HEADERS, json=body or {}, timeout=30)
    r.raise_for_status()
    return r.json()

def api_get(path):
    url = f"{EVOLUTION_URL}{path}"
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()

def get_tenant_id(conn):
    """Get tenant_id from users table"""
    cur = conn.cursor()
    cur.execute("SELECT tenant_id FROM users WHERE id = %s", (USER_ID,))
    row = cur.fetchone()
    if row:
        return row[0]
    # Try tenants table directly
    cur.execute("SELECT id FROM tenants LIMIT 1")
    row = cur.fetchone()
    return row[0] if row else 1

def build_lid_phone_map():
    """Build LID→phone number mapping from Evolution API chats"""
    print("\n📱 Building LID→phone mapping...")
    mapping = {}
    
    # 1. From findChats - lastMessage may have remoteJidAlt
    chats = api_post(f"/chat/findChats/{INSTANCE}")
    for c in chats:
        rj = c.get('remoteJid', '') or ''
        lm = c.get('lastMessage', {}) or {}
        key = lm.get('key', {}) or {}
        alt = key.get('remoteJidAlt', '') or ''
        
        if '@lid' in rj and '@s.whatsapp.net' in alt:
            lid = rj.split('@')[0]
            phone = alt.split('@')[0]
            mapping[lid] = phone
        elif '@s.whatsapp.net' in rj and '@lid' in alt:
            lid = alt.split('@')[0]
            phone = rj.split('@')[0]
            mapping[lid] = phone
    
    print(f"  Found {len(mapping)} mappings from chats")
    
    # 2. For unmapped LID chats, fetch a few messages to find remoteJidAlt
    lid_chats = [c for c in chats if '@lid' in (c.get('remoteJid','') or '') 
                 and c.get('remoteJid','').split('@')[0] not in mapping]
    
    print(f"  {len(lid_chats)} unmapped LID chats, scanning messages...")
    for i, chat in enumerate(lid_chats):
        rj = chat.get('remoteJid', '')
        lid = rj.split('@')[0]
        try:
            result = api_post(f"/chat/findMessages/{INSTANCE}", {
                "where": {"key": {"remoteJid": rj}},
                "limit": 20
            })
            records = result.get('messages', {}).get('records', [])
            for rec in records:
                k = rec.get('key', {})
                alt = k.get('remoteJidAlt', '') or ''
                if '@s.whatsapp.net' in alt:
                    phone = alt.split('@')[0]
                    mapping[lid] = phone
                    break
                elif '@lid' in alt:
                    # fromMe messages might have reversed alt
                    pass
        except Exception as e:
            print(f"  ⚠️ Error fetching messages for {rj}: {e}")
        
        if (i + 1) % 10 == 0:
            print(f"  Scanned {i+1}/{len(lid_chats)} LID chats...")
            time.sleep(0.5)  # Rate limit
    
    print(f"  Total mappings: {len(mapping)}")
    for lid, phone in sorted(mapping.items()):
        print(f"    {lid} → {phone}")
    
    return mapping

def get_all_chats():
    """Get all personal chats (not groups, not broadcasts)"""
    chats = api_post(f"/chat/findChats/{INSTANCE}")
    personal = []
    for c in chats:
        rj = c.get('remoteJid', '') or ''
        if '@g.us' in rj or 'status@broadcast' in rj or 'newsletter' in rj:
            continue
        if not rj:
            continue
        personal.append(c)
    return personal

def fetch_all_messages(remote_jid, limit_per_page=100):
    """Fetch all messages for a given remoteJid"""
    all_messages = []
    page = 1
    while True:
        try:
            result = api_post(f"/chat/findMessages/{INSTANCE}", {
                "where": {"key": {"remoteJid": remote_jid}},
                "limit": limit_per_page,
                "page": page
            })
            msgs_data = result.get('messages', {})
            records = msgs_data.get('records', [])
            total = msgs_data.get('total', 0)
            pages = msgs_data.get('pages', 1)
            
            all_messages.extend(records)
            
            if page >= pages:
                break
            page += 1
            time.sleep(0.2)  # Rate limit
        except Exception as e:
            print(f"  ⚠️ Error page {page} for {remote_jid}: {e}")
            break
    
    return all_messages

def resolve_phone(msg, lid_map):
    """Resolve the actual phone number from a message"""
    key = msg.get('key', {})
    rj = key.get('remoteJid', '') or ''
    alt = key.get('remoteJidAlt', '') or ''
    
    # Direct phone
    if '@s.whatsapp.net' in rj:
        return rj.split('@')[0]
    
    # LID with alt
    if '@lid' in rj and '@s.whatsapp.net' in alt:
        return alt.split('@')[0]
    
    # LID with mapping
    if '@lid' in rj:
        lid = rj.split('@')[0]
        if lid in lid_map:
            return lid_map[lid]
    
    return None

def extract_message_text(msg):
    """Extract text content from message"""
    message = msg.get('message', {}) or {}
    
    # Standard conversation
    if 'conversation' in message:
        return message['conversation']
    
    # Extended text
    ext = message.get('extendedTextMessage', {})
    if ext and 'text' in ext:
        return ext['text']
    
    # Image/video/document with caption
    for key in ['imageMessage', 'videoMessage', 'documentMessage', 'documentWithCaptionMessage']:
        sub = message.get(key, {})
        if sub:
            caption = sub.get('caption', '')
            if key == 'documentWithCaptionMessage':
                inner = sub.get('message', {}).get('documentMessage', {})
                caption = inner.get('caption', '') or inner.get('fileName', '')
            return caption or f"[{key.replace('Message', '')}]"
    
    # Audio
    if 'audioMessage' in message:
        return "[áudio]"
    
    # Sticker
    if 'stickerMessage' in message:
        return "[figurinha]"
    
    # Location
    if 'locationMessage' in message:
        return "[localização]"
    
    # Contact
    if 'contactMessage' in message:
        return "[contato]"
    
    # Poll
    if 'pollCreationMessage' in message or 'pollCreationMessageV3' in message:
        return "[enquete]"
    
    # Reaction
    if 'reactionMessage' in message:
        return None  # Skip reactions
    
    # Protocol (read receipts, etc.)
    if 'protocolMessage' in message:
        return None  # Skip protocol messages
    
    # Unknown type - log it
    types = [k for k in message.keys() if k != 'messageContextInfo']
    if types:
        return f"[{types[0].replace('Message', '')}]"
    
    return None

def get_message_type(msg):
    """Determine message type"""
    message = msg.get('message', {}) or {}
    if 'conversation' in message or 'extendedTextMessage' in message:
        return 'text'
    if 'imageMessage' in message:
        return 'image'
    if 'videoMessage' in message:
        return 'video'
    if 'audioMessage' in message:
        return 'audio'
    if 'documentMessage' in message or 'documentWithCaptionMessage' in message:
        return 'document'
    if 'stickerMessage' in message:
        return 'sticker'
    if 'locationMessage' in message:
        return 'location'
    if 'contactMessage' in message:
        return 'contact'
    if 'reactionMessage' in message:
        return 'reaction'
    if 'protocolMessage' in message:
        return 'protocol'
    return 'unknown'

def get_media_url(msg):
    """Extract media URL if present"""
    message = msg.get('message', {}) or {}
    for key in ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']:
        sub = message.get(key, {})
        if sub:
            return sub.get('url', '') or sub.get('directPath', '')
    return None

def sync_messages(conn, tenant_id, lid_map):
    """Main sync: fetch and store all personal chat messages"""
    chats = get_all_chats()
    print(f"\n💬 Found {len(chats)} personal chats to sync")
    
    cur = conn.cursor()
    total_inserted = 0
    total_skipped = 0
    total_updated = 0
    contacts_synced = set()
    
    for i, chat in enumerate(chats):
        rj = chat.get('remoteJid', '') or ''
        name = chat.get('pushName', '') or ''
        
        # Resolve phone for this chat
        phone = None
        if '@s.whatsapp.net' in rj:
            phone = rj.split('@')[0]
        elif '@lid' in rj:
            lid = rj.split('@')[0]
            phone = lid_map.get(lid)
        
        if not phone:
            # Skip chats we can't map to a phone number
            continue
        
        contacts_synced.add(phone)
        
        print(f"\n  [{i+1}/{len(chats)}] {name or phone} ({phone})")
        
        # Fetch all messages
        messages = fetch_all_messages(rj)
        print(f"    📨 {len(messages)} messages from API")
        
        chat_inserted = 0
        chat_skipped = 0
        
        for msg in messages:
            key = msg.get('key', {})
            msg_id = key.get('id', '')
            is_from_me = key.get('fromMe', False)
            push_name = msg.get('pushName', '') or ''
            msg_type = get_message_type(msg)
            
            # Skip reactions and protocol messages
            if msg_type in ('reaction', 'protocol'):
                continue
            
            msg_text = extract_message_text(msg)
            if msg_text is None:
                continue
            
            media_url = get_media_url(msg)
            caption = None
            message_obj = msg.get('message', {}) or {}
            for mk in ['imageMessage', 'videoMessage', 'documentMessage']:
                sub = message_obj.get(mk, {})
                if sub and sub.get('caption'):
                    caption = sub['caption']
                    break
            
            # Timestamp
            ts = msg.get('messageTimestamp', 0)
            if isinstance(ts, dict):
                ts = ts.get('low', 0)
            try:
                timestamp = datetime.fromtimestamp(int(ts))
            except:
                timestamp = datetime.now()
            
            # Contact name
            contact_name = push_name if not is_from_me else name
            if not contact_name or contact_name == 'Você':
                contact_name = phone
            
            # Raw data (compact - just key fields)
            raw = json.dumps({
                'key': key,
                'pushName': push_name,
                'messageType': msg.get('messageType', ''),
                'source': msg.get('source', ''),
            })
            
            # Upsert - skip if message_id already exists
            try:
                cur.execute("""
                    INSERT INTO whatsapp_messages 
                    (tenant_id, instance_name, message_id, phone_number, contact_name,
                     message_type, message_text, media_url, caption, is_from_me,
                     status, timestamp, raw_data, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, NOW(), NOW())
                    ON CONFLICT (instance_name, message_id) DO UPDATE SET
                        phone_number = EXCLUDED.phone_number,
                        contact_name = CASE WHEN EXCLUDED.contact_name != '' THEN EXCLUDED.contact_name ELSE whatsapp_messages.contact_name END,
                        updated_at = NOW()
                    RETURNING (xmax = 0) as inserted
                """, (
                    tenant_id, INSTANCE, msg_id, phone, contact_name,
                    msg_type, msg_text, media_url, caption, is_from_me,
                    msg.get('status', 'DELIVERY_ACK'), timestamp, raw
                ))
                result = cur.fetchone()
                if result and result[0]:
                    chat_inserted += 1
                else:
                    total_updated += 1
            except Exception as e:
                conn.rollback()
                chat_skipped += 1
                continue
        
        conn.commit()
        total_inserted += chat_inserted
        total_skipped += chat_skipped
        print(f"    ✅ +{chat_inserted} new, {chat_skipped} skipped")
    
    return total_inserted, total_skipped, total_updated, contacts_synced

def update_lid_records(conn, lid_map):
    """Update existing LID phone_numbers in DB to real phone numbers"""
    print("\n🔄 Updating LID records to real phone numbers...")
    cur = conn.cursor()
    total = 0
    for lid, phone in lid_map.items():
        cur.execute("""
            UPDATE whatsapp_messages 
            SET phone_number = %s, updated_at = NOW()
            WHERE phone_number = %s AND phone_number != %s
        """, (phone, lid, phone))
        count = cur.rowcount
        if count > 0:
            print(f"  {lid} → {phone}: {count} records updated")
            total += count
    conn.commit()
    print(f"  Total LID records fixed: {total}")
    return total

def sync_contacts(conn, tenant_id, contacts_synced, lid_map):
    """Ensure all synced contacts exist in whatsapp_synced_contacts"""
    print("\n👤 Syncing contacts...")
    
    # Get contact info from Evolution API
    contacts = api_post(f"/chat/findContacts/{INSTANCE}")
    contact_map = {}
    for c in contacts:
        rj = c.get('remoteJid', '') or ''
        if '@s.whatsapp.net' in rj:
            phone = rj.split('@')[0]
            contact_map[phone] = {
                'name': c.get('pushName', '') or '',
                'pic': c.get('profilePicUrl', '') or '',
                'jid': rj
            }
    
    cur = conn.cursor()
    inserted = 0
    for phone in contacts_synced:
        info = contact_map.get(phone, {})
        name = info.get('name', '') or phone
        pic = info.get('pic', '')
        jid = info.get('jid', f'{phone}@s.whatsapp.net')
        
        cur.execute("""
            INSERT INTO whatsapp_synced_contacts (tenant_id, remote_jid, phone_number, push_name, profile_picture_url, synced_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (tenant_id, remote_jid) DO UPDATE SET
                push_name = CASE WHEN EXCLUDED.push_name != '' AND EXCLUDED.push_name != whatsapp_synced_contacts.phone_number 
                    THEN EXCLUDED.push_name ELSE whatsapp_synced_contacts.push_name END,
                profile_picture_url = CASE WHEN EXCLUDED.profile_picture_url != '' 
                    THEN EXCLUDED.profile_picture_url ELSE whatsapp_synced_contacts.profile_picture_url END,
                updated_at = NOW()
            RETURNING (xmax = 0) as is_new
        """, (tenant_id, jid, phone, name, pic))
        result = cur.fetchone()
        if result and result[0]:
            inserted += 1
    
    conn.commit()
    print(f"  {inserted} new contacts added, {len(contacts_synced)} total processed")

def main():
    print("=" * 60)
    print("🔄 WhatsApp History Sync")
    print("=" * 60)
    print(f"Instance: {INSTANCE}")
    print(f"API: {EVOLUTION_URL}")
    
    # Verify connection
    try:
        status = api_get(f"/instance/connectionState/{INSTANCE}")
        state = status.get('instance', {}).get('state', 'unknown')
        print(f"Connection: {state}")
        if state != 'open':
            print("⚠️ Instance not connected! Some data may be stale.")
    except Exception as e:
        print(f"⚠️ Could not check connection: {e}")
    
    conn = get_db()
    tenant_id = get_tenant_id(conn)
    print(f"Tenant ID: {tenant_id}")
    
    # Step 1: Build LID→phone mapping
    lid_map = build_lid_phone_map()
    
    # Step 2: Update existing LID records
    lid_fixed = update_lid_records(conn, lid_map)
    
    # Step 3: Sync all messages
    inserted, skipped, updated, contacts_synced = sync_messages(conn, tenant_id, lid_map)
    
    # Step 4: Sync contacts
    sync_contacts(conn, tenant_id, contacts_synced, lid_map)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SYNC COMPLETE")
    print("=" * 60)
    print(f"  LID records fixed: {lid_fixed}")
    print(f"  Messages inserted: {inserted}")
    print(f"  Messages updated: {updated}")  
    print(f"  Messages skipped: {skipped}")
    print(f"  Contacts synced: {len(contacts_synced)}")
    print("=" * 60)
    
    conn.close()

if __name__ == "__main__":
    main()
