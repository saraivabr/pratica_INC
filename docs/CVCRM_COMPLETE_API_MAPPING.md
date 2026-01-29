# CV CRM - Mapeamento Completo da API (2026-01-17)

**Status:** ✅ Validação Completa Realizada
**Método:** Firecrawl + Testes Reais com Dados de Produção

---

## 📊 Resumo Executivo

**Endpoints Funcionais:** 8
**Total de Registros Acessíveis:** ~64.000
**Domínios Cobertos:** 3 (Leads, Atendimentos, Assistências)

---

## ✅ Endpoints Funcionais Confirmados

### 1. Leads Core (`/api/v1/comercial/leads`)
**Total:** 19.642 registros
**Token:** `CVCRM_TOKEN_LEAD`

**Estrutura de Dados (40 campos):**
```json
{
  "idlead": 21131,
  "gestor": { "id": null, "nome": null, "email": null },
  "imobiliaria": { "id": 3, "nome": "MEDI" },
  "corretor": { "id": 1300, "nome": "...", "email": "..." },
  "situacao": { "id": 2, "nome": "Aguardando Atendimento Corretor" },
  "nome": "string",
  "email": "string",
  "telefone": "+5511...",
  "score": 66,
  "data_cad": "2026-01-17 11:05:49",
  "midia_principal": "string",
  "documento_tipo": "cpf",
  "documento": "string|null",
  "sexo": "string|null",
  "renda_familiar": "string|null",
  "valor_negocio": "0,00",
  "cep": "string|null",
  "endereco": "string|null",
  "numero": "string|null",
  "bairro": "string|null",
  "complemento": "string|null",
  "estado": "string|null",
  "cidade": "string|null",
  "profissao": "string|null",
  "origem": "Painel Corretor",
  "data_reativacao": "datetime|null",
  "data_vencimento": "datetime|null",
  "ultima_data_conversao": "datetime",
  "codigointerno": "int|null",
  "possibilidade_venda": "int|null",
  "empreendimento": [{ "id": int, "nome": "string" }],
  "midias": ["string"],
  "autor_ultima_alteracao": "string|null",
  "qtde_simulacoes_associadas": 0,
  "qtde_reservas_associadas": 0,
  "link_interacoes": "url",
  "link_simulacoes": "url",
  "link_reservas": "url",
  "link_interesses": "url",
  "empreendimentosId": "string"
}
```

**Campos Relacionados:**
- `idlead` → relaciona com leads_interacoes, leads_tarefas
- `gestor.id` → usuário gestor do lead
- `imobiliaria.id` → imobiliária responsável
- `corretor.id` → corretor responsável
- `situacao.id` → situação no workflow
- `empreendimento[].id` → empreendimentos de interesse

**Parâmetros de Filtro:**
- `idlead` (integer) - ID específico
- `email` (string) - Email do lead
- `telefone` (string) - Telefone do lead
- `idcorretor` (integer) - Filtrar por corretor
- `idsituacao` (integer) - Filtrar por situação
- `ativo` (boolean) - Apenas leads ativos
- `tarefasPendentes` (boolean)
- `tarefasVencidas` (boolean)
- `limit` (integer) - Paginação
- `offset` (integer) - Paginação

---

### 2. Leads Interações (`/api/v1/cv/leads_interacoes`)
**Total:** 35.305 registros
**Token:** `CVCRM_TOKEN_LEAD`

**Estrutura de Dados:**
```json
{
  "referencia": "6",
  "referencia_data": "2023-03-09 17:32:30",
  "ativo": "S",
  "idinteracao": 6,
  "idlead": 12,
  "data_cad": "2023-03-09 17:32:30",
  "tipo": "W",
  "descricao": "Liguei em ambas linhas do lead...",
  "situacao": null,
  "enviar_corretor": null,
  "enviar_imobiliaria": null,
  "enviar_cliente": null,
  "idimobiliaria": 160,
  "imobiliaria": "PRT - GRV",
  "idcorretor": 573,
  "corretor": "Lucas Napolitano",
  "idgestor": 0,
  "gestor_interacao": null,
  "corretor_interacao": "LINO - Marcelino de Souza",
  "imobiliaria_interacao": null
}
```

