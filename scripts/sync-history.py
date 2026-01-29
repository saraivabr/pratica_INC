#!/usr/bin/env python3
"""
WhatsApp History Sync - Puxa histórico completo da Evolution API pro banco

Uso:
  python3 scripts/sync-history.py                     # Sync padrão (1ª página por chat)
  python3 scripts/sync-history.py --all               # Sync TODAS as mensagens (paginado)
  python3 scripts/sync-history.py --chat 5511999...   # Sync de um chat específico
  python3 scripts/sync-history.py --stats             # Apenas mostra estatísticas
"""

import sys
import json
import time
import argparse
import urllib.request
from datetime import datetime

try:
    import psycopg2
except ImportError:
    print("Instalando psycopg2...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary"])
    import psycopg2

# =============================================================================
# CONFIG
# =============================================================================
EVOLUTION_URL = "http://localhost:8080"
API_KEY = "pratica_evolution_key_2026_secure"
DB_URL = "postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica"
MSGS_PER_PAGE = 50

# =============================================================================
# HELPERS
# =============================================================================
def evo_request(endpoint, method="GET", body=None):
    """Faz request pra Evolution API"""
    url = f"{EVOLUTION_URL}{endpoint}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/json",
        "apikey": API_KEY
    }, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  ❌ Erro API: {e}")
        return None

def extract_text(message):
    """Extrai texto da mensagem WhatsApp"""
    if not message:
        return None
    if "conversation" in message:
        return message["conversation"]
    ext = message.get("extendedTextMessage", {})
    if ext.get("text"):
        return ext["text"]
    for key in ["imageMessage", "videoMessage", "documentMessage"]:
        if key in message and message[key].get("caption"):
            return message[key]["caption"]
    return None

def extract_phone(jid):
    """Extrai número do JID"""
    if not jid:
        return ""
    part = jid.split("@")[0]
    dash = part.find("-")
    phone = part[:dash] if dash > 0 else part
    return "".join(c for c in phone if c.isdigit())

# =============================================================================
# MAIN FUNCTIONS
# =============================================================================
def get_active_instance():
    """Busca instância ativa"""
    instances = evo_request("/instance/fetchInstances")
    if not instances:
        print("❌ Não consegui buscar instâncias")
        sys.exit(1)
    
    for inst in instances:
        if inst.get("connectionStatus") == "open":
            name = inst["name"]
            count = inst.get("_count", {})
            print(f"✅ Instância: {name}")
            print(f"   Messages: {count.get('Message', 0)} | Contacts: {count.get('Contact', 0)} | Chats: {count.get('Chat', 0)}")
            return name
    
    print("❌ Nenhuma instância conectada!")
    sys.exit(1)

def show_stats(instance):
    """Mostra estatísticas"""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM whatsapp_messages")
    msgs = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM whatsapp_synced_chats")
    chats = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM whatsapp_synced_contacts")
    contacts = cur.fetchone()[0]
    
    print(f"\n📊 Banco de dados:")
    print(f"   Mensagens: {msgs}")
    print(f"   Chats: {chats}")
    print(f"   Contatos: {contacts}")
    
    cur.close()
    conn.close()

def sync_chats(instance):
    """Sincroniza chats"""
    print("\n📂 Sincronizando chats...")
    
    chats = evo_request(f"/chat/findChats/{instance}", method="POST", body={})
    if not chats:
        print("  ❌ Erro ao buscar chats")
        return []
    
    print(f"  Encontrados {len(chats)} chats")
    
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Buscar tenant_id
    cur.execute("SELECT id FROM tenants LIMIT 1")
    row = cur.fetchone()
    tenant_id = row[0] if row else 1
    
    # Buscar workspace_id
    cur.execute("SELECT id FROM workspaces LIMIT 1")
    row = cur.fetchone()
    workspace_id = row[0] if row else 1
    
    synced = 0
    for chat in chats:
        try:
            jid = chat.get("remoteJid", "")
            if not jid:
                continue
            
            phone = extract_phone(jid)
            is_group = "@g.us" in jid
            name = chat.get("name") or chat.get("pushName") or ""
            
            last_msg = chat.get("lastMessage", {}) or {}
            last_text = None
            if last_msg.get("message"):
                last_text = extract_text(last_msg["message"])
            
            last_from_me = (last_msg.get("key") or {}).get("fromMe", False)
            last_ts = None
            ts_val = last_msg.get("messageTimestamp")
            if ts_val and isinstance(ts_val, (int, float)):
                last_ts = datetime.fromtimestamp(ts_val).isoformat()
            
            unread = chat.get("unreadCount", 0) or 0
            
            cur.execute("""
                INSERT INTO whatsapp_synced_chats (tenant_id, remote_jid, phone_number, contact_name, is_group,
                    last_message_at, last_message_text, last_message_from_me, unread_count, synced_at, workspace_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
                ON CONFLICT (tenant_id, remote_jid) DO UPDATE SET
                    phone_number = EXCLUDED.phone_number,
                    contact_name = EXCLUDED.contact_name,
                    is_group = EXCLUDED.is_group,
                    last_message_at = EXCLUDED.last_message_at,
                    last_message_text = EXCLUDED.last_message_text,
                    last_message_from_me = EXCLUDED.last_message_from_me,
                    unread_count = EXCLUDED.unread_count,
                    synced_at = NOW()
            """, (tenant_id, jid, phone, name, is_group, last_ts, last_text, last_from_me, unread, workspace_id))
            synced += 1
        except Exception as e:
            print(f"  ⚠ Erro chat {chat.get('remoteJid','?')}: {e}")
            conn.rollback()
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"  ✅ {synced} chats sincronizados")
    return chats

