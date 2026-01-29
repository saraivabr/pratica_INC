# 🌐 Configuração Cloudflare - corretorparceria.com.br

## ✅ Credenciais
- **Email:** fellipesaraivabarbosa@gmail.com
- **API Key:** c81188d3999224b21b3f5a8532b6f9b17ce05
- **Domínio:** corretorparceria.com.br
- **VPS IP:** 185.182.184.122

---

## 📋 Passo a Passo

### 1️⃣ Adicionar o Domínio ao Cloudflare

1. Acesse https://dash.cloudflare.com/
2. Login com: **fellipesaraivabarbosa@gmail.com**
3. Clique em **"Add a Site"**
4. Digite: **corretorparceria.com.br**
5. Escolha o plano **Free**
6. Cloudflare vai escanear os DNS existentes

### 2️⃣ Configurar DNS Records

Adicione/edite os seguintes registros:

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | 185.182.184.122 | ✅ Proxied | Auto |
| A | www | 185.182.184.122 | ✅ Proxied | Auto |
| CNAME | evoapi | evoapi.pratica.digital | ⚠️ DNS Only | Auto |

**Importante:**
- `@` = domínio raiz (corretorparceria.com.br)
- `www` = subdomínio www
- Ative **Proxy** (nuvem laranja 🟠) para @ e www
- evoapi pode ficar DNS Only (nuvem cinza)

### 3️⃣ Atualizar Nameservers

No seu **provedor de domínio** (onde comprou corretorparceria.com.br):

1. Acesse o painel de controle
2. Vá em **DNS/Nameservers**
3. Altere para os nameservers do Cloudflare:
   ```
   alex.ns.cloudflare.com
   reza.ns.cloudflare.com
   ```
   (Cloudflare mostra os nameservers específicos para você)

4. Aguarde propagação (pode levar até 24h, mas geralmente 5-30 min)

### 4️⃣ Configurar SSL/TLS

1. No Cloudflare, vá em **SSL/TLS**
2. Escolha o modo: **Flexible** (por enquanto)
3. Depois que configurar SSL no VPS, mude para **Full (strict)**

### 5️⃣ Configurar Page Rules (Opcional)

Crie regras para:
- Forçar HTTPS
- Cache de assets
- Etc

**Exemplo - Forçar HTTPS:**
- URL: `http://*corretorparceria.com.br/*`
- Setting: **Always Use HTTPS**

### 6️⃣ Atualizar .env.production

Depois que o DNS propagar, atualizar:

```bash
NEXT_PUBLIC_APP_URL="https://corretorparceria.com.br"
NEXTAUTH_URL="https://corretorparceria.com.br"
WEBHOOK_BASE_URL="https://corretorparceria.com.br"
```

E fazer rebuild:
```bash
pnpm build
pm2 restart pratica
```

---

## 🔍 Verificação

Após configurar, teste:

```bash
# Verificar propagação DNS
dig corretorparceria.com.br
nslookup corretorparceria.com.br

# Testar acesso
curl -I https://corretorparceria.com.br
```

Ou acesse online:
- https://dnschecker.org/
- Digite: corretorparceria.com.br

---

## ⚡ Configuração Avançada (Depois)

### Instalar Certbot no VPS (SSL próprio)
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d corretorparceria.com.br -d www.corretorparceria.com.br
```

### Configurar Nginx (proxy reverso)
```bash
sudo apt install nginx
# Criar config para proxy para :3000
```

---

## 📞 Troubleshooting

**Problema:** DNS não propaga
- ✅ Aguarde mais tempo (até 24h)
- ✅ Limpe cache DNS: `ipconfig /flushdns` (Windows) ou `sudo dscacheutil -flushcache` (Mac)

**Problema:** SSL com erro
- ✅ Use modo Flexible primeiro
- ✅ Aguarde certificado do Cloudflare (alguns minutos)

**Problema:** Site não carrega
- ✅ Verifique se PM2 está rodando: `pm2 status`
- ✅ Verifique logs: `pm2 logs pratica`
- ✅ Teste direto no IP: http://185.182.184.122:3000

---

✅ **Pronto! Domínio configurado e apontando para o VPS com SSL grátis do Cloudflare!**
