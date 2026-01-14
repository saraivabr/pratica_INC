curl -X POST https://pratica-bot-server-saraiva.netlify.app/webhook \
-H "Content-Type: application/json" \
-d '{
  "event": "messages.upsert",
  "instance": "pratica",
  "data": {
    "key": {
      "remoteJid": "551199999999@s.whatsapp.net",
      "fromMe": false,
      "id": "TEST_WEBHOOK_123"
    },
    "pushName": "Curl Test User",
    "message": {
      "conversation": "Olá, teste de webhook em produção"
    }
  }
}' -v
