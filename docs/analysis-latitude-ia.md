# Análise do Sistema de IA do LatitudeCRM

Este documento resume os insights extraídos do sistema de IA do LatitudeCRM (n8n) para aplicação no sistema Prática.

## Arquitetura Geral

### Workflows Principais

| Workflow | Função |
|----------|--------|
| **Latitude IA** | Agente principal de conversação (149 nodes) |
| **Salva Leads - Conversação** | Recuperação de leads inativos (60 nodes) |
| **Salva Leads - Inicialização** | Identificação de leads para recuperação |
| **Salva Leads - Processa atendimentos** | Processamento em lote |
| **Get Imoveis API** | Tool para busca de imóveis via API |
| **Get Imoveis Elastic** | Tool para busca via Elasticsearch |
| **cadastra_visita** | Tool para agendar visitas |
| **Agent Worker** | Worker paralelo para processamento |

### Stack Tecnológica

- **Orquestração**: n8n (workflow automation)
- **LLM**: OpenAI (GPT-4)
- **RAG**: Supabase Vector Store + OpenAI Embeddings
- **Cache/Estado**: Redis
- **Banco de Dados**: PostgreSQL
- **WhatsApp**: Evolution API
- **Busca**: Elasticsearch

## Tools do Agente

O agente possui as seguintes tools disponíveis:

### 1. `get_imoveis_api`
- Consulta imóveis via API REST
- Aceita filtros de características
- Variação de ±20% nos filtros numéricos

### 2. `get_imoveis_elastic`
- Consulta imóveis no Elasticsearch
- Fallback quando a API não encontra resultados
- Queries bool complexas

### 3. `post_visita`
- Agenda visitas em imóveis
- Recebe: informações do imóvel, data e hora
- Integração com CRM

### 4. `encaminha_para_corretor`
- Transfere atendimento para corretor humano
- Acionado após 10 iterações ou solicitação do lead

### 5. `notify_client`
- Envia indicador "digitando..." no WhatsApp
- Melhora UX durante processamento

### 6. `Think`
- Tool de raciocínio interno
- Permite reflexão antes de responder

### 7. `get_conhecimento_rag`
- Busca conhecimento na base vetorial
- Documentos sobre imóveis, empresa, políticas

## Prompt do Agente Salva Leads

### Estrutura do Prompt

```
1. REGRAS CRÍTICAS DE COMPREENSÃO
   - Ler última mensagem com atenção total
   - Entender intenção atual
   - Verificar contexto
   - Identificar sinais de encerramento

2. INTERPRETAÇÃO DE MENSAGENS
   - Mensagens com asterisco = correções
   - Mensagens curtas = interpretar com contexto
   - "pausando/depois/mais tarde" = não quer continuar

3. REGRAS DE ESTILO
   - Falar como humano real
   - ~70 caracteres por mensagem
   - Máximo 200 caracteres
   - Máximo 2 frases (preferencialmente 1)
   - Zero emojis

4. AÇÃO DIRETA
   - NUNCA pedir permissão para enviar
   - Ser proativo e direto
   - "Vou consultar" e consulta (não pergunta)

5. CONTEXTO DINÂMICO
   - Msg do Lead (variável)
   - Histórico da Conversa (variável)
   - Nome do Lead (WhatsApp pushName)
   - Dados do Agente/Corretor
   - Dados da Empresa

6. FERRAMENTAS (descrição em YAML)

7. CHECKLIST FINAL
   - [ ] Li a última mensagem?
   - [ ] Identifiquei a intenção?
   - [ ] Estou avançando a conversa?
   - [ ] Resposta é curta e natural?
   - [ ] Respeitando sinais de pausa?
   - [ ] Sendo direto (sem pedir permissão)?
```

### Exemplos de Respostas (Do vs Don't)

| ❌ Errado | ✅ Certo |
|-----------|----------|
| "Tudo sim! Seguimos com a proposta? Prefere 1) ligação, 2) proposta, 3) retomar." | "Tranquilo! Me avisa quando puder retomar." |
| "Posso te enviar 2 opções hoje?" | "Te envio 2 casas nos Jardins, 4 suítes com piscina." |
| "Perfeito, fico no aguardo; assim que chegar te envio as opções." | "Vou buscar e te envio hoje." |

## Fluxo de Processamento

