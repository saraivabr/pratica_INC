# 🚀 GUIA DE INTEGRAÇÃO TÉCNICA - SDR WHATSAPP
## Baileys | WhatsmeOW | Go | Facebook Ads → Automação WhatsApp

---

## 📋 VISÃO GERAL DAS 3 OPÇÕES

### Comparativo Rápido

| Aspecto | **Baileys** | **WhatsmeOW** | **Go** |
|---------|-----------|--------------|-------|
| **Linguagem** | Node.js | PHP/Python | Go (Golang) |
| **Complexidade** | 🟡 Média | 🟢 Baixa | 🔴 Alta |
| **Documentação** | 🔴 Ruim | 🟡 OK | 🟢 Boa |
| **Performance** | 🟡 OK | 🟡 OK | 🟢 Excelente |
| **Setup** | 20-30 min | 10-15 min | 45-60 min |
| **Custo Hospedagem** | Médio | Baixo | Médio |
| **Suporte Oficial** | ⚠️ Comunidade | ⚠️ Comunidade | ✅ Oficial |
| **Escalabilidade** | 🟡 OK | 🟡 OK | 🟢 Excelente |
| **Best For SDR** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## ✅ RECOMENDAÇÃO PARA SEU CASO (SDR + Facebook Ads)

### **🏆 1º LUGAR: WhatsmeOW** (RECOMENDADO)
- Setup rápido (15 min)
- Documentação clara
- Ótimo para automação SDR
- Hospedagem barata
- Comunidade ativa

### **🥈 2º LUGAR: Baileys**
- Mais flexível
- Comunidade grande
- Requer conhecimento Node.js
- Melhor para customizações complexas

### **🥉 3º LUGAR: Go**
- Mais robusto
- Melhor performance
- Requer conhecimento Golang
- Overkill para operação SDR pequena

---

## 🎯 ARQUITETURA GERAL (TODOS OS 3)

```
Facebook Ads (Lead capturo)
    ↓
Lead Form (Nome, Tel, Email, Interesse)
    ↓
Webhook/API (envia dados)
    ↓
Seu Servidor (Baileys/WhatsmeOW/Go)
    ↓
WhatsApp Bot (responde automaticamente)
    ↓
CRM/Database (armazena leads)
    ↓
SDR Humano (takeover em <5min)
    ↓
Atendimento + Qualificação (BANT)
    ↓
Agendamento de Visita
```

---

# OPÇÃO 1️⃣: WHATSMEOW (RECOMENDADO PARA SDR)

## Por que WhatsmeOW para SDR?

✅ Setup mais rápido (você já quer começar logo)
✅ Documentação melhor
✅ Custos menores
✅ Comunidade ativa brasileira
✅ Perfeito para automação inicial + SDR

---

## 🔧 INSTALAÇÃO WHATSMEOW

### Pré-Requisitos
- Node.js 18+ instalado
- npm ou yarn
- Servidor/VPS (DigitalOcean, AWS, Heroku)
- Banco de dados (MySQL ou MongoDB)
- Token de API do Facebook (para webhooks)

### Passo 1: Instalação Básica

```bash
# Criar pasta do projeto
mkdir whatsapp-sdr-pratica
cd whatsapp-sdr-pratica

# Inicializar Node
npm init -y

# Instalar WhatsmeOW
npm install @whiskeysockets/baileys qrcode-terminal dotenv cors express axios

# Criar estrutura
mkdir src models routes config database
```

### Passo 2: Arquivo .env (Configurações)

```env
# .env
PORT=3000
MONGODB_URI=mongodb://usuario:senha@localhost:27017/sdr_pratica
FACEBOOK_TOKEN=seu_token_facebook_aqui
FACEBOOK_WEBHOOK_VERIFY=seu_token_verificacao_aqui

# Empreendimentos (para respostas automáticas)
AURA_PRICE=389000
COLATINNA_PRICE=339000
GIARDINO_PRICE=563000
ALTA_FLORESTA_PRICE=2113150

# Horários de Funcionamento
SDR_WORKING_HOURS_START=08
SDR_WORKING_HOURS_END=18
```

### Passo 3: Arquivo Principal (server.js)

```javascript
// src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar rotas
const whatsappRoutes = require('./routes/whatsapp');
const facebookRoutes = require('./routes/facebook');
const crmRoutes = require('./routes/crm');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/crm', crmRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;
```

### Passo 4: Módulo WhatsApp (Core)

