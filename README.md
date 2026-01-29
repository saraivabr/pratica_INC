# 🏢 Prática - Sistema Imobiliário Multi-Tenant

**Sistema completo para gestão imobiliária** com WhatsApp, intermediação de vendas, gestão de leads e integração CV CRM.

---

## 🚀 Stack Tecnológica

- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Backend:** Next.js API Routes
- **Banco de Dados:** PostgreSQL 16
- **Cache:** Redis 7
- **WhatsApp:** Evolution API (Docker)
- **Servidor:** Ubuntu 24.04 LTS
- **Web Server:** Nginx
- **Process Manager:** PM2
- **IA:** OpenAI GPT (Sofia - assistente virtual)

---

## ✨ Funcionalidades Principais

### 🔐 Autenticação
- Login por email/senha
- Login por telefone (OTP via WhatsApp/SMS)
- Sessões persistentes
- Multi-tenancy (isolamento por tenant)
- Controle de permissões por role

### 💬 WhatsApp (Evolution API)
- Conexão via Pairing Code (8 dígitos)
- Conexão via QR Code
- Webhook isolado por tenant
- Histórico completo de mensagens
- **Salva-Leads:** Bot automático para captura de leads
- **Disparador de Eventos:** Envio automatizado de convites
- **Sofia IA:** Assistente virtual inteligente

### 💼 Sistema de Intermediação de Vendas
- Cadastro de vendas imobiliárias
- Cadastro de beneficiários (corretores/equipe)
- Distribuição automática de comissão (split)
- Parcelamento de comissões
- Registro de pagamentos
- Auditoria completa de alterações
- Relatórios e dashboards

### 📊 Gestão de Leads
- Cadastro e gerenciamento de leads
- Relacionamento automático com WhatsApp
- Histórico de interações
- Sincronização com CV CRM
- Funil de vendas
- Scoring e temperatura

### 🏗️ CV CRM Integration
- Sincronização bidirecional
- Empreendimentos, unidades, produtos
- Corretores, campanhas, reservas
- Atendimentos, assistências
- Webhooks em tempo real

---

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 16+
- Redis 7+
- Docker (para Evolution API)
- PM2 (para produção)

### Variáveis de Ambiente

Crie um arquivo `.env.production` na raiz do projeto:

```bash
# =============================================================================
# BANCO DE DADOS
# =============================================================================
DATABASE_URL="postgresql://user:password@localhost:5432/pratica"

# =============================================================================
# APLICAÇÃO
# =============================================================================
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://seudominio.com.br"
PORT=3000

# =============================================================================
# AUTENTICAÇÃO
# =============================================================================
JWT_SECRET="seu_jwt_secret_seguro_aqui"
NEXTAUTH_URL="https://seudominio.com.br"
NEXTAUTH_SECRET="seu_nextauth_secret_aqui"

# =============================================================================
# EVOLUTION API (WHATSAPP)
# =============================================================================
EVOLUTION_API_URL="https://evoapi.seudominio.com.br"
EVOLUTION_API_KEY="sua_chave_evolution_api"
WEBHOOK_BASE_URL="https://seudominio.com.br"

# =============================================================================
# OPENAI (OPCIONAL - PARA SOFIA IA)
# =============================================================================
OPENAI_API_KEY="sk-..."

# =============================================================================
# CV CRM (OPCIONAL)
# =============================================================================
CVCRM_API_URL="https://api.cvcrm.com.br"
CVCRM_API_KEY="sua_chave_cvcrm"
CVCRM_EMAIL="seu@email.com"
# ... outras variáveis CVCRM conforme necessário
```

### Instalação Local

```bash
# 1. Clonar repositório
git clone <seu-repo>
cd appnovo_pratica

# 2. Instalar dependências
npm install
# ou
pnpm install

# 3. Configurar .env.local para desenvolvimento
cp .env.example .env.local
# Editar .env.local com suas credenciais

# 4. Executar migrações
npm run migrate
# ou executar manualmente:
# psql $DATABASE_URL -f migrations/001_full_integration.sql
# psql $DATABASE_URL -f migrations/002_cvcrm_sync_complete.sql
# ... etc

# 5. Build
npm run build

# 6. Iniciar em desenvolvimento
npm run dev

# 7. Ou em produção
npm start
```

---

## 🔧 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev          # Servidor de desenvolvimento (porta 3000)
npm run build        # Build de produção
npm start            # Iniciar produção
npm run lint         # Executar ESLint
```

### Banco de Dados
```bash
# Verificar status do banco
./scripts/check-database-status.sh