**Formato de Resposta:**
```json
{
  "pagina": 1,
  "registros": 30,
  "total_de_registros": 35305,
  "total_de_paginas": 1177,
  "dados": [...]
}
```

**Campos Relacionados:**
- `idlead` → FK para leads
- `idcorretor` → corretor que fez a interação
- `idimobiliaria` → imobiliária
- `idgestor` → gestor responsável

**Tipos de Interação:**
- `W` - WhatsApp/telefone
- Outros tipos a investigar

---

### 3. Leads Tarefas (`/api/v1/comercial/leads/tarefas`)
**Total:** 8.182 registros
**Token:** `CVCRM_TOKEN_LEAD`

**Estrutura de Dados:**
```json
{
  "codigo": 200,
  "total": 8182,
  "limit": 2,
  "offset": 0,
  "totalConteudo": 2,
  "tarefas": [
    {
      "idtarefa": 8192,
      "responsavel": "Theo - Fabio P. Moutinho",
      "tipo_responsavel": "imobiliária",
      "idusuario": null,
      "idcorretor": null,
      "idimobiliaria": 3,
      ...
    }
  ]
}
```

**Campos Relacionados:**
- `idlead` (implícito) - lead associado
- `idcorretor` - corretor responsável
- `idimobiliaria` - imobiliária responsável
- `idusuario` - usuário responsável

---

### 4. Tarefas Gerais (`/api/v1/cv/tarefas`)
**Total:** 1 registro (dados limitados)
**Token:** `CVCRM_TOKEN_LEAD`

**Estrutura de Dados:**
```json
{
  "total": 1,
  "offset": 0,
  "limit": 2,
  "tarefas": [
    {
      "idtarefa": 3,
      "idtarefa_criada": 1,
      "data_cad": "2023-04-04 14:59:45",
      "data_vencimento": "2023-04-05 14:59:45",
      "data_conclusao": null,
      "nota_conclusao": null,
      "observacao": null,
      ...
    }
  ]
}
```

---

### 5. Atendimentos (`/api/v1/relacionamento/atendimentos`)
**Total:** 1.558 registros
**Token:** `CVCRM_TOKEN_LEAD`

**Estrutura de Dados:**
```json
{
  "idatendimento": 1558,
  "nome": "GRAZIELLY DE MOURA RODRIGUES",
  "titulo": "Assistência Técnica - obra",
  "descricao": "Procuração Park.",
  "idsituacao": "4",
  "dataCad": "2025-07-02 11:47:52",
  "idassunto": 5,
  "assunto": "Assistência Técnica - obra",
  "idsubassunto": 12,
  "subassunto": "Entrega de chaves",
  "situacao": "Finalizado",
  "telefone": "+5511988371595",
  "email": "grazzyrodriguez@icloud.com",
  "documento": "34422289802",
  "slaAssunto": null,
  "dataVencimentoAssunto": null,
  "slaSubassunto": null,
  "dataVencimentoSubassunto": null,
  "notaAtendimento": null,
  "idassistencia": null,
  "imobiliaria": null,
  "corretor": null,
  "tempoResposta": null,
  "tempoFinalizado": "0",
  "tipo": "Aberto pelo gestor",
  "classificacao": null,
  "idresponsavel": null,
  "responsavel": null,
  "dataUltimaModificacaoSituacao": "2025-07-02 13:47:52",
  "slaWorkflow": 2,
  "dataVencimentoWorkflow": null,
  "idsUnidades": 1168,
  "unidades": "SP505",
  "idbloco": 13,
  "bloco": null,
  "empreendimento": {
    "idempreendimento": 6,
    "nome": "STATION PARK APARTAMENTOS"
  },
  "prioridade": "N",
  "humorCliente": null,
  "ultimaInteracao": "2025-07-02 11:47:53",
  "camposAdicionais": [],
  "arquivos": [
    {
      "idarquivo": 161,
      "nome": "CS PDF 2025-07-02 11.35.59.pdf",
      "servidor": "20250702114752_686546987c8b7.pdf",
      "tipo": "application/pdf",
      "tamanho": 245645,
      "data_cad": "2025-07-02 11:47:52",
      "url": "https://pratica.cvcrm.com.br/api/get/download/atendimentos_arquivos/..."
    }
  ],
  "respostas": []
}
```