```javascript
// src/modules/whatsapp.js
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode-terminal');
const Lead = require('../models/Lead');
const Message = require('../models/Message');

class WhatsAppManager {
  constructor() {
    this.sock = null;
    this.isReady = false;
  }

  async initialize() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      logger: require('pino')({ level: 'silent' })
    });

    // QR Code para scannear
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('📱 QR Code gerado. Escaneie com WhatsApp Business:');
        QRCode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        this.isReady = true;
        console.log('✅ WhatsApp conectado com sucesso!');
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        if (shouldReconnect) {
          this.initialize();
        }
      }
    });

    // Salvar credenciais
    this.sock.ev.on('creds.update', saveCreds);

    // Mensagens recebidas
    this.sock.ev.on('messages.upsert', async (m) => {
      await this.handleIncomingMessage(m);
    });

    return this.sock;
  }

  async handleIncomingMessage(m) {
    const message = m.messages[0];
    
    if (!message.message || message.key.fromMe) return;

    const sender = message.key.remoteJid;
    const text = message.message.conversation || message.message.extendedTextMessage?.text;

    console.log(`📨 Mensagem de ${sender}: ${text}`);

    // Salvar em banco de dados
    await Message.create({
      phone: sender,
      text: text,
      direction: 'inbound',
      timestamp: new Date()
    });

    // Processar conforme contexto
    await this.processMessage(sender, text);
  }

  async processMessage(sender, text) {
    // Verificar se é resposta do lead ou do SDR
    const lead = await Lead.findOne({ phone: sender });

    if (!lead) {
      // Novo lead recebido
      await this.handleNewLead(sender, text);
    } else {
      // Lead existente respondendo ao SDR
      await this.handleLeadResponse(sender, lead, text);
    }
  }

  async handleNewLead(sender, text) {
    // Resposta automática inicial
    const welcomeMessage = `Oi! 👋\n\nBem-vindo à Prática Construtora!\n\nVi que você se interessou por um dos nossos empreendimentos.\n\n[SDR humano está sendo notificado agora...]`;

    await this.sendMessage(sender, welcomeMessage);

    // Notificar SDR
    await this.notifySDR(sender, text);
  }

  async handleLeadResponse(sender, lead, text) {
    // Lead está respondendo - marcar como "engajado"
    lead.lastMessageAt = new Date();
    lead.status = 'engaged';
    await lead.save();

    // SDR será notificado via CRM
  }

  async sendMessage(phone, text) {
    if (!this.isReady) {
      console.error('❌ WhatsApp não está pronto');
      return;
    }

    try {
      const jid = phone.includes('@whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
      
      await this.sock.sendMessage(jid, {
        text: text
      });

      // Salvar mensagem enviada
      await Message.create({
        phone: phone,
        text: text,
        direction: 'outbound',
        timestamp: new Date()
      });

      console.log(`✅ Mensagem enviada para ${phone}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem: ${error.message}`);
    }
  }

  async sendMediaMessage(phone, mediaUrl, caption) {
    if (!this.isReady) return;

    try {
      const jid = phone.includes('@whatsapp.net') ? phone : `${phone}@s.whatsapp.net`;
      
      const media = await require('axios').get(mediaUrl, { responseType: 'arraybuffer' });
      
      await this.sock.sendMessage(jid, {
        image: Buffer.from(media.data),
        caption: caption
      });

      console.log(`✅ Mídia enviada para ${phone}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar mídia: ${error.message}`);
    }
  }

  async notifySDR(phone, initialMessage) {
    // Notificar SDR que tem novo lead
    // (implementar via email/Slack/SMS)
    console.log(`🔔 NOVO LEAD: ${phone} | Mensagem: ${initialMessage}`);
  }

  getSocket() {
    return this.sock;
  }

  isConnected() {
    return this.isReady;
  }
}

module.exports = new WhatsAppManager();
```

### Passo 5: Modelo de Lead (Database)

```javascript
// src/models/Lead.js
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: String,
  phone: {
    type: String,
    unique: true,
    required: true
  },
  email: String,
  interest: String, // Qual empreendimento se interessou
  source: {
    type: String,
    default: 'facebook_ads' // facebook_ads, instagram_ads, organic
  },
  
  // Qualificação BANT
  budget: {
    min: Number,
    max: Number,
    raw: String // "Até R$ 400 mil"
  },
  authority: {
    isSoleDecision: Boolean,
    otherPeople: String
  },
  need: String, // "saindo do aluguel", "investimento", etc
  timeline: String, // "3 meses", "6 meses", "1 ano"
  
  // Status
  status: {
    type: String,
    enum: ['novo', 'contatado', 'engaged', 'qualificado', 'visitando', 'fechado', 'descartado'],
    default: 'novo'
  },
  
  // Rastreamento
  firstContactAt: Date,
  lastMessageAt: Date,
  visitScheduledAt: Date,
  visitRealizedAt: Date,
  
  // Atribuição SDR
  assignedSDR: String,
  notes: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
```

### Passo 6: Webhook Facebook (Receber Leads)

