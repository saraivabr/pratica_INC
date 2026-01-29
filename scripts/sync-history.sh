#!/bin/bash
# =============================================================================
# Sync WhatsApp History - Puxa histórico completo da Evolution API
# 
# Uso:
#   ./scripts/sync-history.sh                    # Sync padrão (últimas 100 msgs por chat)
#   ./scripts/sync-history.sh --all              # Sync TODAS as mensagens (paginado)
#   ./scripts/sync-history.sh --chat 5511999...  # Sync de um chat específico
#   ./scripts/sync-history.sh --stats            # Apenas mostra estatísticas
# =============================================================================

set -euo pipefail

# Carregar variáveis de ambiente
if [ -f /var/www/pratica/.env.local ]; then
  export $(grep -v '^#' /var/www/pratica/.env.local | xargs)
fi

EVOLUTION_URL="${EVOLUTION_BASE_URL:-http://localhost:8080}"
API_KEY="${EVOLUTION_API_KEY:-pratica_evolution_key_2026_secure}"
DB_URL="${DATABASE_URL:-postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica}"
LIMIT_PER_PAGE=50

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[SYNC]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# =============================================================================
# Buscar instância ativa
# =============================================================================
get_instance() {
  local result=$(curl -s "${EVOLUTION_URL}/instance/fetchInstances" \
    -H "apikey: ${API_KEY}")
  
  local name=$(echo "$result" | python3 -c "
import sys,json
data=json.load(sys.stdin)
for i in data:
    if i.get('connectionStatus') == 'open':
        print(i['name'])
        break
" 2>/dev/null)
  
  if [ -z "$name" ]; then
    error "Nenhuma instância WhatsApp conectada!"
    exit 1
  fi
  
  echo "$name"
}

# =============================================================================
# Mostrar estatísticas
# =============================================================================
show_stats() {
  local instance=$1
  
  info "Instância: $instance"
  
  # Stats da Evolution
  local evo_stats=$(curl -s "${EVOLUTION_URL}/instance/fetchInstances" \
    -H "apikey: ${API_KEY}" | python3 -c "
import sys,json
data=json.load(sys.stdin)
for i in data:
    if i['name'] == '${instance}':
        c = i.get('_count',{})
        print(f'Messages: {c.get(\"Message\",0)} | Contacts: {c.get(\"Contact\",0)} | Chats: {c.get(\"Chat\",0)}')
        break
")
  info "Evolution API: $evo_stats"
  
  # Stats do banco
  local db_msgs=$(PGPASSWORD='pratica_secure_2026!' psql -h localhost -U pratica -d pratica -t -c \
    "SELECT COUNT(*) FROM whatsapp_messages" 2>/dev/null | tr -d ' ')
  local db_chats=$(PGPASSWORD='pratica_secure_2026!' psql -h localhost -U pratica -d pratica -t -c \
    "SELECT COUNT(*) FROM whatsapp_synced_chats" 2>/dev/null | tr -d ' ')
  local db_contacts=$(PGPASSWORD='pratica_secure_2026!' psql -h localhost -U pratica -d pratica -t -c \
    "SELECT COUNT(*) FROM whatsapp_synced_contacts" 2>/dev/null | tr -d ' ')
  
  info "Banco de dados: Messages: ${db_msgs:-0} | Chats: ${db_chats:-0} | Contacts: ${db_contacts:-0}"
}

# =============================================================================
# Buscar e salvar chats
# =============================================================================
sync_chats() {
  local instance=$1
  log "Sincronizando chats..."
  
  local chats=$(curl -s -X POST "${EVOLUTION_URL}/chat/findChats/${instance}" \
    -H "apikey: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}')
  
  local count=$(echo "$chats" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  log "Encontrados $count chats"
  
  # Salvar no banco via Python
  echo "$chats" | python3 -c "
import sys, json, psycopg2
from datetime import datetime

data = json.load(sys.stdin)
conn = psycopg2.connect('${DB_URL}')
cur = conn.cursor()

# Buscar tenant_id e workspace_id
cur.execute('SELECT id FROM tenants LIMIT 1')
row = cur.fetchone()
tenant_id = row[0] if row else 1

cur.execute('SELECT id FROM workspaces LIMIT 1')
row = cur.fetchone()
workspace_id = row[0] if row else 1

synced = 0
for chat in data:
    try:
        jid = chat.get('remoteJid', '')
        if not jid:
            continue
        
        phone = jid.split('@')[0].split('-')[0]
        is_group = '@g.us' in jid
        name = chat.get('name') or chat.get('pushName') or ''
        
        # Última mensagem
        last_msg = chat.get('lastMessage', {})
        last_msg_text = None
        if last_msg and last_msg.get('message'):
            msg = last_msg['message']
            last_msg_text = msg.get('conversation') or (msg.get('extendedTextMessage') or {}).get('text')
        
        last_from_me = (last_msg.get('key') or {}).get('fromMe', False) if last_msg else False
        last_ts = None
        if last_msg and last_msg.get('messageTimestamp'):
            ts = last_msg['messageTimestamp']
            if isinstance(ts, (int, float)):
                last_ts = datetime.fromtimestamp(ts).isoformat()
        
        unread = chat.get('unreadCount', 0)
        
        cur.execute('''
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
        ''', (tenant_id, jid, phone, name, is_group, last_ts, last_msg_text, last_from_me, unread, workspace_id))
        synced += 1
    except Exception as e:
        print(f'  Erro chat {jid}: {e}', file=sys.stderr)

conn.commit()
cur.close()
conn.close()
print(f'{synced} chats sincronizados')
" 2>&1
}

# =============================================================================
# Buscar e salvar contatos
# =============================================================================
sync_contacts() {
  local instance=$1
  log "Sincronizando contatos..."
  
  local contacts=$(curl -s -X POST "${EVOLUTION_URL}/chat/findContacts/${instance}" \
    -H "apikey: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}')
  
  local count=$(echo "$contacts" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  log "Encontrados $count contatos"
  
  echo "$contacts" | python3 -c "
import sys, json, psycopg2

data = json.load(sys.stdin)
conn = psycopg2.connect('${DB_URL}')
cur = conn.cursor()

cur.execute('SELECT id FROM workspaces LIMIT 1')
row = cur.fetchone()
workspace_id = row[0] if row else 1

synced = 0
for contact in data:
    try:
        jid = contact.get('remoteJid', '')
        if not jid or '@g.us' in jid:
            continue
        
        phone = jid.split('@')[0].split('-')[0]
        push_name = contact.get('pushName') or ''
        profile_pic = contact.get('profilePictureUrl') or ''
        is_business = contact.get('isBusiness', False)
        
        cur.execute('''
            INSERT INTO whatsapp_synced_contacts (workspace_id, remote_jid, phone_number, push_name, 
                profile_picture_url, is_business, synced_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (workspace_id, remote_jid) DO UPDATE SET
                phone_number = EXCLUDED.phone_number,
                push_name = EXCLUDED.push_name,
                profile_picture_url = EXCLUDED.profile_picture_url,
                is_business = EXCLUDED.is_business,
                synced_at = NOW()
        ''', (workspace_id, jid, phone, push_name, profile_pic, is_business))
        synced += 1
    except Exception as e:
        print(f'  Erro contato {jid}: {e}', file=sys.stderr)

conn.commit()
cur.close()
conn.close()
print(f'{synced} contatos sincronizados')
" 2>&1
}

# =============================================================================
# Buscar e salvar mensagens (com paginação completa)
# =============================================================================
sync_messages() {
  local instance=$1
  local target_chat="${2:-}"
  local sync_all="${3:-false}"
  
  log "Sincronizando mensagens..."
  
  # Buscar chats
  local chats_json=$(curl -s -X POST "${EVOLUTION_URL}/chat/findChats/${instance}" \
    -H "apikey: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}')
  
  # Processar mensagens via Python (paginação completa)
  python3 -c "
import sys, json, psycopg2, urllib.request, time

EVOLUTION_URL = '${EVOLUTION_URL}'
API_KEY = '${API_KEY}'
INSTANCE = '${instance}'
TARGET_CHAT = '${target_chat}'
SYNC_ALL = ${sync_all} == 'true' if '${sync_all}' else False
LIMIT = ${LIMIT_PER_PAGE}

chats = json.loads('''$(echo "$chats_json")''')

conn = psycopg2.connect('${DB_URL}')
cur = conn.cursor()

# Buscar tenant e workspace
cur.execute('SELECT id FROM tenants LIMIT 1')
tenant_id = (cur.fetchone() or [1])[0]
cur.execute('SELECT id FROM workspaces LIMIT 1')  
workspace_id = (cur.fetchone() or [1])[0]

def fetch_messages(remote_jid, page=1, limit=50):
    url = f'{EVOLUTION_URL}/chat/findMessages/{INSTANCE}'
    payload = json.dumps({
        'where': {'key': {'remoteJid': remote_jid}},
        'limit': limit,
        'page': page
    }).encode()
    req = urllib.request.Request(url, data=payload, headers={
        'Content-Type': 'application/json',
        'apikey': API_KEY
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f'  Erro fetch: {e}', file=sys.stderr)
        return None

def extract_text(message):
    if not message:
        return None
    if 'conversation' in message:
        return message['conversation']
    ext = message.get('extendedTextMessage', {})
    if ext.get('text'):
        return ext['text']
    for key in ['imageMessage', 'videoMessage', 'documentMessage']:
        if key in message and message[key].get('caption'):
            return message[key]['caption']
    return None

total_synced = 0
total_chats = 0
individual_chats = [c for c in chats if '@g.us' not in c.get('remoteJid', '')]

if TARGET_CHAT:
    individual_chats = [c for c in chats if TARGET_CHAT in c.get('remoteJid', '')]

print(f'Processando {len(individual_chats)} chats...')

for chat in individual_chats:
    jid = chat.get('remoteJid', '')
    name = chat.get('name') or chat.get('pushName') or jid.split('@')[0]
    phone = jid.split('@')[0].split('-')[0]
    
    page = 1
    chat_synced = 0
    
    while True:
        result = fetch_messages(jid, page, LIMIT)
        if not result or 'messages' not in result:
            break
        
        msgs_data = result['messages']
        records = msgs_data.get('records', [])
        total_pages = msgs_data.get('pages', 1)
        total_msgs = msgs_data.get('total', 0)
        
        if page == 1:
            sys.stdout.write(f'  [{total_chats+1}/{len(individual_chats)}] {name} ({phone}) - {total_msgs} msgs')
            sys.stdout.flush()
        
        for msg in records:
            try:
                key = msg.get('key', {})
                msg_id = key.get('id', '')
                if not msg_id:
                    continue
                
                is_from_me = key.get('fromMe', False)
                message_obj = msg.get('message', {})
                message_text = extract_text(message_obj)
                message_type = msg.get('messageType', 'unknown')
                
                ts = msg.get('messageTimestamp')
                if isinstance(ts, (int, float)):
                    from datetime import datetime
                    timestamp = datetime.fromtimestamp(ts).isoformat()
                else:
                    timestamp = ts or datetime.now().isoformat()
                
                contact_name = msg.get('pushName') or name
                
                cur.execute('''
                    INSERT INTO whatsapp_messages (tenant_id, instance_name, phone_number, message_id,
                        message_type, message_text, is_from_me, timestamp, contact_name, status, raw_data, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'synced', %s, NOW(), NOW())
                    ON CONFLICT (instance_name, message_id) DO NOTHING
                ''', (tenant_id, INSTANCE, phone, msg_id, message_type, message_text, 
                      is_from_me, timestamp, contact_name, json.dumps(msg)))
                
                if cur.rowcount > 0:
                    chat_synced += 1
                    total_synced += 1
            except Exception as e:
                pass  # Skip individual message errors silently
        
        conn.commit()
        
        # Próxima página se sync_all
        if SYNC_ALL and page < total_pages:
            page += 1
            time.sleep(0.1)  # Rate limit
        else:
            break
    
    if page == 1:
        print(f' → +{chat_synced} novas')
    else:
        print(f' ({page} páginas) → +{chat_synced} novas')
    
    total_chats += 1
    time.sleep(0.05)

conn.commit()
cur.close()
conn.close()

print(f'\\n✅ Concluído: {total_synced} mensagens novas de {total_chats} chats')
" 2>&1
}

# =============================================================================
# MAIN
# =============================================================================

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  WhatsApp History Sync${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"

INSTANCE=$(get_instance)
log "Instância ativa: $INSTANCE"

case "${1:-}" in
  --stats)
    show_stats "$INSTANCE"
    ;;
  --chat)
    if [ -z "${2:-}" ]; then
      error "Uso: $0 --chat <número>"
      exit 1
    fi
    sync_messages "$INSTANCE" "$2" "true"
    ;;
  --all)
    sync_chats "$INSTANCE"
    sync_contacts "$INSTANCE"
    sync_messages "$INSTANCE" "" "true"
    show_stats "$INSTANCE"
    ;;
  *)
    sync_chats "$INSTANCE"
    sync_contacts "$INSTANCE"
    sync_messages "$INSTANCE" "" "false"
    show_stats "$INSTANCE"
    ;;
esac

echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Sync finalizado!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