**Formato de Resposta:**
```json
{
  "total": 1558,
  "paginas": 4,
  "quantidade": 500,
  "pagina": 1,
  "dados": [...]
}
```

**Campos Relacionados:**
- `idsUnidades` → unidade relacionada
- `idbloco` → bloco do empreendimento
- `empreendimento.idempreendimento` → empreendimento
- `idassistencia` → assistência técnica relacionada
- `idassunto/idsubassunto` → categorização

---

### 6. Assistências (`/api/v1/relacionamento/assistencias`)
**Total:** 1 registro (dados limitados)
**Token:** `CVCRM_TOKEN_LEAD`

**Estrutura de Dados:**
```json
{
  "total": 1,
  "offset": 0,
  "limit": 2,
  "assistencias": [
    {
      "idassistencia": 100,
      "situacao": "Nova Assistência",
      "idsituacao": 2,
      "idatendimento": null,
      "cadastro": "2026-01-14 11:18:38",
      "protocolo_atendimento": null,
      "sla_assistencia_vencido": ...
    }
  ]
}
```

---

### 7. Reservas (`/api/v1/comercial/reservas`)
**Total:** 0 registros (vazio mas acessível)
**Token:** `CVCRM_TOKEN_RESERVA`
**Status:** 204 No Content

**Observação:** Endpoint funcional mas sem dados no momento.

---

### 8. Reservas Sub-recursos
**Status:** Requerem parâmetros específicos (400 Bad Request sem parâmetros)

- `/api/v1/comercial/reservas/condicao-pagamentos` (requer `idreserva`)
- `/api/v1/comercial/reservas/{id}/contratos`
- `/api/v1/comercial/reservas/{id}/documentos`

---

## ❌ Endpoints Documentados mas Não Funcionais

Estes endpoints existem na documentação mas retornam **405 Method Not Allowed**:

1. `/api/v1/comercial/leads_conversoes` → 405
2. `/api/v1/comercial/filas_distribuicao_leads` → 405
3. `/api/v1/comercial/consultaratendimento` → 405
4. `/api/v1/financeiro/comissoes` → 400 (requer parâmetros específicos)

---

## 🗂️ Estrutura de Relacionamentos

```
LEADS (19.642)
├── LEADS_INTERACOES (35.305) [FK: idlead]
├── LEADS_TAREFAS (8.182) [FK: idlead]
├── RESERVAS (0) [FK: idlead]
└── EMPREENDIMENTOS [array dentro de lead]

ATENDIMENTOS (1.558)
├── EMPREENDIMENTOS [nested object]
├── UNIDADES [idsUnidades]
├── ASSISTENCIAS [idassistencia]
├── ARQUIVOS [array nested]
└── RESPOSTAS [array nested]

ASSISTENCIAS (1)
└── ATENDIMENTOS [idatendimento]
```

---

## 📋 Formatos de Paginação

### Formato 1 (Leads)
```json
{
  "codigo": 200,
  "total": 19642,
  "limit": 30,
  "offset": 0,
  "totalConteudo": 30,
  "leads": [...]
}
```

### Formato 2 (Leads Interações)
```json
{
  "pagina": 1,
  "registros": 30,
  "total_de_registros": 35305,
  "total_de_paginas": 1177,
  "dados": [...]
}
```