def sync_contacts(instance):
    """Sincroniza contatos"""
    print("\n👤 Sincronizando contatos...")
    
    contacts = evo_request(f"/chat/findContacts/{instance}", method="POST", body={})
    if not contacts:
        print("  ❌ Erro ao buscar contatos")
        return
    
    print(f"  Encontrados {len(contacts)} contatos")
    
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM tenants LIMIT 1")
    tenant_id = (cur.fetchone() or [1])[0]
    
    synced = 0
    for contact in contacts:
        try:
            jid = contact.get("remoteJid", "")
            if not jid or "@g.us" in jid:
                continue
            
            phone = extract_phone(jid)
            push_name = contact.get("pushName") or ""
            profile_pic = contact.get("profilePictureUrl") or ""
            is_business = contact.get("isBusiness", False)
            
            cur.execute("""
                INSERT INTO whatsapp_synced_contacts (tenant_id, remote_jid, phone_number, push_name,
                    profile_picture_url, is_business, synced_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (tenant_id, remote_jid) DO UPDATE SET
                    phone_number = EXCLUDED.phone_number,
                    push_name = EXCLUDED.push_name,
                    profile_picture_url = EXCLUDED.profile_picture_url,
                    is_business = EXCLUDED.is_business,
                    synced_at = NOW()
            """, (tenant_id, jid, phone, push_name, profile_pic, is_business))
            synced += 1
        except Exception as e:
            print(f"  ⚠ Erro contato: {e}")
            conn.rollback()
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"  ✅ {synced} contatos sincronizados")

def sync_messages(instance, target_chat=None, sync_all=False):
    """Sincroniza mensagens com paginação"""
    print("\n💬 Sincronizando mensagens...")
    
    # Buscar chats
    chats = evo_request(f"/chat/findChats/{instance}", method="POST", body={})
    if not chats:
        print("  ❌ Erro ao buscar chats")
        return
    
    # Filtrar chats individuais (não grupos)
    individual = [c for c in chats if "@g.us" not in c.get("remoteJid", "")]
    
    if target_chat:
        individual = [c for c in chats if target_chat in c.get("remoteJid", "")]
    
    print(f"  Processando {len(individual)} chats...")
    
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM tenants LIMIT 1")
    tenant_id = (cur.fetchone() or [1])[0]
    
    total_synced = 0
    total_chats = 0
    
    for i, chat in enumerate(individual):
        jid = chat.get("remoteJid", "")
        name = chat.get("name") or chat.get("pushName") or extract_phone(jid)
        phone = extract_phone(jid)
        
        page = 1
        chat_synced = 0
        chat_total = 0
        
        while True:
            result = evo_request(f"/chat/findMessages/{instance}", method="POST", body={
                "where": {"key": {"remoteJid": jid}},
                "limit": MSGS_PER_PAGE,
                "page": page
            })
            
            if not result or "messages" not in result:
                break
            
            msgs_data = result["messages"]
            records = msgs_data.get("records", [])
            total_pages = msgs_data.get("pages", 1)
            chat_total = msgs_data.get("total", 0)
            
            for msg in records:
                try:
                    key = msg.get("key", {})
                    msg_id = key.get("id", "")
                    if not msg_id:
                        continue
                    
                    is_from_me = key.get("fromMe", False)
                    message_obj = msg.get("message", {})
                    message_text = extract_text(message_obj)
                    message_type = msg.get("messageType", "unknown")
                    
                    ts = msg.get("messageTimestamp")
                    if isinstance(ts, (int, float)):
                        timestamp = datetime.fromtimestamp(ts).isoformat()
                    else:
                        timestamp = datetime.now().isoformat()
                    
                    contact_name = msg.get("pushName") or name
                    
                    cur.execute("""
                        INSERT INTO whatsapp_messages (tenant_id, instance_name, phone_number, message_id,
                            message_type, message_text, is_from_me, timestamp, contact_name, status, raw_data,
                            created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'synced', %s, NOW(), NOW())
                        ON CONFLICT (instance_name, message_id) DO NOTHING
                    """, (tenant_id, instance, phone, msg_id, message_type, message_text,
                          is_from_me, timestamp, contact_name, json.dumps(msg)))
                    
                    if cur.rowcount > 0:
                        chat_synced += 1
                        total_synced += 1
                except Exception as e:
                    conn.rollback()
            
            conn.commit()
            
            # Próxima página?
            if sync_all and page < total_pages:
                page += 1
                time.sleep(0.1)
            else:
                break
        
        total_chats += 1
        pages_info = f" ({page}p)" if page > 1 else ""
        print(f"  [{i+1}/{len(individual)}] {name[:25]:25s} | {chat_total:4d} msgs | +{chat_synced} novas{pages_info}")
        time.sleep(0.05)
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"\n  ✅ {total_synced} mensagens novas de {total_chats} chats")

# =============================================================================
# ENTRY POINT
# =============================================================================
def main():
    parser = argparse.ArgumentParser(description="WhatsApp History Sync")
    parser.add_argument("--stats", action="store_true", help="Apenas mostra estatísticas")
    parser.add_argument("--all", action="store_true", help="Sync TODAS as páginas de mensagens")
    parser.add_argument("--chat", type=str, help="Sync apenas um chat específico (número)")
    args = parser.parse_args()
    
    print("═" * 45)
    print("  WhatsApp History Sync")
    print("═" * 45)
    
    instance = get_active_instance()
    
    if args.stats:
        show_stats(instance)
    else:
        sync_chats(instance)
        sync_contacts(instance)
        sync_messages(instance, target_chat=args.chat, sync_all=args.all)
        show_stats(instance)
    
    print("\n" + "═" * 45)
    print("  ✅ Sync finalizado!")
    print("═" * 45)

if __name__ == "__main__":
    main()