```
1. Webhook Evolution API → Recebe mensagem WhatsApp
2. SetFieldsBasic → Extrai dados da mensagem
3. Redis → Verifica/atualiza estado da conversa
4. If Audio → Transcreve se for áudio
5. Consulta Agente → Busca dados do corretor/agente
6. OpenAI Agent → Processa com tools disponíveis
7. Redis → Salva histórico
8. Evolution API → Envia resposta
```

## Mecanismo de Debounce

Similar ao Prática:
1. Mensagens rápidas acumuladas no Redis
2. Timer de espera antes de processar
3. Processamento em batch após debounce

## Lições Aplicáveis ao Prática

### 1. Prompt Engineering
- Prompt bem estruturado com seções claras
- Checklist de verificação antes de responder
- Exemplos concretos de Do/Don't
- Limite rígido de caracteres (70-200)

### 2. Tools
- Separar busca de imóveis em API + Elastic (fallback)
- Tool de "pensar" antes de responder
- Tool de notificação de presença (digitando...)

### 3. Contexto
- Passar histórico formatado
- Incluir dados do corretor/empresa
- Variáveis dinâmicas no prompt

### 4. UX
- Respostas curtas e diretas
- Sem emojis
- Proatividade (não pedir permissão)
- Encerrar graciosamente quando lead não quer continuar

### 5. Arquitetura
- Usar Redis para estado da conversa
- Workflows separados para cada tool
- Worker paralelo para processamento pesado

## Comparação Detalhada: Latitude vs Prática

### Prática JÁ TEM implementado:

| Feature | Latitude | Prática | Status |
|---------|----------|---------|--------|
| Orquestração | n8n | Next.js API Routes | OK |
| Estado conversas | Redis | PostgreSQL | OK (pode migrar p/ Redis) |
| Debounce | Redis + n8n | PostgreSQL | OK |
| Persona IA | "Agente genérico" | "Luna" (personalizada) | **Prática melhor** |
| Perfil psicológico | Não tem | Sim (psychology/) | **Prática melhor** |
| Tool: get_imoveis | API + Elastic | API (CVCRM) | OK |
| Tool: post_visita | Sim | Sim | OK |
| Tool: notify_client | Sim | Sim | OK |
| Tool: transfer_to_corretor | encaminha_para_corretor | transfer_to_corretor | OK |
| Prompt estruturado | Sim | Sim | OK |
| Exemplos BOM/RUIM | Sim | Sim | OK |

### O que Latitude tem que Prática NÃO tem:

| Feature | Descrição | Prioridade |
|---------|-----------|------------|
| **Elasticsearch fallback** | Busca de imóveis em Elastic quando API não encontra | Média |
| **RAG (get_conhecimento)** | Vector store para conhecimento da empresa | Alta |
| **Tool Think** | Raciocínio interno antes de responder | Baixa |
| **Checklist no prompt** | Verificação antes de responder | Média |
| **Limite de caracteres** | 70-200 chars por mensagem | Alta |
| **Redis para estado** | Mais performático que PostgreSQL | Média |

### O que Prática tem que Latitude NÃO tem:

| Feature | Descrição |
|---------|-----------|
| **Perfil psicológico** | Análise de motivação, emoção, estratégia de conexão |
| **Persona humanizada** | Luna com personalidade definida |
| **Estratégias de reativação** | Diferentes abordagens por perfil |
| **Integração CV CRM** | Acesso direto aos dados do CRM |

## Recomendações de Melhoria para Prática

### Alta Prioridade

1. **Adicionar limite de caracteres no prompt**
   - Alvo: ~70 caracteres
   - Máximo: 200 caracteres
   - Máximo 2 frases por mensagem

2. **Adicionar RAG para conhecimento**
   - Documentos sobre empreendimentos
   - Políticas da empresa
   - FAQs comuns

3. **Checklist no prompt**
   ```
   ANTES DE RESPONDER, VERIFIQUE:
   - [ ] Li a última mensagem do lead?
   - [ ] Identifiquei a intenção atual?
   - [ ] Estou avançando a conversa?
   - [ ] Resposta é curta e natural?
   - [ ] Respeitando sinais de pausa?
   ```

### Média Prioridade

4. **Migrar estado para Redis**
   - Redis já existe no Scalingo
   - Mais rápido para debounce/estado

5. **Fallback de busca**
   - Se CVCRM não encontrar, buscar em cache/snapshot

### Baixa Prioridade

6. **Tool de raciocínio (Think)**
   - Permite reflexão antes de responder
   - Útil para decisões complexas