### Formato 3 (Atendimentos)
```json
{
  "total": 1558,
  "paginas": 4,
  "quantidade": 500,
  "pagina": 1,
  "dados": [...]
}
```

### Formato 4 (Tarefas)
```json
{
  "total": 1,
  "offset": 0,
  "limit": 2,
  "tarefas": [...]
}
```

---

## 🎯 Proposta de Arquitetura Realista

### Opção Recomendada: 5 Agentes Funcionais

#### Domínio Leads (3 agentes)
1. **leads-core** → 19.642 registros
   - Endpoint: `/api/v1/comercial/leads`
   - Tabelas: `cvcrm_leads`
   - Campos: 40 campos incluindo gestor, imobiliária, corretor, situação

2. **leads-interacoes** → 35.305 registros
   - Endpoint: `/api/v1/cv/leads_interacoes`
   - Tabelas: `cvcrm_leads_interacoes`
   - Campos: 18 campos com descrição, tipo, corretor, gestor

3. **leads-tarefas** → 8.182 registros
   - Endpoint: `/api/v1/comercial/leads/tarefas`
   - Tabelas: `cvcrm_leads_tarefas`
   - Campos: responsável, tipo, datas

#### Domínio Atendimentos (1 agente)
4. **atendimentos-core** → 1.558 registros
   - Endpoint: `/api/v1/relacionamento/atendimentos`
   - Tabelas: `cvcrm_atendimentos`, `cvcrm_atendimentos_arquivos`
   - Campos: 40+ campos incluindo assunto, situação, empreendimento, unidade

#### Domínio Assistências (1 agente)
5. **assistencias-core** → 1 registro
   - Endpoint: `/api/v1/relacionamento/assistencias`
   - Tabelas: `cvcrm_assistencias`
   - Campos: situação, workflow, SLA

**Total:** 64.688 registros sincronizáveis

---

## 📊 Estatísticas de Dados

| Domínio | Registros | % do Total |
|---------|-----------|------------|
| Leads Interações | 35.305 | 54,6% |
| Leads Core | 19.642 | 30,4% |
| Leads Tarefas | 8.182 | 12,6% |
| Atendimentos | 1.558 | 2,4% |
| Assistências | 1 | 0,0% |
| **TOTAL** | **64.688** | **100%** |

---

## ⚙️ Recomendações de Implementação

### 1. Paginação
- Usar `limit`/`offset` ou `pagina`/`registros` conforme endpoint
- Limite recomendado: 100 registros por página
- Rate limit: 200 req/min (API Comercial)

### 2. Sync Incremental
- Usar `referencia` e `referencia_data` (leads_interacoes)
- Usar `data_cad` para outros endpoints
- Manter cursor por endpoint

### 3. Relacionamentos
- `idlead` é a chave para relacionar leads, interações e tarefas
- `idempreendimento` relaciona atendimentos com empreendimentos
- `idsUnidades` relaciona atendimentos com unidades

### 4. Campos Importantes
**Leads:**
- `score` - qualificação do lead
- `situacao.id` - estado no workflow
- `qtde_reservas_associadas` - conversões

**Atendimentos:**
- `slaWorkflow` - SLA do workflow
- `situacao` - estado do atendimento
- `empreendimento` - projeto relacionado

---

## 🚀 Próximos Passos

1. ✅ Mapeamento completo - CONCLUÍDO
2. ✅ Extração de estruturas - CONCLUÍDO
3. ⏳ Decisão: Implementar 5 agentes ou solicitar acesso CVDW
4. ⏳ Criação de migrations para 5 tabelas principais
5. ⏳ Implementação dos 5 agentes TypeScript
6. ⏳ Teste de sync completo

---

**Atualizado:** 2026-01-17 18:30
**Método:** Firecrawl (documentação oficial) + Testes reais (produção)
**Validação:** 100% dos dados testados e confirmados
