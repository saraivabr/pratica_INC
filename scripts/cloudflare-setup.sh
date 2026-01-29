#!/bin/bash
set -e

# Cloudflare Configuration Script
# Configura DNS para corretorparceria.com.br

echo "🌐 Configurando Cloudflare DNS..."
echo "=================================="

CF_EMAIL="fellipesaraivabarbosa@gmail.com"
CF_API_KEY="c81188d3999224b21b3f5a8532b6f9b17ce05"
DOMAIN="corretorparceria.com.br"
VPS_IP="185.182.184.122"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "${YELLOW}Passo 1: Obter Zone ID do domínio${NC}"
echo "=================================="

ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_API_KEY}" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo $ZONE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ZONE_ID" ]; then
  echo "${RED}❌ Erro: Não foi possível obter Zone ID${NC}"
  echo "${YELLOW}O domínio precisa estar adicionado ao Cloudflare primeiro!${NC}"
  echo ""
  echo "Passos manuais:"
  echo "  1. Acesse: https://dash.cloudflare.com/"
  echo "  2. Clique em 'Add a Site'"
  echo "  3. Digite: ${DOMAIN}"
  echo "  4. Escolha o plano Free"
  echo "  5. Siga as instruções para atualizar os nameservers"
  echo ""
  echo "Depois rode este script novamente."
  exit 1
fi

echo "${GREEN}✅ Zone ID encontrado: ${ZONE_ID}${NC}"

echo ""
echo "${YELLOW}Passo 2: Criando/Atualizando registros DNS${NC}"
echo "=================================="

# Função para criar/atualizar registro DNS
update_dns_record() {
  local TYPE=$1
  local NAME=$2
  local CONTENT=$3
  local PROXIED=$4
  
  echo "📝 Configurando: ${TYPE} ${NAME} -> ${CONTENT}"
  
  # Verificar se o registro já existe
  EXISTING=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=${TYPE}&name=${NAME}" \
    -H "X-Auth-Email: ${CF_EMAIL}" \
    -H "X-Auth-Key: ${CF_API_KEY}" \
    -H "Content-Type: application/json")
  
  RECORD_ID=$(echo $EXISTING | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ ! -z "$RECORD_ID" ]; then
    # Atualizar registro existente
    echo "  ↻ Atualizando registro existente..."
    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
      -H "X-Auth-Email: ${CF_EMAIL}" \
      -H "X-Auth-Key: ${CF_API_KEY}" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"${TYPE}\",\"name\":\"${NAME}\",\"content\":\"${CONTENT}\",\"ttl\":1,\"proxied\":${PROXIED}}" > /dev/null
    echo "  ${GREEN}✅ Atualizado${NC}"
  else
    # Criar novo registro
    echo "  + Criando novo registro..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
      -H "X-Auth-Email: ${CF_EMAIL}" \
      -H "X-Auth-Key: ${CF_API_KEY}" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"${TYPE}\",\"name\":\"${NAME}\",\"content\":\"${CONTENT}\",\"ttl\":1,\"proxied\":${PROXIED}}" > /dev/null
    echo "  ${GREEN}✅ Criado${NC}"
  fi
}

# Criar registros DNS
update_dns_record "A" "${DOMAIN}" "${VPS_IP}" "true"
update_dns_record "A" "www.${DOMAIN}" "${VPS_IP}" "true"

echo ""
echo "${YELLOW}Passo 3: Configurar SSL/TLS${NC}"
echo "=================================="

curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/ssl" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"flexible"}' > /dev/null

echo "${GREEN}✅ SSL configurado (modo Flexible)${NC}"

echo ""
echo "${YELLOW}Passo 4: Ativar Always Use HTTPS${NC}"
echo "=================================="

curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/always_use_https" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}' > /dev/null

echo "${GREEN}✅ Always Use HTTPS ativado${NC}"

echo ""
echo "${GREEN}✅✅✅ CLOUDFLARE CONFIGURADO! ✅✅✅${NC}"
echo ""
echo "📋 DNS Records criados:"
echo "  ✓ A @ -> ${VPS_IP} (Proxied)"
echo "  ✓ A www -> ${VPS_IP} (Proxied)"
echo ""
echo "⚡ Configurações aplicadas:"
echo "  ✓ SSL: Flexible"
echo "  ✓ Always Use HTTPS: ON"
echo ""
echo "⏱️  A propagação DNS pode levar de 5 minutos até 24 horas"
echo ""
echo "🔍 Verifique em:"
echo "  • https://dnschecker.org/"
echo "  • https://dash.cloudflare.com/"
echo ""
echo "🌐 Acesse: https://${DOMAIN}"