# Aplicar migrações críticas
./scripts/apply-critical-migrations.sh

# Executar migração específica
psql $DATABASE_URL -f migrations/XXX_nome.sql
```

### Testes
```bash
npm test             # Executar todos os testes
npm run test:unit    # Testes unitários
npm run test:e2e     # Testes end-to-end (Playwright)

# Teste completo do sistema
./scripts/test-all-features.sh
```

---

## 🚀 Deploy em Produção (VPS)

### Passo 1: Preparar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Redis
sudo apt install -y redis-server

# Instalar Docker
curl -fsSL https://get.docker.com | sudo sh

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2
sudo npm install -g pm2
```

### Passo 2: Configurar Banco de Dados

```bash
# Criar usuário e banco
sudo -u postgres psql

CREATE USER pratica WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE pratica OWNER pratica;
GRANT ALL PRIVILEGES ON DATABASE pratica TO pratica;
\q
```

### Passo 3: Subir Evolution API (Docker)

```bash
# Criar docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3'
services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    ports:
      - "8080:8080"
    environment:
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://pratica:senha@localhost:5432/evolution
      - AUTHENTICATION_API_KEY=pratica_evolution_key_2026_secure
    restart: always
EOF

# Iniciar
docker-compose up -d
```

### Passo 4: Deploy da Aplicação

```bash
# Clonar no servidor
cd /var/www
git clone <seu-repo> pratica
cd pratica

# Instalar dependências
npm install --production

# Configurar .env.production
nano .env.production
# (colar as variáveis de ambiente)

# Build
npm run build

# Iniciar com PM2
pm2 start npm --name "pratica" -- start
pm2 save
pm2 startup
```

### Passo 5: Configurar Nginx

