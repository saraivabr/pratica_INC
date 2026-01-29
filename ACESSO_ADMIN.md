# 🔑 ACESSO ADMINISTRATIVO - Sistema Prática

**Data:** 28 Janeiro 2026 - 15:30 BRT  
**Status:** ✅ Configurado

---

## 🚀 COMO FAZER LOGIN COMO ADMIN

### ✅ **Método 1: URL Secreta (Recomendado)**

Acesse diretamente com a chave secreta na URL:

```
https://corretorparceria.com.br/admin?key=pratica-admin-2026-secure-key
```

**O que acontece:**
1. Middleware valida a chave
2. Redireciona para `/api/auth/admin-login`
3. Cria sessão automaticamente
4. Redireciona para `/admin` já logado

**Vantagens:**
- ✅ Não precisa WhatsApp
- ✅ Login instantâneo
- ✅ Seguro (chave configurada no servidor)

---

### ⚠️ **Método 2: Login por OTP (Requer WhatsApp)**

Para usar o login normal (tela de login), você precisa:

1. **Conectar uma instância WhatsApp**
   - Acessar `/admin/whatsapp` (depois de logar via método 1)
   - Criar nova instância
   - Conectar seu WhatsApp

2. **Depois disso, poderá usar:**
   ```
   Telefone: +5511999999999
   Código OTP: (enviado via WhatsApp)
   ```

**Limitações:**
- ❌ Não funciona sem WhatsApp conectado
- ❌ Requer Evolution API rodando
- ❌ Usuário precisa existir no banco

---

## 🔐 CREDENCIAIS

### Produção (VPS)
```
URL: https://corretorparceria.com.br/admin?key=pratica-admin-2026-secure-key
Chave Admin: pratica-admin-2026-secure-key
Banco: postgresql://pratica:pratica_secure_2026!@localhost:5432/pratica
```

### Usuário Admin no Banco
```
Email: admin@pratica.digital
Telefone: +5511999999999
Role: admin
Tenant: 1
Workspace: 1
Status: Ativo
```

---

## 🛠️ COMO FUNCIONA (Técnico)

### Fluxo de Autenticação Admin

```
1. Usuário acessa: /admin?key=CHAVE_SECRETA

2. Middleware (middleware.ts):
   - Extrai searchParams.get('key')
   - Compara com process.env.ADMIN_SECRET_KEY
   - Se válido: redirect para /api/auth/admin-login

3. Route /api/auth/admin-login (route.ts):
   - Busca primeiro usuário admin ativo no DB
   - Se não existir, cria automaticamente
   - Cria sessão no banco (sessions table)
   - Seta cookie 'pratica-session'
   - Redirect para /admin (sem key na URL)

4. Middleware em /admin:
   - Lê cookie 'pratica-session'
   - Valida role === 'admin' || role === 'gerente'
   - Permite acesso
```

### Configuração Aplicada

**Arquivo:** `/var/www/pratica/.env.production`

```bash
# Admin bypass key
ADMIN_SECRET_KEY=pratica-admin-2026-secure-key
```

**Reinício:** `pm2 restart pratica --update-env` (já feito)

---

## 🐛 TROUBLESHOOTING

### ❌ "Erro ao enviar link. Tente novamente."
**Causa:** WhatsApp não conectado  
**Solução:** Use método 1 (URL secreta) para logar primeiro

### ❌ "admin_required" na URL
**Causa:** Chave secreta inválida ou ausente  
**Solução:** Verifique se a chave está correta na URL

### ❌ "config_error"
**Causa:** ADMIN_SECRET_KEY não configurado no servidor  
**Solução:** Já foi configurado (✅ resolvido)

### ❌ "Instance not found" nos logs
**Causa:** Evolution API não tem instância WhatsApp conectada  
**Solução:** Normal! Use método 1 para logar e depois configure WhatsApp

---

## 📊 LOGS

### Ver logs em tempo real:
```bash
ssh root@185.182.184.122
pm2 logs pratica --lines 100
```

### Ver apenas erros:
```bash
pm2 logs pratica --err
```

### Ver tentativas de login:
```bash
pm2 logs pratica | grep -i 'auth\|otp\|login'
```

---

## 🔄 PRÓXIMOS PASSOS

Depois de fazer login via método 1:

1. ✅ **Configurar WhatsApp**
   - Ir para `/admin/whatsapp`
   - Criar instância
   - Conectar via Pairing Code ou QR Code

2. ✅ **Testar OTP**
   - Depois do WhatsApp conectado
   - Testar login normal pela tela de login
   - Usar telefone: +5511999999999

3. ✅ **Cadastrar vendas**
   - Ir para `/admin/intermediacao`
   - Testar sistema completo

---

## 🔒 SEGURANÇA

### ⚠️ IMPORTANTE: Proteger a Chave

A chave `pratica-admin-2026-secure-key` dá acesso total ao sistema!

**Recomendações:**
1. ✅ Nunca compartilhar em público
2. ✅ Nunca commitar no git
3. ✅ Trocar periodicamente
4. ✅ Usar HTTPS apenas (já configurado)
5. ✅ Monitorar tentativas de acesso admin

### Como trocar a chave:

```bash
ssh root@185.182.184.122

# Editar .env.production
nano /var/www/pratica/.env.production

# Trocar linha:
ADMIN_SECRET_KEY=nova-chave-secreta-aqui

# Reiniciar
pm2 restart pratica --update-env
```

---

## ✅ STATUS ATUAL

- ✅ Chave configurada: `pratica-admin-2026-secure-key`
- ✅ Aplicação reiniciada com nova config
- ✅ Usuário admin existe no banco
- ✅ Middleware validando chave
- ✅ Route admin-login funcionando
- ✅ URL de acesso pronta

---

## 🎉 TESTADO E FUNCIONANDO!

Acesse agora mesmo:

```
https://corretorparceria.com.br/admin?key=pratica-admin-2026-secure-key
```

Você será redirecionado automaticamente para o painel admin já logado!

---

**Atualizado:** 28 Jan 2026 - 15:30 BRT  
**Por:** Assistente AI (Moltbot)  
**Status:** ✅ PRONTO PARA USO
