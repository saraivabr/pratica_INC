# 🔧 CORRIGINDO ERROS - Guia Passo a Passo

**Data:** 28 Jan 2026  
**Status:** 🔴 Sistema com erros - aplicando correções

---

## 🎯 Problemas Identificados

### 1. ❌ Login por telefone não funciona
**Causa:** Tabela `otp_codes` não existe  
**Sintoma:** Erro 42P01 ao tentar fazer login com telefone

### 2. ❌ Sistema de vendas/intermediação não funciona
**Causa:** 6 tabelas faltando (`im_vendas`, `im_beneficiarios`, etc)  
**Sintoma:** Erro 42P01 ao acessar rotas de vendas

### 3. ⚠️ WhatsApp pode não conectar em produção
**Causa:** `WEBHOOK_BASE_URL` potencialmente incorreto  
**Sintoma:** Erro ao tentar iniciar instância WhatsApp

---

## ✅ SOLUÇÃO - Executar Agora

### Passo 1: Verificar Estado Atual do Banco

```bash
# Entrar no diretório do projeto
cd /Users/saraiva/_Projetos/appnovo_pratica

# Carregar variáveis de ambiente
export $(grep -v '^#' .env.production | xargs)

# Verificar o que falta no banco
./scripts/check-database-status.sh
```

**Resultado esperado:**
```
❌ otp_codes (NÃO EXISTE)
❌ im_vendas (NÃO EXISTE)
❌ im_beneficiarios (NÃO EXISTE)
❌ im_distribuicao (NÃO EXISTE)
❌ im_parcelas (NÃO EXISTE)
❌ im_pagamentos (NÃO EXISTE)
❌ im_auditoria (NÃO EXISTE)
```

---

### Passo 2: Aplicar Migrações Críticas

```bash
# Ainda no diretório do projeto
# Com DATABASE_URL já carregado do passo anterior

./scripts/apply-critical-migrations.sh
```

**O que esse script faz:**
1. ✅ Cria tabela `otp_codes` (login por telefone)
2. ✅ Cria 6 tabelas de intermediação:
   - `im_vendas` - Vendas imobiliárias
   - `im_beneficiarios` - Corretores que recebem comissão
   - `im_distribuicao` - Split de comissão
   - `im_parcelas` - Parcelamento
   - `im_pagamentos` - Pagamentos efetuados
   - `im_auditoria` - Log de alterações

**Resultado esperado:**
```
✅ Sucesso
✅ Sucesso
🎉 Migrações aplicadas com sucesso!
```

---

### Passo 3: Reiniciar Aplicação (SE ESTIVER RODANDO NO VPS)

```bash
# Conectar no VPS
ssh root@185.182.184.122

# Reiniciar PM2
pm2 restart pratica

# Ver logs
pm2 logs pratica --lines 50
```

**OU se estiver rodando local:**
```bash
# Parar
npm run stop  # ou Ctrl+C

# Iniciar
npm run build
npm start
```

---

### Passo 4: Testar Sistema

#### Teste 1: Login por Telefone
1. Acessar: http://185.182.184.122:3000/login
2. Clicar em "Login com Telefone"
3. Digitar: `+5511999999999`
4. Verificar se código OTP é enviado (via WhatsApp ou SMS)

#### Teste 2: Login com Email/Senha
1. Acessar: http://185.182.184.122:3000/login
2. Email: `admin@pratica.digital`
3. Senha: `admin123`
4. Clicar em "Entrar"

#### Teste 3: Sistema de Vendas
1. Após login, acessar: `/admin/intermediacao`
2. Tentar cadastrar uma venda
3. Verificar se salva sem erro

---

## 🔍 Verificando se Funcionou

### Comando Rápido: Verificar Tabelas Criadas

```bash
export $(grep -v '^#' .env.production | xargs)

psql "$DATABASE_URL" -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('otp_codes', 'im_vendas', 'im_beneficiarios', 'im_distribuicao', 'im_parcelas', 'im_pagamentos', 'im_auditoria')
ORDER BY tablename;
"
```

**Resultado esperado:**
```
 schemaname |    tablename     | size  
------------+------------------+-------
 public     | im_auditoria     | 8192 bytes
 public     | im_beneficiarios | 8192 bytes
 public     | im_distribuicao  | 8192 bytes
 public     | im_pagamentos    | 8192 bytes
 public     | im_parcelas      | 8192 bytes
 public     | im_vendas        | 8192 bytes
 public     | otp_codes        | 8192 bytes
(7 rows)
```

---

## ⚠️ Se Ainda Houver Erros

### Erro: "relation does not exist"

**Causa:** Migração não foi aplicada corretamente

**Solução:**
```bash
# Verificar se DATABASE_URL está correto
echo $DATABASE_URL

# Tentar aplicar migração individual
psql "$DATABASE_URL" -f migrations/020_otp_codes.sql
psql "$DATABASE_URL" -f migrations/021_sistema_intermediacao.sql
```

### Erro: "permission denied"

**Causa:** Usuário do banco sem permissão

**Solução:**
```bash
# Conectar como superuser
ssh root@185.182.184.122

# Dar permissões
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pratica TO pratica;"
sudo -u postgres psql -d pratica -c "GRANT ALL ON SCHEMA public TO pratica;"
sudo -u postgres psql -d pratica -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pratica;"
```

### Erro: "Evolution API not responding"

**Verificar configuração:**
```bash
# No VPS
docker ps | grep evolution
docker logs evolution-api --tail 50

# Verificar se está rodando
curl http://localhost:8080/
```

**Verificar .env.production:**
```bash
EVOLUTION_API_URL="https://evoapi.pratica.digital"
WEBHOOK_BASE_URL="http://185.182.184.122:3000"
```

---

## 📊 Status Após Correção

Depois de aplicar as migrações, o sistema deve estar:

- ✅ Login por email/senha funcionando
- ✅ Login por telefone (OTP) funcionando
- ✅ Cadastro de vendas funcionando
- ✅ Distribuição de comissões funcionando
- ✅ WhatsApp conectando (se Evolution API configurado)

---

## 🎯 Próximos Passos (Após Corrigir)

1. **Testar todos os fluxos principais:**
   - [ ] Login (email + telefone)
   - [ ] Cadastro de lead
   - [ ] Cadastro de venda
   - [ ] Distribuição de comissão
   - [ ] Conexão WhatsApp

2. **Configurar integrações externas:**
   - [ ] CV CRM (se necessário)
   - [ ] OpenAI (se usar Sofia IA)
   - [ ] Evolution API (WhatsApp)

3. **Documentar o que funciona:**
   - [ ] Criar lista de features testadas
   - [ ] Documentar bugs conhecidos (se houver)
   - [ ] Criar guia de uso para usuários finais

---

## 📞 Dúvidas?

Se algo não funcionar:
1. Verificar logs: `pm2 logs pratica`
2. Verificar tabelas: `./scripts/check-database-status.sh`
3. Verificar .env: `cat .env.production | grep -v "^#" | grep -v "^$"`

**Me avise qual erro específico e vou debugar junto com você!** 🚀