```javascript
// src/routes/facebook.js
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const whatsapp = require('../modules/whatsapp');

// POST /api/facebook/webhook (receber leads do Facebook)
router.post('/webhook', async (req, res) => {
  const { entry } = req.body;

  if (!entry) return res.sendStatus(200);

  entry.forEach(async (e) => {
    e.messaging?.forEach(async (msg) => {
      if (msg.message) {
        const senderId = msg.sender.id;
        const text = msg.message.text;
        const timestamp = msg.timestamp;

        console.log(`📥 Lead do Facebook: ${senderId} | Mensagem: ${text}`);

        // Extrair dados do lead (Facebook Lead Ads)
        // Normalmente vem em msg.message.quick_reply ou campos estruturados
        
        // Criar lead no banco
        const lead = await Lead.create({
          phone: senderId, // Usar ID do Facebook por enquanto
          source: 'facebook_ads',
          firstContactAt: new Date(timestamp)
        });

        // Notificar SDR
        await whatsapp.notifySDR(senderId, text);
      }
    });
  });

  res.sendStatus(200);
});

// GET /api/facebook/webhook (verificação inicial)
router.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (token === process.env.FACEBOOK_WEBHOOK_VERIFY) {
    res.send(challenge);
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;
```

---

# OPÇÃO 2️⃣: BAILEYS

## Por que Baileys?

✅ Mais flexível
✅ Comunidade grande no Brasil
✅ Suporta features avançadas
✅ Melhor para customizações específicas

---

## 🔧 INSTALAÇÃO BAILEYS

### Setup Básico

```bash
npm install baileys qrcode-terminal cors express dotenv

# Criar arquivo principal
cat > baileys.js << 'EOF'
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode-terminal');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      QRCode.generate(qr, { small: true });
    }
    
    if (connection === 'open') {
      console.log('✅ Conectado!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    m.messages.forEach(msg => {
      console.log('📨', msg.message);
    });
  });

  sock.ev.on('creds.update', saveCreds);
}

start();
EOF

# Rodar
node baileys.js
```

---

# OPÇÃO 3️⃣: GO

## Por que Go?

✅ Performance excelente
✅ Documentação oficial
✅ Escalabilidade máxima
✅ Melhor para alta volume

---

## 🔧 INSTALAÇÃO GO

### Setup Básico

```bash
# Instalar Go (se não tiver)
# macOS: brew install go
# Linux: sudo apt-get install golang-go

# Criar projeto
mkdir whatsapp-sdr-go
cd whatsapp-sdr-go

# Inicializar módulo
go mod init whatsapp-sdr

# Instalar dependências
go get github.com/mdp/qrterminal
go get github.com/whatsmeow/whatsmeow

# Criar main.go
cat > main.go << 'EOF'
package main

import (
	"fmt"
	"log"
	_ "github.com/mattn/go-sqlite3"
	"github.com/whatsmeow/whatsmeow"
	waProto "github.com/whatsmeow/proto/waE2E"
	"github.com/mdp/qrterminal"
)

func main() {
	// Criar cliente
	client, err := whatsmeow.NewClient(nil, nil)
	if err != nil {
		log.Fatal(err)
	}

	// Conectar
	qrChan, _ := client.GetQRChannel(context.Background())

	for evt := range qrChan {
		if evt.Event == "code" {
			qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
		} else {
			fmt.Println("Código do QR:", evt.Event)
		}
	}

	// Escutar mensagens
	client.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			fmt.Println("Mensagem recebida:", v.Message.GetConversation())
		}
	})

	log.Println("✅ Cliente conectado e aguardando mensagens...")

	select {}
}
EOF

# Rodar
go run main.go
```

---

# 🔌 INTEGRAÇÃO COM FACEBOOK ADS

## Como Receber Leads do Facebook?

### Opção A: Facebook Lead Ads (Recomendado)

```javascript
// webhook.js - Receber leads em tempo real
const webhook = (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(async (entry) => {
      entry.messaging.forEach(async (msg) => {
        if (msg.message) {
          // Lead recebido
          const leadData = {
            sender_id: msg.sender.id,
            message: msg.message.text,
            timestamp: msg.timestamp
          };

          // Processar com WhatsApp
          await processLead(leadData);
          
          console.log('📨 Lead recebido:', leadData);
        }
      });
    });
    res.status(200).send('EVENT_RECEIVED');
  }
};
```

### Opção B: Zapier/Make.com (Easiest)

```
Facebook Lead Ads
    ↓ (Webhook)
Make.com/Zapier
    ↓ (Mapping)
Seu Servidor
    ↓
WhatsApp Bot
```

**Setup Make.com:**
1. Conectar Facebook Lead Ads
2. Criar webhook para seu servidor
3. Mapear campos: name, phone, email, interest
4. Testar com lead de teste

