#!/bin/bash

INSTANCE="3ED40028A79321A51CE376A164AA5E9E"
TOKEN="636347DC24AEBB3F31F4E04C"
CLIENT_TOKEN="F9992ada0ed6b49a395fc8eb96ee9af70S"
PHONE="5511940716662"

echo "==============================================="
echo "INICIANDO DIAGNÓSTICO Z-API"
echo "==============================================="

# 1. Verificar Status da Instância
echo ""
echo "[TESTE 1] Verificando Status da Instância..."
curl -s -X GET "https://api.z-api.io/instances/$INSTANCE/token/$TOKEN/status" \
  -H "client-token: $CLIENT_TOKEN"
echo ""

# 2. Verificar se o número existe (Validação de conexão real)
echo ""
echo "[TESTE 2] Verificando se o número $PHONE existe no WhatsApp..."
curl -s -X GET "https://api.z-api.io/instances/$INSTANCE/token/$TOKEN/phone-exists/$PHONE" \
  -H "client-token: $CLIENT_TOKEN"
echo ""

# 3. Tentar Envio de Texto Simples
echo ""
echo "[TESTE 3] Tentando enviar mensagem de texto simples..."
curl -s -X POST "https://api.z-api.io/instances/$INSTANCE/token/$TOKEN/send-text" \
  -H "client-token: $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\", \"message\": \"Teste de Diagnostico Pratica - $(date)\"}"
echo ""

echo "==============================================="
echo "FIM DO DIAGNÓSTICO"
echo "==============================================="