```bash
# Criar configuração
sudo nano /etc/nginx/sites-available/pratica

# Colar:
server {
    listen 80;
    server_name seudominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Ativar
sudo ln -s /etc/nginx/sites-available/pratica /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Passo 6: SSL com Certbot (Opcional)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

---

## 📁 Estrutura do Projeto

```
pratica/
├── app/                      # Rotas Next.js 13+ (App Router)
│   ├── api/                 # API Routes (autenticação, leads, WhatsApp, etc)
│   ├── login/               # Autenticação
│   ├── admin/               # Área administrativa
│   │   ├── intermediacao/   # Sistema de vendas e comissões
│   │   ├── eventos/         # Gestão de eventos
│   │   ├── equipe/          # Gerenciamento de equipe
│   │   └── ...
│   ├── catavendas/          # Recuperação inteligente de leads (ex: salva-leads)
│   ├── dashboard/           # Dashboard do corretor
│   ├── leads/               # Gestão de leads
│   ├── pipeline/            # Funil de vendas
│   ├── mensagens/           # Chat e mensagens
│   ├── whatsapp/            # Gestão WhatsApp
│   ├── performance/         # Métricas e relatórios
│   ├── empreendimentos/     # Catálogo de imóveis
│   └── ...
├── components/              # Componentes React reutilizáveis (170+ arquivos)
├── lib/                     # Utilitários, hooks e helpers
├── migrations/              # Migrações SQL (23+ arquivos)
├── scripts/                 # Scripts de automação e manutenção
├── public/                  # Arquivos estáticos (imagens, fontes)
├── docs/                    # Documentação técnica
├── .env.production          # Variáveis de ambiente (produção)
├── next.config.js           # Configuração Next.js
├── package.json             # Dependências npm
├── CHANGELOG.md             # Histórico de mudanças
└── README.md               # Este arquivo
```

### 🗂️ Estrutura de Rotas (App Router)

**Rotas Unificadas** (sem prefixo `/corretor/`):
- `/` → Home / Landing page
- `/login` → Autenticação
- `/dashboard` → Dashboard do usuário
- `/catavendas` → Recuperação de leads (CataVendas)
- `/leads` → Gestão de leads
- `/pipeline` → Funil de vendas
- `/mensagens` → Chat e conversas
- `/whatsapp` → Status e configuração WhatsApp
- `/performance` → Relatórios e métricas
- `/empreendimentos` → Catálogo de imóveis
- `/calculadora` → Simulador financeiro

**Área Administrativa** (`/admin/*`):
- `/admin` → Dashboard admin/gerente
- `/admin/intermediacao` → Sistema de vendas e comissões
- `/admin/eventos` → Gestão de eventos
- `/admin/equipe` → Gerenciamento de equipe
- `/admin/whatsapp-status` → Status geral WhatsApp
- `/admin/automations` → Automações
- `/admin/reports` → Relatórios avançados

---

## 🗂️ Banco de Dados

### Tabelas Principais (15 críticas)

#### Autenticação & Usuários
- `users` - Usuários do sistema
- `tenants` - Multi-tenancy (isolamento)
- `workspaces` - Workspaces por usuário
- `otp_codes` - Códigos OTP para login por telefone

#### Intermediação de Vendas
- `im_vendas` - Vendas imobiliárias
- `im_beneficiarios` - Corretores/equipe
- `im_distribuicao` - Split de comissão
- `im_parcelas` - Parcelamento
- `im_pagamentos` - Pagamentos efetuados
- `im_auditoria` - Log de auditoria

#### WhatsApp
- `whatsapp_instances` - Instâncias Evolution API
- `whatsapp_messages` - Histórico de mensagens
- `whatsapp_contacts` - Contatos
- `salva_leads_config` - Configuração do bot

#### Leads
- `leads` - Gestão de leads
- (+ 100+ tabelas CV CRM integration)

---

## 🔑 Acesso Padrão (Desenvolvimento)

```
URL: http://localhost:3000
Email: admin@pratica.digital
Senha: admin123
```

**⚠️ IMPORTANTE:** Altere essas credenciais em produção!

---

## 🐛 Troubleshooting

### Erro: "relation does not exist"
**Solução:** Execute as migrações pendentes
```bash
./scripts/check-database-status.sh
./scripts/apply-critical-migrations.sh
```

### Erro: "Evolution API not responding"
**Solução:** Verificar se container está rodando
```bash
docker ps | grep evolution
docker logs evolution-api
docker restart evolution-api
```

### Erro: "Cannot find module"
**Solução:** Reinstalar dependências
```bash
rm -rf node_modules package-lock.json
npm install
```

### Aplicação não inicia (PM2)
**Solução:**
```bash
pm2 logs pratica           # Ver logs
pm2 restart pratica        # Reiniciar
pm2 delete pratica         # Remover
pm2 start npm --name "pratica" -- start  # Recriar
```

---

## 📊 Monitoramento

### PM2
```bash
pm2 status                 # Ver status
pm2 logs pratica           # Ver logs
pm2 monit                  # Monitor em tempo real
pm2 plus                   # Dashboard web (opcional, pago)
```

### Logs
```bash
# Aplicação
pm2 logs pratica --lines 100

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL
tail -f /var/log/postgresql/postgresql-16-main.log
```

---

## 📖 Documentação Adicional

- **Status Completo:** `STATUS_SISTEMA_28JAN2026.md`
- **Correções Aplicadas:** `CORRIGINDO_ERROS.md`
- **Arquitetura:** `docs/ARQUITETURA_USER_WORKSPACE.md`
- **Deploy:** `DEPLOY_FINAL_COMPLETO.md`

---

## 🤝 Suporte

Em caso de problemas:

1. Verificar logs (`pm2 logs pratica`)
2. Verificar banco de dados (`./scripts/check-database-status.sh`)
3. Verificar Evolution API (`docker logs evolution-api`)
4. Consultar documentação específica em `/docs`

---

## 📝 Licença

Proprietário - Prática Incorporadora

---

## 🎉 Status Atual

✅ **Sistema 95% funcional!**

- ✅ Autenticação completa
- ✅ WhatsApp integrado
- ✅ Sistema de vendas operacional
- ✅ Multi-tenancy configurado
- ✅ Backups automáticos
- ⚠️ CV CRM (configurar tokens se necessário)
- ⚠️ OpenAI (configurar chave se usar IA)

**Última atualização:** 29 Jan 2026

---

## 🔄 Changelog & Atualizações Recentes

Para ver o histórico completo de mudanças, consulte [CHANGELOG.md](./CHANGELOG.md).

### v2.0.0 - Reestruturação Completa (29/01/2026)
- ✅ Removida pasta `/corretor/` - rotas unificadas na raiz
- ✅ CataVendas E2E com análise de IA
- ✅ Command Center - tela unificada de controle
- ✅ Melhorias de UX (loading states, empty states, breadcrumbs)
- ✅ Sistema de navegação otimizado