---

# 📊 FLUXO COMPLETO: FACEBOOK → WHATSAPP → SDR

```
1. LEAD PREENCHEU FORM NO FACEBOOK
   └─ Nome: João Silva
   └─ Telefone: (11) 98765-4321
   └─ Email: joao@email.com
   └─ Interesse: Aura by Pratica

2. WEBHOOK ENVIOU DADOS PARA SEU SERVIDOR
   └─ POST /api/facebook/webhook
   └─ Body: { name, phone, email, interest }

3. BOT ENVIU MENSAGEM NO WHATSAPP
   └─ "Oi, João! Vi que você se interessou no Aura..."
   └─ Automático em <30 segundos

4. SDR RECEBEU NOTIFICAÇÃO
   └─ Email/Slack/SMS
   └─ "NOVO LEAD: João (Aura)"

5. SDR TAKEOVER (Começa aqui!)
   └─ Responde manualmente
   └─ Qualifica com BANT
   └─ Agenda visita

6. LEAD ENTRA NO CRM
   └─ Histórico de mensagens
   └─ Status de qualificação
   └─ Próximas ações
```

---

# 🎯 QUAL ESCOLHER?

## Para sua operação SDR, recomendo:

### ✅ COMEÇO: WhatsmeOW
- Setup rápido (hoje mesmo!)
- Documentação melhor
- Comunidade brasileira
- Custo baixo

### Depois, migrar para:
- **Baileys** se precisar customizações específicas
- **Go** quando volume passar de 10k mensagens/dia

---

# 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Semana 1: Setup Inicial
- [ ] Escolher Baileys/WhatsmeOW/Go
- [ ] Instalar dependências
- [ ] Conectar WhatsApp
- [ ] Testar envio de mensagens
- [ ] Configurar banco de dados

### Semana 2: Integração Facebook
- [ ] Criar webhook para Facebook
- [ ] Testar recebimento de leads
- [ ] Implementar modelo de Lead
- [ ] Salvar leads em banco

### Semana 3: Automação + SDR
- [ ] Automatizar resposta inicial
- [ ] Implementar notificação para SDR
- [ ] Integrar com CRM
- [ ] Testar fluxo completo

### Semana 4: Go Live
- [ ] Fazer testes de carga
- [ ] Configurar monitoramento
- [ ] Documentação final
- [ ] Training da equipe SDR

---

# 🚨 ERROS COMUNS

### ❌ Erro 1: WhatsApp detectando automação
**Solução:** 
- Adicionar delays aleatórios entre mensagens
- Não responder TODAS as mensagens automaticamente
- Deixar SDR humano takeover em <5min

```javascript
// Não faça isso (muito rápido)
setTimeout(() => socket.sendMessage(), 100);

// Faça isso
const delay = Math.random() * 3000 + 1000; // 1-4 segundos
setTimeout(() => socket.sendMessage(), delay);
```

### ❌ Erro 2: Número bloqueado
**Solução:**
- Não enviar spam
- Respeitar taxa de mensagens (máx 50 por hora)
- Usar número diferente para testes

### ❌ Erro 3: Token Facebook expirado
**Solução:**
- Refresh token automaticamente
- Adicionar verificação diária
- Alertar quando expirar

---

# 💾 DEPLOYMENT (Colocar Online)

### Opção A: Heroku (Mais Fácil)

```bash
# 1. Fazer login
heroku login

# 2. Criar app
heroku create seu-app-sdr

# 3. Configurar variáveis
heroku config:set FACEBOOK_TOKEN=xxx
heroku config:set MONGODB_URI=xxx

# 4. Deploy
git push heroku main

# 5. Ver logs
heroku logs --tail
```

### Opção B: DigitalOcean (Melhor Performance)

```bash
# 1. SSH into droplet
ssh root@seu_ip

# 2. Clonar repositório
git clone seu_repo.git
cd seu_repo

# 3. Instalar dependências
npm install

# 4. Usar PM2 para manter rodando
npm install -g pm2
pm2 start src/server.js --name "sdr-whatsapp"
pm2 save
pm2 startup

# 5. Ver status
pm2 status
```

---

# 📞 PRÓXIMOS PASSOS

1. **Escolha a opção:** WhatsmeOW (recomendado)
2. **Setup inicial:** Siga o passo a passo
3. **Teste manual:** Escanear QR, enviar mensagem
4. **Integre Facebook:** Configure webhook
5. **Implemente SDR:** Adicione takeover humano
6. **Deploy:** Coloque em produção
7. **Monitor:** Acompanhe erros e performance

---

**Precisa de ajuda com alguma opção específica? Avise qual você quer usar primeiro!** 🚀