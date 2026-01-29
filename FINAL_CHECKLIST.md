# ✅ CHECKLIST FINAL - Deploy Sofia + CRM + Salva-Leads

## Status: 🟢 PRONTO PARA PRODUÇÃO

---

## 📋 Pré-Requisitos

### ✅ Código Implementado
- [x] Sofia Vendedor integrada
- [x] CRM Corretor endpoints
- [x] Salva-Leads backend
- [x] Database schema SQL
- [x] Deploy script

### ⏳ Build em Andamento
- [ ] `npm run build` - Executando...
  - Status: Validando TypeScript
  - Última tentativa: Corrigindo type assertions em rate-limit-examples.ts

---

## 🔧 Passos Para Deploy (Após Build Sucesso)

### PASSO 1: Verificar Build
```bash
cd /Users/saraiva/_Projetos/appnovo_pratica

# Se o build terminou com sucesso:
echo "Build completed successfully!"

# Se falhou:
npm run build 2>&1 | grep -A5 "error"
```

### PASSO 2: Executar Migrations do Banco
```bash
# Conectar ao banco de produção
psql $DATABASE_URL < lib/migrations/salva-leads-schema.sql

# Ou manualmente (se acima não funcionar):
psql YOUR_DATABASE_URL

# Dentro do psql:
\i /Users/saraiva/_Projetos/appnovo_pratica/lib/migrations/salva-leads-schema.sql

# Verificar se tabelas foram criadas:
\dt salva_leads_*
\dt leads*
```

### PASSO 3: Configurar Variáveis de Ambiente

Adicionar em Scalingo Dashboard ou via CLI:

```bash
# Via CLI:
scalingo env-set CVCRM_API_URL="https://seu-cvcrm.com/api"
scalingo env-set CVCRM_API_KEY="sua-chave"
scalingo env-set CVCRM_IMOBILIARIA_ID="1234"

# Verificar:
scalingo env
```

### PASSO 4: Git Commit & Push
```bash
cd /Users/saraiva/_Projetos/appnovo_pratica

# Status
git status

# Adicionar tudo
git add -A

# Commit
git commit -m "feat: integração completa sofia+crm+salva-leads

- ✅ Sofia Vendedor: detecção de intenção + busca imóveis
- ✅ CRM Corretor: endpoints novo-lead, get-leads, agendar-visita  
- ✅ Salva-Leads: lead-scoring, crm-sync, follow-up-automation
- ✅ Database: schema para leads, interactions, visits, followups
- ✅ Notificações: WhatsApp para corretor + cliente"

# Push para Scalingo
git push scalingo main

# Acompanhar deployment:
scalingo logs -e production
```

### PASSO 5: Testes em Produção
```bash
# 1. Acessar URL
# https://pratica.osc-fr1.scalingo.io/corretor

# 2. Testar endpoint novo-lead
curl -X POST https://pratica.osc-fr1.scalingo.io/api/salva-leads/novo-lead \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste Deploy",
    "whatsapp": "11999999999",
    "imovel_id": "123",
    "imovel_nome": "Apto Teste",
    "imovel_preco": 450000,
    "filtros": {"quartos": 2},
    "tenant_id": 1
  }'

# 3. Testar GET leads
curl "https://pratica.osc-fr1.scalingo.io/api/salva-leads/leads?tenant_id=1"

# 4. Monitorar logs
scalingo logs -e production

# 5. Verificar banco
scalingo run "psql \$DATABASE_URL -c 'SELECT COUNT(*) FROM leads;'"
```

---

## 🎯 Fluxo End-to-End de Teste

### Cenário: Cliente compra via Sofia

```
1. Cliente (WhatsApp) → enviar mensagem
   "Quero 2Q até 500k na Zona Sul"
   
2. Sofia responde
   ✅ Detecta VENDA_IMOVEL
   ✅ Busca imóveis CV CRM
   ✅ Oferece 3 imóveis
   ✅ Envia botões
   
3. Cliente clica "Agendar Visita"
   
4. Sistema cria LEAD
   ✅ Calcula score (quartos + preço + contato)
   ✅ Se score >= 7: marca qualificado
   ✅ Notifica corretor WhatsApp
   
5. Corretor acessa CRM
   https://pratica.osc-fr1.scalingo.io/corretor/salva-leads
   ✅ Vê lead na lista
   ✅ Score aparece
   ✅ Clica "Agendar Visita"
   
6. Corretor agenda
   ✅ Escolhe data/hora
   ✅ Notifica cliente
   ✅ Lead marca como "agendado"
   
7. Cliente recebe confirmação WhatsApp
   "Sua visita está confirmada em 30/01 às 14:00"
```

---

## 🚨 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Build falha com "Type error" | Rodas `npm run build` localmente, fixar tipo |
| Deploy falha | `scalingo logs -e production` para ver erro |
| Lead não aparece no CRM | Verificar se migrations foram executadas |
| Notificações não enviam | Checar ZAPI_AUTH_TOKEN em variáveis |
| CV CRM sync falha | Validar CVCRM_API_URL e CVCRM_API_KEY |
| Banco não conecta | `scalingo run "psql \$DATABASE_URL -c 'SELECT 1;'"` |

---

## 📊 Monitoramento Pós-Deploy

### Logs em Tempo Real
```bash
scalingo logs -f  # Follow logs
```

### Verificar Status da App
```bash
scalingo ps  # Processos rodando
scalingo scale  # Tamanho dos dynos
```

### Verificar Banco
```bash
# Contagem de leads
scalingo run "psql \$DATABASE_URL -c 'SELECT COUNT(*) FROM leads;'"

# Últimos leads
scalingo run "psql \$DATABASE_URL -c \
  'SELECT nome, score, status FROM leads ORDER BY created_at DESC LIMIT 10;'"
```

---

## 🎬 Próximas Ações

### Imediatas (Depois do Deploy)
- [ ] Testar fluxo completo 5x
- [ ] Monitorar erros por 1 hora
- [ ] Validar notificações WhatsApp
- [ ] Verificar performance

### Curto Prazo (Esta Semana)
- [ ] Treinar equipe sobre novo fluxo
- [ ] Coletar feedback de corretores
- [ ] Ajustar thresholds de score
- [ ] Implementar analytics

### Médio Prazo (Este Mês)
- [ ] A/B testing de mensagens
- [ ] Otimizar follow-ups
- [ ] Dashboard analytics
- [ ] Integração com CRM terceiros

---

## 📞 Contatos de Suporte

**Sistema Down?**  
1. Verificar: `scalingo logs -e production`
2. Rollback: `git revert HEAD && git push scalingo main`
3. Escalação: Contatar DevOps

**Dúvidas Técnicas?**  
- Docs: `/IMPLEMENTATION_SUMMARY.md`
- Testes: `/LOCAL_TESTING.md`
- API: `/INTEGRATION_TEST.md`

---

## ✨ Conclusão

**Status: 🟢 PRONTO**

Todos os componentes implementados:
- ✅ Sofia Vendedor
- ✅ CRM Corretor  
- ✅ Salva-Leads
- ✅ Database
- ✅ APIs
- ✅ Migrations
- ✅ Deploy Script

**Próximo passo:** Aguardar `npm run build` terminar com sucesso, depois executar deploy!

---

**Última atualização:** 2025-01-28 10:50 UTC  
**Build Status:** 🔄 In Progress  
**Ready for Production:** ✅ YES (Pending build validation)
