# Plano de Melhorias — Prática Incorporadora

## Prioridade ALTA (impacto direto no corretor)

### 1. Empreendimentos — página completa
- [x] Sincronizar dados do Órulo (preço, estoque, imagens, tipologias, PDFs)
- [x] API retorna imagens, features, typologies, files
- [x] Fix API de unidades (aceitar UUID)
- [ ] Cards mostrando imagem do Órulo (verificar se `<Image>` renderiza URL externa)
- [ ] Página de detalhe: usar tipologias do Órulo como "unidades"
- [ ] Página de detalhe: galeria de imagens (fachada, plantas, lazer)
- [ ] Página de detalhe: lista de features/diferenciais (Academia, Piscina, etc.)
- [ ] Página de detalhe: PDFs disponíveis (tabela de preço, apresentação)
- [ ] Empreendimentos "pai" sem dados (Alta Floresta, Aura Guilhermina, etc.) — esconder ou unificar com o do Órulo

### 2. Sofia (Bot Z-API) — assistente proativa
- [x] Nova Sofia reescrita do zero (natural, sem botões)
- [x] Memória Redis 24h
- [x] Contexto do corretor (leads, vendas, empreendimentos)
- [x] Split de mensagens (simula digitação)
- [ ] Responder sobre empreendimentos com dados do Órulo (preço, estoque, localização)
- [ ] Enviar imagem do empreendimento quando corretor pedir
- [ ] Enviar PDF de tabela de preço
- [ ] Responder "quais empreendimentos têm estoque?" com dados reais
- [ ] Responder "qual o mais barato?" com ranking real
- [ ] Memória de longo prazo (preferências do corretor)

### 3. CataVendas — feature principal
- [x] Engine construído (lib/catavendas/)
- [x] APIs (scan, respond)
- [x] Página /recupera-leads rebrandada
- [ ] Scan automático quando corretor conecta WhatsApp
- [ ] Mostrar conversas reais do WhatsApp do corretor com análise IA
- [ ] Sugestão de mensagem de reativação por lead
- [ ] Botão "enviar via WhatsApp" funcional (Evolution API)
- [ ] Indicadores: quantos leads recuperáveis, valor estimado

### 4. Dashboard
- [x] Construído (/dashboard)
- [ ] Métricas reais (não mockadas) — verificar se estão puxando do banco
- [ ] Card CataVendas como hero (motivo de conectar WhatsApp)
- [ ] Empreendimentos em destaque com imagens do Órulo

## Prioridade MÉDIA (UX e qualidade)

### 5. Meus Clientes
- [x] Botão "Novo Cliente" com jornada step-by-step
- [ ] Testar fluxo completo de cadastro
- [ ] Busca e filtros funcionais
- [ ] Detalhe do cliente com histórico de interações

### 6. Chat
- [x] Responsivo (mobile: lista ↔ conversa com back button)
- [x] Fix mensagens antigas (filtro 30 dias)
- [ ] Marcar como "em breve" se não for prioridade
- [ ] Integrar com Evolution API real do corretor

### 7. Pipeline
- [x] Kanban construído
- [x] Responsivo
- [x] Redirect /admin/pipeline → /corretor/pipeline
- [ ] Drag-and-drop funcional no mobile (touch events)
- [ ] Sync com dados reais do CRM

### 8. Relatórios
- [x] Dados reais do banco (não mockados)
- [ ] Gráficos funcionais (verificar se charts renderizam)
- [ ] Filtro por período funcional
- [ ] Comissão calculada corretamente

### 9. Unificação de rotas
- [ ] /dashboard (não /admin/dashboard ou /corretor/dashboard)
- [ ] /pipeline (não /corretor/pipeline)
- [ ] /imoveis (não /corretor/imoveis)
- [ ] /clientes (não /corretor/clientes)
- [ ] /relatorios (não /corretor/relatorios)
- [ ] Middleware de role detection (admin vê tudo, corretor vê o seu)

## Prioridade BAIXA (segurança e infra)

### 10. Segurança (Audit)
- [ ] 8 APIs sem autenticação — adicionar requireWorkspaceContext
- [ ] EVOLUTION_WEBHOOK_SECRET — configurar
- [ ] Rate limiting nas APIs públicas
- [ ] Sanitização de inputs

### 11. Dados
- [ ] 98 LIDs sem phone mapping — resolver quando possível
- [ ] Empreendimentos duplicados no banco (Giardino x2, Mirante x2) — unificar
- [ ] Sync periódico com Órulo (cron job)

### 12. App Nativo (futuro)
- [ ] Capacitor setup
- [ ] Build Android (.apk)
- [ ] Build iOS (requer Mac ou cloud)
- [ ] Publicar nas lojas

---
Última atualização: 2026-01-29
