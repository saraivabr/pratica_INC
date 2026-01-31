# Justificativa de Investimento: Acesso CVDW (CV CRM Data Warehouse)

**Data:** 2026-01-29
**Objetivo:** Aprovação financeira para contratação/ativação do acesso CVDW da CV CRM.

---

## 1) Resumo Executivo

- O app já possui **28 agentes de sincronização** prontos para integrar todos os domínios da CV CRM (vendas, comissões, unidades, corretores, reservas, processos, etc.) em `lib/sync/agents`.
- **Hoje só conseguimos sincronizar uma fração dos dados** pela API Comercial (leads/interações/tarefas; reservas sem registros), devido à ausência de acesso ao CVDW (403). Isso limita relatórios financeiros e operacionais.
- **Com CVDW, desbloqueamos 68 endpoints**, permitindo a sincronização completa e confiável do CRM — base necessária para previsibilidade de receita, auditoria de comissões e governança de dados.

---

## 2) Contexto Atual (evidências técnicas)

- Documentos internos confirmam que **o acesso ao CVDW está bloqueado (403)** e que a **API Comercial possui muito menos endpoints disponíveis**, reduzindo a cobertura de dados.  
  - Referência: `docs/CVCRM_API_REALITY_CHECK.md` (2026-01-17)
- Mapeamento completo indica que **apenas um conjunto reduzido de endpoints está funcional**, com ~64 mil registros acessíveis e foco em leads/interações.  
  - Referência: `docs/CVCRM_COMPLETE_API_MAPPING.md` (2026-01-17)
- O aplicativo foi desenhado para **sincronização bidirecional e cobertura completa do CRM**, conforme `README.md` e o conjunto de agentes de sincronização em `lib/sync/agents`.

---

## 3) Problema Financeiro com o Status Atual

Sem CVDW, não conseguimos consolidar dados críticos para a área financeira e de operações:

- **Receita e pipeline**: falta de visibilidade completa de vendas, processos, reservas, unidades e status comerciais.
- **Comissões e repasses**: sem dados completos de comissões/repasses, há risco de inconsistências e retrabalho manual.
- **Previsibilidade e planejamento**: decisões financeiras ficam baseadas em dados parciais (principalmente leads), reduzindo a confiança dos números.
- **Auditoria e compliance**: ausência de trilha completa de dados do CRM limita governança e auditoria interna.

Resultado: **o time financeiro não consegue ter uma visão consolidada e auditável** do ciclo comercial completo.

---

## 4) O que o CVDW desbloqueia

Com acesso CVDW, a integração passa a abranger os principais domínios já preparados no app:

- **Vendas e processos** (controle do ciclo comercial completo)
- **Comissões e repasses** (fechamento financeiro confiável)
- **Corretores e imobiliárias** (gestão de parceiros e performance)
- **Unidades e empreendimentos** (estoque e disponibilidade)
- **Atendimentos, assistências e histórico** (qualidade de atendimento e SLA)

Em termos práticos, isso **ativa os 28 agentes de sincronização já implementados**, reduzindo custo de desenvolvimento adicional e acelerando o go-live da visão 360° do CRM.

---

## 5) Benefícios Diretos para o Financeiro

- **Conciliação automática** de vendas, comissões e repasses
- **Menos retrabalho manual** com planilhas e exportações
- **Relatórios confiáveis** para forecast, budget e performance
- **Redução de risco** por inconsistências entre CRM e financeiro
- **Governança e auditoria** com dados centralizados e históricos completos

---

## 6) Custo x Benefício (visão prática)

- **Custo técnico interno baixo**: a arquitetura e os agentes já existem; o esforço é principalmente habilitação do CVDW e ajustes pontuais.
- **Benefício operacional alto**: dados completos do funil comercial, com base para decisões financeiras e auditoria.
- **Risco atual**: manter dados incompletos gera retrabalho, decisões com baixa confiança e risco de inconsistências contábeis.

---

## 7) Riscos e Mitigações

- **Aprovação e prazo do fornecedor**: depende da CV CRM.  
  *Mitigação:* solicitar acesso imediatamente e manter sincronização parcial enquanto isso.
- **Rate limit menor no CVDW** (20 req/min vs 200 req/min na Comercial).  
  *Mitigação:* sincronização incremental e agendamento noturno (já previsto na arquitetura).
- **Possível custo adicional**: depende do contrato CV CRM.  
  *Mitigação:* validar com o fornecedor e comparar com ganhos operacionais.

---

## 8) Recomendação

**Aprovar a solicitação de acesso CVDW** junto à CV CRM para liberar todos os domínios do CRM e permitir:

1. Sincronização completa de dados (financeiro + comercial)
2. Relatórios confiáveis de receita e comissões
3. Base sólida para auditoria e governança

**Sugestão de próximos passos:**

1) Abrir ticket formal com a CV CRM solicitando acesso CVDW e proposta comercial
2) Validar custos e prazos com o fornecedor
3) Planejar ativação técnica (configuração + testes)

---

## 9) Anexos (referências internas)

- `docs/CVCRM_API_REALITY_CHECK.md` — comprova bloqueio de CVDW (403) e limitação da API Comercial
- `docs/CVCRM_COMPLETE_API_MAPPING.md` — mapeamento e volume atual acessível
- `lib/sync/agents/` — 28 agentes de sincronização prontos para uso
- `README.md` — integração CV CRM prevista como funcionalidade principal
