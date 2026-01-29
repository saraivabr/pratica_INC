# 🚀 Instruções de Deploy - 100% Funcional

## 📋 Checklist Completo

### ✅ 1. Deploy no VPS (185.182.184.122)

**Conecte no VPS via SSH:**
```bash
ssh root@185.182.184.122
# ou
ssh usuario@185.182.184.122
```

**Execute os comandos no VPS:**
```bash
# Ir para o diretório da aplicação
cd /var/www/pratica

# 1️⃣ Executar migração do banco
psql -U pratica -d pratica < migrations/022_user_workspace_architecture.sql

# 2️⃣ Build da aplicação
pnpm build

# 3️⃣ Parar PM2 (se estiver rodando)
pm2 delete pratica || true

# 4️⃣ Iniciar aplicação
pm2 start ecosystem.config.js

# 5️⃣ Salvar configuração do PM2
pm2 save

# 6️⃣ Verificar status
pm2 status
pm2 logs pratica --lines 30
```

**Testar se está funcionando:**
```bash
# No VPS
curl http://localhost:3000

# Do seu computador
curl http://185.182.184.122:3000
```

---

### ✅ 2. Configurar Cloudflare

**Opção A: Automático (via script)**

Do seu computador local:
```bash
cd /Users/saraiva/_Projetos/appnovo_pratica
chmod +x scripts/cloudflare-setup.sh
./scripts/cloudflare-setup.sh
```

**Opção B: Manual (pelo painel)**

1. Acesse https://dash.cloudflare.com/
2. Login: **fellipesaraivabarbosa@gmail.com**
3. Clique em **"Add a Site"**
4. Digite: **corretorparceria.com.br**
5. Escolha plano **Free**
6. Configure os DNS records:
   - `A` | `@` | `185.182.184.122` | 🟠 Proxied
   - `A` | `www` | `185.182.184.122` | 🟠 Proxied
7. Vá em **SSL/TLS** → escolha **Flexible**
8. Ative **Always Use HTTPS**
9. Copie os **nameservers** que o Cloudflare mostrar

---

### ✅ 3. Atualizar Nameservers no Registro.br (ou provedor)

1. Acesse onde você registrou **corretorparceria.com.br**
2. Vá em **DNS/Nameservers**
3. Altere para os nameservers do Cloudflare (exemplo):
   ```
   alex.ns.cloudflare.com
   reza.ns.cloudflare.com
   ```
4. Salve e aguarde propagação (5-30 min geralmente)

---

### ✅ 4. Atualizar .env.production (Depois do DNS propagar)

**No VPS:**
```bash
cd /var/www/pratica

# Editar .env.production
nano .env.production
```

**Alterar estas linhas:**
```bash
# De:
NEXT_PUBLIC_APP_URL="http://185.182.184.122:3000"
NEXTAUTH_URL="http://185.182.184.122:3000"
WEBHOOK_BASE_URL="http://185.182.184.122:3000"

# Para:
NEXT_PUBLIC_APP_URL="https://corretorparceria.com.br"
NEXTAUTH_URL="https://corretorparceria.com.br"
WEBHOOK_BASE_URL="https://corretorparceria.com.br"
```

**Rebuild e restart:**
```bash
pnpm build
pm2 restart pratica
```

---

## 🔍 Verificação Final

### Teste 1: Aplicação rodando
```bash
# No VPS
pm2 status
# Deve mostrar "pratica" como "online"

pm2 logs pratica --lines 50
# Não deve ter erros críticos
```

### Teste 2: DNS propagado
```bash
# Do seu computador
dig corretorparceria.com.br
# Deve retornar IPs do Cloudflare (não o IP direto do VPS - isso é bom!)

nslookup corretorparceria.com.br
# Mesma coisa
```

Ou acesse online: https://dnschecker.org/

### Teste 3: Site acessível
Abra no navegador:
- ✅ https://corretorparceria.com.br
- ✅ https://www.corretorparceria.com.br

Deve abrir o site com **cadeado SSL** 🔒

---

## 📊 Estrutura Final

```
VPS (185.182.184.122)
├── PostgreSQL rodando na porta 5432
├── App Next.js rodando na porta 3000 (via PM2)
└── Firewall liberado: 22 (SSH), 3000 (app), 5432 (postgres)

Cloudflare
├── DNS: corretorparceria.com.br → 185.182.184.122
├── SSL: Flexible (HTTPS grátis)
└── Proxy: Ativo (DDoS protection)

Domínio
└── Nameservers apontando para Cloudflare
```

---

## 🎯 Resumo de Comandos Rápidos

**Deploy completo (no VPS):**
```bash
cd /var/www/pratica && \
psql -U pratica -d pratica < migrations/022_user_workspace_architecture.sql && \
pnpm build && \
pm2 restart pratica && \
pm2 logs pratica
```

**Verificar status (no VPS):**
```bash
pm2 status && pm2 logs pratica --lines 20
```

**Ver logs em tempo real (no VPS):**
```bash
pm2 logs pratica
```

---

## 🆘 Troubleshooting

### Problema: Build falha
```bash
# Limpar cache e reinstalar
rm -rf .next node_modules
pnpm install
pnpm build
```

### Problema: PM2 não inicia
```bash
# Ver erro detalhado
pm2 logs pratica --err --lines 100

# Testar manualmente
pnpm start
# Se funcionar, é config do PM2
```

### Problema: Banco não conecta
```bash
# Testar conexão
psql -U pratica -d pratica -c "SELECT version();"

# Ver usuários
sudo -u postgres psql -c "\du"

# Resetar senha se necessário
sudo -u postgres psql
ALTER USER pratica WITH PASSWORD 'pratica_secure_2026!';
```

### Problema: Site não abre (DNS)
```bash
# Verificar se propagou
dig corretorparceria.com.br

# Verificar nameservers
dig NS corretorparceria.com.br

# Limpar cache DNS local
# Mac:
sudo dscacheutil -flushcache
# Windows:
ipconfig /flushdns
```

---

## ✅ Quando estiver 100%

Você deve conseguir:

1. ✅ Acessar https://corretorparceria.com.br (com SSL)
2. ✅ Fazer login no sistema
3. ✅ WhatsApp funcionar
4. ✅ Criar leads e agendar visitas
5. ✅ PM2 mostrar status "online"
6. ✅ Logs sem erros críticos

---

🎉 **Pronto! Aplicação 100% funcional no domínio corretorparceria.com.br!**
