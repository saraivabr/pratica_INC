#!/bin/bash

INSTANCE="corretor-26eb9297-5254-4dae-b459-42889b822cb3-1769629087195"
APIKEY="pratica_evolution_key_2026_secure"
BASE_URL="https://evoapi.corretorparceria.com.br"

echo "🔄 Monitorando conexão WhatsApp..."
echo "Instância: $INSTANCE"
echo ""

for i in {1..20}; do
  sleep 5

  # Buscar status
  STATE=$(curl -s -H "apikey: $APIKEY" "$BASE_URL/instance/connectionState/$INSTANCE" | jq -r '.instance.state // "unknown"')

  # Buscar QR Code
  QR_RESPONSE=$(curl -s -H "apikey: $APIKEY" "$BASE_URL/instance/qrcode/$INSTANCE?number=5511999999999")
  QR_BASE64=$(echo "$QR_RESPONSE" | jq -r '.qrcode.base64 // empty' 2>/dev/null)
  PAIRING=$(echo "$QR_RESPONSE" | jq -r '.pairingCode // empty' 2>/dev/null)

  echo "[$i/20] Estado: $STATE"

  # Se conectado
  if [ "$STATE" == "open" ]; then
    echo ""
    echo "✅ CONECTADO COM SUCESSO!"

    # Buscar info da conexão
    INFO=$(curl -s -H "apikey: $APIKEY" "$BASE_URL/instance/fetchInstances?instanceName=$INSTANCE")
    PHONE=$(echo "$INFO" | jq -r '.[0].ownerJid // "N/A"')
    NAME=$(echo "$INFO" | jq -r '.[0].profileName // "N/A"')

    echo "📱 Telefone: $PHONE"
    echo "👤 Nome: $NAME"
    echo ""
    exit 0
  fi

  # Se tem QR Code
  if [ ! -z "$QR_BASE64" ] && [ "$QR_BASE64" != "null" ]; then
    echo ""
    echo "✅ QR CODE DISPONÍVEL!"
    echo ""
    echo "Acesse este link para ver o QR Code:"
    echo "$QR_BASE64" | head -c 100
    echo "..."
    echo ""
    echo "Ou use o comando abaixo para salvar como imagem:"
    echo "echo '$QR_BASE64' | sed 's/data:image\/png;base64,//' | base64 -d > qrcode.png"
    echo ""
    echo "Aguardando escaneamento..."
  fi

  # Se tem Pairing Code
  if [ ! -z "$PAIRING" ] && [ "$PAIRING" != "null" ]; then
    echo ""
    echo "✅ PAIRING CODE: $PAIRING"
    echo ""
    echo "Digite este código no WhatsApp:"
    echo "WhatsApp > Menu > Dispositivos conectados > Conectar dispositivo > Conectar com código"
    echo ""
    echo "Aguardando conexão..."
  fi
done

echo ""
echo "⏱️ Timeout - Conexão não completada em 100 segundos"
echo "Estado final: $STATE"
