-- Migration 009: CP Academy - Seed Data
-- Data: 2026-01-19
-- Dados iniciais para o módulo CP Academy

-- ============================================================================
-- CATEGORIAS
-- ============================================================================

INSERT INTO academy_categories (tenant_id, slug, nome, descricao, icone, cor, ordem, ativo)
VALUES
    (1, 'plataforma', 'Plataforma', 'Como usar o app', 'monitor', '#3B82F6', 1, true),
    (1, 'empreendimentos', 'Empreendimentos', 'Conheça os imóveis', 'building2', '#10B981', 2, true),
    (1, 'tecnicas-vendas', 'Técnicas de Vendas', 'Melhore suas vendas', 'target', '#8B5CF6', 3, true);

-- ============================================================================
-- MÓDULOS
-- ============================================================================

-- Categoria: Plataforma
INSERT INTO academy_modules (tenant_id, categoria_id, slug, nome, descricao, ordem, ativo)
VALUES
    (1, (SELECT id FROM academy_categories WHERE slug = 'plataforma' AND tenant_id = 1),
     'primeiros-passos', 'Primeiros Passos', 'Aprenda a navegar e usar a plataforma', 1, true),
    (1, (SELECT id FROM academy_categories WHERE slug = 'plataforma' AND tenant_id = 1),
     'trabalhando-imoveis', 'Trabalhando com Imóveis', 'Busque, filtre e compartilhe imóveis', 2, true),
    (1, (SELECT id FROM academy_categories WHERE slug = 'plataforma' AND tenant_id = 1),
     'ferramentas', 'Ferramentas Úteis', 'Calculadoras, PDFs e integrações', 3, true);

-- Categoria: Empreendimentos
INSERT INTO academy_modules (tenant_id, categoria_id, slug, nome, descricao, ordem, ativo)
VALUES
    (1, (SELECT id FROM academy_categories WHERE slug = 'empreendimentos' AND tenant_id = 1),
     'conhecendo-empreendimentos', 'Conhecendo Nossos Empreendimentos', 'Visão geral dos imóveis disponíveis', 1, true);

-- Categoria: Técnicas de Vendas
INSERT INTO academy_modules (tenant_id, categoria_id, slug, nome, descricao, ordem, ativo)
VALUES
    (1, (SELECT id FROM academy_categories WHERE slug = 'tecnicas-vendas' AND tenant_id = 1),
     'abordagem-inicial', 'Abordagem Inicial', 'Como iniciar o contato com leads', 1, true),
    (1, (SELECT id FROM academy_categories WHERE slug = 'tecnicas-vendas' AND tenant_id = 1),
     'objecoes', 'Lidando com Objeções', 'Respostas para objeções comuns', 2, true),
    (1, (SELECT id FROM academy_categories WHERE slug = 'tecnicas-vendas' AND tenant_id = 1),
     'fechamento', 'Técnicas de Fechamento', 'Como fechar a venda', 3, true);

-- ============================================================================
-- LIÇÕES - Módulo: Primeiros Passos
-- ============================================================================

INSERT INTO academy_lessons (tenant_id, modulo_id, slug, titulo, resumo, conteudo, duracao_minutos, ordem, ativo)
VALUES
(1,
 (SELECT id FROM academy_modules WHERE slug = 'primeiros-passos' AND tenant_id = 1),
 'login-autenticacao',
 'Login e Autenticação',
 'Aprenda como acessar a plataforma usando seu número de telefone',
 '# Login e Autenticação

Bem-vindo ao CP Academy! Nesta lição, você vai aprender como acessar a plataforma de forma rápida e segura.

## Como fazer login

O acesso à plataforma é feito através do seu **número de telefone celular**. Não é necessário criar senha!

### Passo a passo:

1. Abra o aplicativo ou acesse o site
2. Digite seu número de celular com DDD (ex: 11999999999)
3. Clique em **"Enviar código"**
4. Você receberá um SMS com um código de 6 dígitos
5. Digite o código recebido
6. Pronto! Você está logado

## Dicas importantes

- O código expira em **5 minutos**, então use-o rapidamente
- Se não receber o SMS, aguarde 1 minuto e clique em "Reenviar código"
- Verifique se o número digitado está correto, incluindo o DDD
- O sistema lembra seu dispositivo por 30 dias

## Segurança

Este método de autenticação é chamado de **OTP (One-Time Password)** e é muito seguro porque:

- Cada código só pode ser usado uma vez
- O código é enviado apenas para o seu celular
- Não há senha que possa ser roubada ou esquecida

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Não recebi o SMS | Verifique se o número está correto e aguarde até 2 minutos |
| Código inválido | Solicite um novo código, o anterior pode ter expirado |
| Número não cadastrado | Entre em contato com o administrador para cadastro |

---

**Próximo passo:** Conhecer a interface da plataforma',
 5, 1, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'primeiros-passos' AND tenant_id = 1),
 'conhecendo-interface',
 'Conhecendo a Interface',
 'Entenda o layout do aplicativo e como navegar entre as seções',
 '# Conhecendo a Interface

Agora que você já sabe fazer login, vamos conhecer a interface da plataforma e entender onde encontrar cada funcionalidade.

## Menu Principal (Sidebar)

O menu lateral é sua central de navegação. Nele você encontra:

### Seções principais:

- **Dashboard** - Visão geral dos seus números e atividades recentes
- **Imóveis** - Catálogo completo de empreendimentos disponíveis
- **Leads** - Gestão dos seus contatos e oportunidades
- **Favoritos** - Imóveis que você marcou para acesso rápido
- **Academy** - Treinamentos e materiais de apoio (você está aqui!)

## Barra Superior

Na parte de cima da tela você encontra:

- **Busca rápida** - Pesquise imóveis, leads ou qualquer informação
- **Notificações** - Avisos importantes e atualizações
- **Seu perfil** - Acesse suas configurações e dados

## Cards e Listas

A plataforma usa **cards** para apresentar informações de forma visual:

- **Cards de imóveis** mostram foto, nome, preço e localização
- **Cards de leads** mostram nome, telefone e status do atendimento
- Clique em qualquer card para ver mais detalhes

## Navegação Mobile

No celular, o menu fica na parte inferior da tela para facilitar o acesso com o polegar:

1. **Home** - Voltar ao início
2. **Imóveis** - Lista de empreendimentos
3. **Leads** - Seus contatos
4. **Mais** - Outras opções

## Atalhos úteis

- **Arraste para baixo** em qualquer lista para atualizar
- **Toque longo** em um item para ver opções rápidas
- **Deslize para o lado** em cards para ações rápidas

---

**Dica:** Explore cada seção sem medo! Você não vai quebrar nada navegando pela plataforma.',
 7, 2, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'primeiros-passos' AND tenant_id = 1),
 'configurando-perfil',
 'Configurando seu Perfil',
 'Personalize suas informações e preferências na plataforma',
 '# Configurando seu Perfil

Um perfil completo passa mais confiança para seus clientes e ajuda a equipe a identificar você. Vamos configurar!

## Acessando as configurações

1. Clique no seu **avatar** no canto superior direito
2. Selecione **"Meu Perfil"** ou **"Configurações"**

## Informações básicas

Preencha os seguintes campos:

### Dados pessoais:
- **Nome completo** - Como você quer ser identificado
- **Foto de perfil** - Use uma foto profissional, de preferência com fundo neutro
- **E-mail** - Para receber notificações importantes
- **Telefone** - Já preenchido com seu número de login

### Dados profissionais:
- **CRECI** - Seu número de registro (importante para documentos)
- **Especialidade** - Tipo de imóvel que você mais trabalha
- **Região de atuação** - Bairros ou cidades onde você atende

## Foto de perfil ideal

Sua foto aparecerá em materiais compartilhados com clientes. Dicas:

- Use **fundo neutro** (branco, cinza ou azul)
- Vista-se de forma **profissional**
- **Sorria** - transmite confiança
- Evite fotos de festas, praia ou com outras pessoas

## Notificações

Configure quais avisos você quer receber:

- **Novos leads** - Quando um cliente demonstrar interesse
- **Atualizações de imóveis** - Mudanças de preço ou disponibilidade
- **Lembretes** - Follow-ups agendados
- **Novidades** - Novos empreendimentos e funcionalidades

## Preferências

- **Tema** - Claro ou escuro
- **Idioma** - Português (Brasil)
- **Formato de data** - DD/MM/AAAA

---

**Importante:** Mantenha seu CRECI sempre atualizado, pois ele aparece em propostas e documentos oficiais.',
 6, 3, true);

-- ============================================================================
-- LIÇÕES - Módulo: Trabalhando com Imóveis
-- ============================================================================

INSERT INTO academy_lessons (tenant_id, modulo_id, slug, titulo, resumo, conteudo, duracao_minutos, ordem, ativo)
VALUES
(1,
 (SELECT id FROM academy_modules WHERE slug = 'trabalhando-imoveis' AND tenant_id = 1),
 'buscando-imoveis',
 'Buscando Imóveis',
 'Aprenda a usar os filtros de busca para encontrar o imóvel ideal',
 '# Buscando Imóveis

Encontrar o imóvel certo para cada cliente é fundamental. A plataforma oferece filtros poderosos para isso.

## Acessando a busca

1. Vá em **"Imóveis"** no menu principal
2. Use a **barra de busca** no topo ou os **filtros avançados**

## Filtros disponíveis

### Por localização:
- **Cidade** - Selecione uma ou mais cidades
- **Bairro** - Filtre por bairros específicos
- **Região** - Zona sul, norte, leste, oeste, centro

### Por características:
- **Tipo** - Apartamento, casa, terreno, comercial
- **Quartos** - Número mínimo de dormitórios
- **Vagas** - Quantidade de vagas de garagem
- **Metragem** - Área útil mínima e máxima

### Por valor:
- **Preço mínimo** - Valor a partir de
- **Preço máximo** - Valor até
- **Condição** - À vista, financiamento, permuta

### Por status:
- **Lançamento** - Imóveis recém-lançados
- **Em obras** - Em construção
- **Pronto** - Para entrega imediata
- **Disponível** - Com unidades à venda

## Ordenação

Organize os resultados por:
- **Mais recentes** - Últimos cadastrados
- **Menor preço** - Do mais barato ao mais caro
- **Maior preço** - Do mais caro ao mais barato
- **Relevância** - Mais buscados

## Salvando buscas

Você fez uma combinação de filtros que usa sempre? **Salve a busca!**

1. Configure os filtros desejados
2. Clique em **"Salvar busca"**
3. Dê um nome (ex: "3 quartos Zona Sul até 500k")
4. Acesse rapidamente em **"Buscas salvas"**

## Dica de ouro

Use a busca por **palavra-chave** para encontrar características específicas:
- "varanda gourmet"
- "vista mar"
- "condomínio clube"
- "pet friendly"

---

**Exercício:** Tente buscar apartamentos de 2 quartos na sua região com preço até R$ 400.000.',
 8, 1, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'trabalhando-imoveis' AND tenant_id = 1),
 'espelho-vendas',
 'Usando o Espelho de Vendas',
 'Entenda o espelho de vendas e como verificar disponibilidade de unidades',
 '# Usando o Espelho de Vendas

O **Espelho de Vendas** é uma ferramenta essencial que mostra todas as unidades de um empreendimento e sua disponibilidade em tempo real.

## O que é o Espelho de Vendas?

É uma representação visual de todas as unidades de um empreendimento, organizadas por:
- **Torres/Blocos** - Diferentes prédios do condomínio
- **Andares** - Do térreo ao último pavimento
- **Unidades** - Apartamentos em cada andar

## Como acessar

1. Entre na página de um **empreendimento**
2. Clique na aba **"Espelho de Vendas"** ou **"Unidades"**
3. Selecione a **torre** desejada (se houver mais de uma)

## Entendendo as cores

Cada unidade tem uma cor que indica seu status:

| Cor | Status | Significado |
|-----|--------|-------------|
| 🟢 Verde | Disponível | Pode ser vendida |
| 🟡 Amarelo | Reservada | Em negociação |
| 🔴 Vermelho | Vendida | Já foi comercializada |
| 🔵 Azul | Bloqueada | Indisponível temporariamente |

## Informações da unidade

Ao clicar em uma unidade, você vê:

- **Número** - Identificação da unidade
- **Tipologia** - Quantidade de quartos e suítes
- **Área privativa** - Metragem em m²
- **Área total** - Incluindo áreas comuns
- **Preço** - Valor de tabela
- **Posição solar** - Nascente, poente, norte, sul
- **Vista** - O que se vê da janela

## Comparando unidades

Para ajudar seu cliente a decidir:

1. **Selecione** as unidades clicando nelas
2. Clique em **"Comparar selecionadas"**
3. Veja lado a lado as diferenças de preço, área e características

## Filtros do espelho

Encontre unidades específicas:
- **Por andar** - Baixo, médio ou alto
- **Por tipologia** - 1, 2, 3 ou 4 quartos
- **Por posição** - Frente, fundos, lateral
- **Por status** - Apenas disponíveis

## Atualizações em tempo real

O espelho é atualizado automaticamente. Se uma unidade acabou de ser vendida, você verá a mudança imediatamente.

---

**Dica:** Antes de apresentar opções ao cliente, sempre confira o espelho para garantir que a unidade ainda está disponível!',
 10, 2, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'trabalhando-imoveis' AND tenant_id = 1),
 'compartilhando-clientes',
 'Compartilhando com Clientes',
 'Aprenda a compartilhar imóveis e materiais com seus clientes',
 '# Compartilhando com Clientes

Compartilhar informações de forma profissional faz toda a diferença. Veja como usar as ferramentas de compartilhamento.

## Opções de compartilhamento

### 1. Link do imóvel
A forma mais simples:
1. Na página do imóvel, clique em **"Compartilhar"**
2. Selecione **"Copiar link"**
3. Cole no WhatsApp, e-mail ou onde preferir

### 2. PDF personalizado
Material completo e profissional:
1. Clique em **"Gerar PDF"** na página do imóvel
2. Escolha as informações que quer incluir:
   - Fotos
   - Plantas
   - Tabela de preços
   - Localização
   - Características
3. Seu **nome e contato** aparecerão no rodapé
4. Baixe ou envie diretamente

### 3. Comparativo de imóveis
Para clientes indecisos:
1. Adicione imóveis aos **favoritos**
2. Selecione os que quer comparar
3. Clique em **"Gerar comparativo"**
4. Um PDF será criado mostrando as diferenças

## Compartilhamento via WhatsApp

O jeito mais rápido de enviar para o cliente:

1. Clique no botão do **WhatsApp** (ícone verde)
2. O aplicativo abrirá com uma mensagem pronta
3. Escolha o contato e envie

A mensagem inclui:
- Nome do empreendimento
- Preço inicial
- Link para ver mais detalhes
- Seu nome como corretor

## Boas práticas

### Antes de compartilhar:
- Verifique se as informações estão **atualizadas**
- Confirme a **disponibilidade** no espelho de vendas
- Personalize a mensagem para o cliente

### Na mensagem:
- Seja **objetivo** - destaque o que interessa ao cliente
- Mencione **por que** aquele imóvel combina com ele
- Inclua um **call-to-action** (ex: "Posso agendar uma visita?")

### Exemplo de mensagem:

> Olá João! Lembra que você procurava um 3 quartos perto do metrô?
>
> Encontrei esse lançamento que tem tudo que você pediu: 3 suítes, varanda gourmet e fica a 5 min do metrô!
>
> Dá uma olhada: [link]
>
> Quer agendar uma visita no decorado esse fim de semana?

---

**Lembre-se:** Um compartilhamento bem feito é o primeiro passo para uma visita, e uma visita bem feita é o primeiro passo para uma venda!',
 8, 3, true);

-- ============================================================================
-- LIÇÕES - Módulo: Ferramentas Úteis
-- ============================================================================

INSERT INTO academy_lessons (tenant_id, modulo_id, slug, titulo, resumo, conteudo, duracao_minutos, ordem, ativo)
VALUES
(1,
 (SELECT id FROM academy_modules WHERE slug = 'ferramentas' AND tenant_id = 1),
 'calculadora-financiamento',
 'Calculadora de Financiamento',
 'Use a calculadora para simular financiamentos com seus clientes',
 '# Calculadora de Financiamento

A calculadora de financiamento ajuda você a mostrar ao cliente quanto ele vai pagar por mês. Muito útil para tirar dúvidas na hora!

## Acessando a calculadora

1. Na página do imóvel, clique em **"Simular financiamento"**
2. Ou acesse **"Ferramentas" > "Calculadora"** no menu

## Dados necessários

Para uma simulação precisa, você precisa:

### Do imóvel:
- **Valor total** - Preço de venda
- **Entrada** - Quanto o cliente vai pagar de entrada

### Do cliente:
- **Renda mensal** - Para calcular se as parcelas cabem no bolso
- **Prazo desejado** - Em quantos meses quer pagar (até 420 meses)
- **Sistema** - SAC ou Price

## Sistemas de amortização

### SAC (Sistema de Amortização Constante)
- Parcelas começam **maiores** e vão **diminuindo**
- Paga **menos juros** no total
- Ideal para quem pode pagar mais no início

### Price (Tabela Price)
- Parcelas **fixas** do início ao fim
- Mais fácil de planejar
- Paga mais juros no total

## Entendendo o resultado

A simulação mostra:

| Campo | Significado |
|-------|-------------|
| Valor financiado | Total menos a entrada |
| Taxa de juros | Percentual anual estimado |
| Primeira parcela | Valor da 1ª prestação |
| Última parcela | Valor da última prestação (SAC) |
| Total pago | Soma de todas as parcelas |
| Renda necessária | Mínimo para aprovar o financiamento |

## Regra dos 30%

Os bancos geralmente aprovam financiamentos onde a parcela é de **no máximo 30%** da renda familiar.

**Exemplo:**
- Renda familiar: R$ 10.000
- Parcela máxima: R$ 3.000

A calculadora já considera essa regra e avisa se o cliente pode ter dificuldade de aprovação.

## Dica de uso

1. Faça a simulação **junto com o cliente**
2. Mostre diferentes cenários (mais entrada = menos parcela)
3. Salve a simulação em PDF para enviar depois

---

**Atenção:** As simulações são estimativas. Os valores finais dependem da análise de crédito do banco.',
 7, 1, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'ferramentas' AND tenant_id = 1),
 'gerando-materiais',
 'Gerando Materiais de Venda',
 'Crie PDFs, apresentações e outros materiais para seus clientes',
 '# Gerando Materiais de Venda

Materiais bem apresentados vendem mais. Aprenda a gerar documentos profissionais para impressionar seus clientes.

## Tipos de materiais disponíveis

### 1. Ficha do Imóvel
Documento completo com:
- Todas as fotos
- Plantas baixas
- Características e diferenciais
- Localização e mapa
- Tabela de preços

### 2. Book do Empreendimento
Apresentação premium:
- Capa personalizada
- Perspectivas artísticas
- Áreas de lazer
- Memorial descritivo
- Informações da construtora

### 3. Comparativo
Análise lado a lado:
- Até 4 imóveis
- Comparação de preços
- Diferenças de metragem
- Proximidade de pontos de interesse

### 4. Proposta Comercial
Para formalizar a negociação:
- Dados do cliente
- Unidade escolhida
- Condições de pagamento
- Validade da proposta

## Como gerar

1. Acesse a página do imóvel
2. Clique em **"Materiais"** ou **"Gerar PDF"**
3. Escolha o tipo de documento
4. Selecione as informações que quer incluir
5. Clique em **"Gerar"**
6. Baixe ou compartilhe diretamente

## Personalização

Todos os materiais incluem automaticamente:
- **Seu nome** como corretor responsável
- **Seu telefone** e WhatsApp
- **Seu e-mail** profissional
- **Logo** da imobiliária

## Onde usar cada material

| Material | Melhor momento |
|----------|----------------|
| Ficha do Imóvel | Primeiro contato, resposta a interesse |
| Book | Apresentação presencial, clientes premium |
| Comparativo | Cliente indeciso entre opções |
| Proposta | Após visita, para formalizar interesse |

## Dicas de envio

- **WhatsApp**: Envie como documento, não como foto (melhor qualidade)
- **E-mail**: Anexe o PDF com uma mensagem personalizada
- **Presencial**: Imprima em papel de qualidade para visitas

---

**Pro tip:** Tenha sempre os books dos empreendimentos principais salvos no celular para mostrar a qualquer momento!',
 6, 2, true);

-- ============================================================================
-- LIÇÕES - Módulo: Conhecendo Empreendimentos
-- ============================================================================

INSERT INTO academy_lessons (tenant_id, modulo_id, slug, titulo, resumo, conteudo, duracao_minutos, ordem, ativo)
VALUES
(1,
 (SELECT id FROM academy_modules WHERE slug = 'conhecendo-empreendimentos' AND tenant_id = 1),
 'visao-geral-portfolio',
 'Visão Geral do Portfólio',
 'Conheça os tipos de empreendimentos disponíveis na plataforma',
 '# Visão Geral do Portfólio

Conhecer bem os empreendimentos que você vende é fundamental para fazer bons matchs entre clientes e imóveis.

## Tipos de empreendimentos

### Residenciais
O carro-chefe do mercado imobiliário:

**Apartamentos:**
- Studios e lofts (25-45m²)
- 1 dormitório (35-55m²)
- 2 dormitórios (55-85m²)
- 3 dormitórios (85-150m²)
- 4+ dormitórios / Coberturas (150m²+)

**Casas em condomínio:**
- Casas térreas
- Sobrados
- Casas com piscina

### Comerciais
Para investidores e empresários:
- Salas comerciais
- Lojas
- Conjuntos corporativos
- Galpões logísticos

### Loteamentos
Terrenos prontos para construir:
- Lotes residenciais
- Lotes comerciais
- Chácaras e sítios

## Como apresentar cada tipo

### Para moradia própria:
Foque em:
- Localização e acessos
- Infraestrutura do bairro (escolas, mercados, hospitais)
- Áreas de lazer do condomínio
- Qualidade de acabamento

### Para investimento:
Destaque:
- Potencial de valorização
- Rentabilidade esperada (aluguel)
- Liquidez da região
- Histórico da construtora

## Estágio das obras

### Lançamento
- Melhores preços
- Escolha das melhores unidades
- Prazo maior para pagamento da entrada
- Risco de atraso

### Em obras
- Preço intermediário
- Já é possível ver a obra evoluindo
- Prazo menor para entrega
- Menos unidades disponíveis

### Pronto para morar
- Entrega imediata
- Decorado disponível para visita
- Preço de tabela cheio
- Ideal para quem tem urgência

## Conhecendo na prática

Para cada empreendimento novo:

1. **Leia o material** completo (book, memorial descritivo)
2. **Visite o decorado** ou stand de vendas
3. **Conheça a região** - ande pelo bairro
4. **Converse com o gerente** para entender diferenciais
5. **Faça perguntas** - tire todas as suas dúvidas

---

**Lembre-se:** Você só vende bem aquilo que conhece bem!',
 8, 1, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'conhecendo-empreendimentos' AND tenant_id = 1),
 'argumentos-venda',
 'Argumentos de Venda por Empreendimento',
 'Aprenda os principais argumentos para cada tipo de imóvel',
 '# Argumentos de Venda por Empreendimento

Cada empreendimento tem seus pontos fortes. Saber destacá-los faz toda a diferença na venda.

## Estrutura de um bom argumento

Todo argumento de venda deve ter:

1. **Característica** - O que o imóvel tem
2. **Benefício** - Como isso melhora a vida do cliente
3. **Prova** - Evidência de que é verdade

**Exemplo:**
> O apartamento tem **varanda gourmet com churrasqueira** (característica), assim você pode **receber amigos e família sem sair de casa** (benefício). Veja aqui a **foto do decorado** mostrando como fica (prova).

## Argumentos por perfil de cliente

### Jovens solteiros / Casais sem filhos
- Localização próxima a metrô e comércio
- Áreas de lazer modernas (coworking, bicicletário)
- Apartamentos compactos e funcionais
- Facilidade de locação futura (investimento)

### Famílias com crianças
- Playground e áreas kids
- Apartamentos com 2-3 quartos
- Proximidade de escolas
- Segurança 24h do condomínio
- Bairros tranquilos

### Investidores
- Taxa de retorno estimada
- Potencial de valorização da região
- Obras de infraestrutura próximas
- Demanda por aluguel na região

### Terceira idade
- Acessibilidade (sem escadas, elevador)
- Proximidade de hospitais e farmácias
- Áreas verdes e tranquilidade
- Condomínio com portaria 24h

## Objeções comuns e respostas

### "Está muito caro"
> Entendo sua preocupação. Vamos analisar o valor por m²? Comparado com outros empreendimentos da região, este está [X]% abaixo/na média. Além disso, a qualidade de acabamento justifica o investimento.

### "Preciso pensar"
> Claro, é uma decisão importante! Posso te enviar um comparativo por escrito para você analisar com calma? Só lembro que restam poucas unidades nessa condição.

### "O apartamento é pequeno"
> Hoje os projetos são muito bem planejados. Veja como os ambientes são integrados e funcionais. Quer que eu te mostre a planta com a mobília? Você vai se surpreender!

## Criando seu repertório

Para cada empreendimento que você trabalha, anote:

- 3 principais diferenciais
- Para qual perfil de cliente é ideal
- Respostas para as 3 objeções mais comuns
- Uma história de sucesso (cliente que comprou e está feliz)

---

**Exercício:** Escolha um empreendimento e escreva 3 argumentos usando a estrutura Característica + Benefício + Prova.',
 10, 2, true);

-- ============================================================================
-- LIÇÕES - Módulo: Abordagem Inicial
-- ============================================================================

INSERT INTO academy_lessons (tenant_id, modulo_id, slug, titulo, resumo, conteudo, duracao_minutos, ordem, ativo)
VALUES
(1,
 (SELECT id FROM academy_modules WHERE slug = 'abordagem-inicial' AND tenant_id = 1),
 'primeiro-contato',
 'O Primeiro Contato',
 'Como iniciar a conversa com um novo lead de forma eficiente',
 '# O Primeiro Contato

Os primeiros segundos de uma conversa definem o tom de todo o relacionamento. Aprenda a causar uma ótima primeira impressão.

## A regra de ouro

**Responda rápido!** Estudos mostram que:
- Responder em até **5 minutos** aumenta 10x a chance de conversão
- Após **30 minutos**, o lead já pode ter falado com outro corretor
- Após **24 horas**, o interesse esfria significativamente

## Canais de contato

### WhatsApp (mais comum)
- Seja direto e profissional
- Use áudios curtos (até 1 minuto)
- Evite mensagens muito longas
- Responda no mesmo dia, preferencialmente em minutos

### Telefone
- Identifique-se claramente
- Pergunte se é um bom momento para conversar
- Seja objetivo e amigável
- Se não atender, deixe mensagem de voz OU mande WhatsApp

### E-mail
- Use para informações mais detalhadas
- Sempre inclua seu telefone para contato direto
- Responda em até 24 horas úteis

## Script de primeiro contato (WhatsApp)

### Opção 1: Lead que pediu informações
> Olá [Nome]! Tudo bem? 😊
>
> Sou [Seu nome], corretor da [Empresa].
>
> Vi que você se interessou pelo [Empreendimento]. Excelente escolha!
>
> Posso te contar mais sobre o projeto? Qual o melhor horário para conversarmos?

### Opção 2: Lead de anúncio/portal
> Olá [Nome]! Aqui é o [Seu nome] da [Empresa].
>
> Recebi seu contato sobre imóveis na região de [Local].
>
> Para eu te ajudar melhor, pode me contar o que você está buscando? Compra para morar ou investir?

## O que fazer nos primeiros minutos

1. **Agradeça** o contato
2. **Apresente-se** brevemente
3. **Confirme** o interesse demonstrado
4. **Faça uma pergunta** para engajar

## O que NÃO fazer

- ❌ Mandar tabela de preços sem contexto
- ❌ Fazer muitas perguntas de uma vez
- ❌ Usar mensagens copiadas e genéricas demais
- ❌ Demorar para responder
- ❌ Ser invasivo ou insistente

---

**Lembre-se:** O primeiro contato é para criar conexão, não para vender. A venda vem depois!',
 8, 1, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'abordagem-inicial' AND tenant_id = 1),
 'qualificacao-leads',
 'Qualificação de Leads',
 'Aprenda a identificar leads quentes e priorizar seu tempo',
 '# Qualificação de Leads

Nem todo lead vai comprar. Saber identificar os mais promissores economiza seu tempo e aumenta suas vendas.

## O que é qualificar um lead?

É o processo de descobrir:
- Se o lead **pode** comprar (tem condições financeiras)
- Se o lead **quer** comprar (tem interesse real)
- **Quando** ele pretende comprar (urgência)

## Perguntas essenciais

### Sobre o momento:
- "Você está buscando para agora ou está apenas pesquisando para o futuro?"
- "Tem algum prazo em mente para se mudar/investir?"
- "Já visitou outros imóveis?"

### Sobre a necessidade:
- "Seria para moradia ou investimento?"
- "Quantas pessoas vão morar no imóvel?"
- "Qual região você prefere?"
- "Quantos quartos você precisa?"

### Sobre as condições:
- "Pretende financiar ou pagar à vista?"
- "Já foi ao banco verificar seu crédito pré-aprovado?"
- "Tem algum imóvel para dar na troca?"

## Classificação de leads

### 🔥 Lead quente
- Tem urgência (quer comprar em até 3 meses)
- Já tem crédito aprovado ou dinheiro disponível
- Sabe o que quer (região, tamanho, preço)
- Responde rápido

**Ação:** Prioridade máxima! Agende visita imediatamente.

### 🌡️ Lead morno
- Prazo de 3-6 meses
- Ainda está organizando as finanças
- Tem uma ideia do que quer
- Responde em algumas horas

**Ação:** Mantenha contato regular, envie novidades relevantes.

### ❄️ Lead frio
- Sem prazo definido ("um dia quero comprar")
- Não sabe quanto pode pagar
- Está só "dando uma olhada"
- Demora dias para responder

**Ação:** Coloque em nutrição automática, não gaste muito tempo.

## Registrando na plataforma

Após qualificar, atualize o lead no sistema:

1. **Status** - Quente, morno ou frio
2. **Interesse** - Tipo de imóvel, região, faixa de preço
3. **Próxima ação** - Visita agendada, enviar material, ligar em X dias
4. **Notas** - Informações importantes da conversa

## A arte de perguntar

- Faça **uma pergunta por vez**
- **Escute** mais do que fala
- Use as respostas para fazer a **próxima pergunta**
- Não pareça um interrogatório - seja natural

---

**Dica:** Um lead frio hoje pode esquentar amanhã. Mantenha todos no radar, mas saiba onde focar sua energia!',
 9, 2, true);

-- ============================================================================
-- LIÇÕES - Módulo: Lidando com Objeções
-- ============================================================================

INSERT INTO academy_lessons (tenant_id, modulo_id, slug, titulo, resumo, conteudo, duracao_minutos, ordem, ativo)
VALUES
(1,
 (SELECT id FROM academy_modules WHERE slug = 'objecoes' AND tenant_id = 1),
 'entendendo-objecoes',
 'Entendendo as Objeções',
 'Por que clientes fazem objeções e como encará-las positivamente',
 '# Entendendo as Objeções

Objeções fazem parte de toda negociação. Aprenda a vê-las como oportunidades, não como obstáculos.

## O que são objeções?

Objeções são **dúvidas, preocupações ou resistências** que o cliente expressa durante a negociação.

Exemplos comuns:
- "Está muito caro"
- "Preciso pensar"
- "Vou falar com meu cônjuge"
- "O apartamento é pequeno"
- "O bairro é longe"

## Por que clientes fazem objeções?

### 1. Medo de errar
Comprar um imóvel é uma decisão grande. O cliente tem medo de se arrepender.

### 2. Falta de informação
Às vezes a objeção surge porque o cliente não entendeu algo ou não tem todos os dados.

### 3. Objeção real
O cliente tem uma preocupação legítima que precisa ser resolvida.

### 4. Barganha
O cliente quer negociar melhores condições.

### 5. Desculpa educada
O cliente não quer comprar mas não quer dizer "não" diretamente.

## A mentalidade correta

**Objeção não é rejeição!**

Quando um cliente faz uma objeção, ele está:
- ✅ Engajado na conversa
- ✅ Considerando a compra
- ✅ Pedindo ajuda para decidir

Se ele não tivesse interesse, simplesmente iria embora ou pararia de responder.

## O método LAER

Uma técnica comprovada para lidar com objeções:

### L - Listen (Escute)
Deixe o cliente falar completamente. Não interrompa.

### A - Acknowledge (Reconheça)
Mostre que você entendeu e respeita a preocupação.

> "Entendo perfeitamente sua preocupação..."

### E - Explore (Explore)
Faça perguntas para entender a objeção de verdade.

> "Quando você diz que está caro, está comparando com qual referência?"

### R - Respond (Responda)
Só depois de entender, ofereça sua resposta ou solução.

## Regras de ouro

1. **Nunca discuta** com o cliente
2. **Nunca diminua** a preocupação dele
3. **Sempre agradeça** por ele compartilhar
4. **Transforme** a objeção em pergunta

---

**Lembre-se:** Cada objeção respondida com sucesso te deixa mais perto da venda!',
 7, 1, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'objecoes' AND tenant_id = 1),
 'respostas-objecoes-comuns',
 'Respostas para Objeções Comuns',
 'Scripts prontos para as objeções mais frequentes no mercado imobiliário',
 '# Respostas para Objeções Comuns

Aqui estão respostas testadas e aprovadas para as objeções que você mais vai ouvir.

## "Está muito caro"

### Resposta 1: Comparação
> Entendo sua preocupação com o valor. Posso perguntar: você está comparando com outros imóveis da região? Quando analisamos o preço por m² e o que está incluso (acabamento, localização, infraestrutura), este empreendimento está muito competitivo.

### Resposta 2: Investimento
> Vejo mais como um investimento do que um custo. Imóveis nessa região valorizaram X% nos últimos 3 anos. Além disso, com o financiamento, a parcela pode ficar menor que um aluguel na mesma região.

### Resposta 3: Condições
> O valor de tabela é esse, mas podemos trabalhar nas condições. Se você der uma entrada maior, conseguimos um desconto. Quer que eu simule alguns cenários?

## "Preciso pensar"

### Resposta 1: Entender a hesitação
> Claro, é uma decisão importante! Me ajuda a entender: tem algo específico que está te deixando em dúvida? Assim posso te dar mais informações para você decidir com segurança.

### Resposta 2: Criar urgência com cuidado
> Entendo perfeitamente. Só te adianto que essa condição especial é válida até [data] e restam poucas unidades nesse preço. Posso reservar essa unidade por 48h enquanto você pensa?

## "Vou falar com meu cônjuge/família"

### Resposta: Incluir o decisor
> Faz todo sentido! Inclusive, seria ótimo se [nome do cônjuge] pudesse ver também. Que tal agendarmos uma visita juntos no decorado? Assim vocês podem decidir com todas as informações.

## "O apartamento é pequeno"

### Resposta: Mostrar o projeto
> Entendo sua impressão. Os apartamentos modernos são projetados para otimizar cada m². Posso te mostrar a planta com sugestão de mobília? Os arquitetos conseguiram encaixar tudo que uma família precisa. E na visita ao decorado você vai ver como fica espaçoso na prática.

## "O bairro é longe"

### Resposta: Benefícios da localização
> Realmente não é no centro, mas veja as vantagens: o valor do m² é 30% menor, o condomínio tem infraestrutura completa, e o bairro está em plena expansão com novos comércios abrindo. Além disso, fica a X minutos do metrô/de carro do seu trabalho.

## "Vou esperar baixar o preço"

### Resposta: Realidade do mercado
> Entendo o raciocínio, mas no mercado imobiliário costuma acontecer o contrário: conforme as unidades vão vendendo, o preço tende a subir. Os melhores preços são no lançamento. Quem comprou o primeiro empreendimento dessa construtora há 2 anos já viu valorizar X%.

## "Não é o momento certo"

### Resposta: Explorar o momento
> Entendo. Posso perguntar o que precisaria mudar para ser o momento certo? Às vezes conseguimos encontrar uma solução que se encaixe na sua situação atual.

---

**Pratique:** Leia esses scripts em voz alta. Quanto mais natural você for, melhor será o resultado!',
 10, 2, true);

-- ============================================================================
-- LIÇÕES - Módulo: Técnicas de Fechamento
-- ============================================================================

INSERT INTO academy_lessons (tenant_id, modulo_id, slug, titulo, resumo, conteudo, duracao_minutos, ordem, ativo)
VALUES
(1,
 (SELECT id FROM academy_modules WHERE slug = 'fechamento' AND tenant_id = 1),
 'sinais-compra',
 'Identificando Sinais de Compra',
 'Aprenda a reconhecer quando o cliente está pronto para fechar',
 '# Identificando Sinais de Compra

Saber o momento certo de propor o fechamento é uma arte. Esses sinais vão te ajudar.

## O que são sinais de compra?

São **comportamentos, perguntas ou comentários** que indicam que o cliente está mentalmente se imaginando como dono do imóvel.

Quando você percebe esses sinais, é hora de avançar para o fechamento!

## Sinais verbais

### Perguntas sobre detalhes práticos:
- "Como funciona o financiamento?"
- "Qual o valor do condomínio?"
- "Quando fica pronto?"
- "Posso escolher o acabamento?"
- "Aceita meu carro na troca?"

### Projeção de futuro:
- "Daria para colocar minha mesa de jantar aqui"
- "As crianças iam adorar essa piscina"
- "Ficaria perto do meu trabalho"
- "Minha mãe poderia ficar no quarto de hóspedes"

### Perguntas sobre garantias:
- "E se eu perder o emprego?"
- "O que acontece se atrasar a obra?"
- "Posso desistir depois?"

## Sinais não-verbais

### Na visita presencial:
- Tira fotos do imóvel
- Mede os cômodos
- Abre armários e gavetas
- Testa torneiras e interruptores
- Passa mais tempo em determinado cômodo
- Olha pela janela imaginando a vista

### No comportamento:
- Faz muitas perguntas seguidas
- Inclina o corpo para frente (interesse)
- Sorri ao ver algo que gosta
- Chama o cônjuge/família para ver junto
- Volta ao mesmo imóvel mais de uma vez

## O termômetro do interesse

| Temperatura | Sinais | Ação |
|-------------|--------|------|
| 🔥 Quente | Pergunta sobre pagamento, prazo, documentos | Proponha o fechamento |
| 🌡️ Morno | Faz comparações, pede para pensar | Tire dúvidas, crie urgência |
| ❄️ Frio | Respostas curtas, olha no celular | Descubra o que falta |

## Quando NÃO é sinal de compra

Cuidado para não confundir:
- Educação excessiva (ser gentil ≠ querer comprar)
- Perguntas por curiosidade (turista de decorado)
- Interesse no café do stand (só veio pelo brinde)

## Como usar os sinais

1. **Observe** atentamente o comportamento
2. **Anote** mentalmente os sinais que perceber
3. **Valide** com uma pergunta: "Você está gostando desse apartamento?"
4. **Avance** se a resposta for positiva

---

**Dica:** Quanto mais sinais você perceber, mais confiante pode ser no fechamento!',
 7, 1, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'fechamento' AND tenant_id = 1),
 'tecnicas-fechamento',
 'Técnicas de Fechamento',
 'Métodos comprovados para conduzir o cliente à decisão final',
 '# Técnicas de Fechamento

O fechamento não é um momento mágico - é o resultado natural de um bom atendimento. Mas algumas técnicas ajudam.

## A mentalidade do fechamento

**Fechar não é pressionar.** É ajudar o cliente a tomar uma decisão que ele quer tomar mas tem medo.

Seu papel é:
- Dar segurança
- Remover dúvidas
- Facilitar o processo

## Técnicas comprovadas

### 1. Fechamento Presumido
Aja como se a decisão já estivesse tomada.

> "Vou separar essa unidade para você. Prefere fazer a reserva agora ou amanhã de manhã?"

> "Para a documentação, seu CPF é o mesmo que está aqui?"

### 2. Fechamento por Alternativa
Dê duas opções, ambas levando à venda.

> "Você prefere o apartamento do 5º andar com vista para o parque ou o do 8º com mais silêncio?"

> "Quer começar com 20% de entrada e parcelas menores, ou 30% e quitar mais rápido?"

### 3. Fechamento por Resumo
Recapitule todos os benefícios antes de pedir a decisão.

> "Então, resumindo: você encontrou um 3 quartos na região que queria, dentro do seu orçamento, com área de lazer completa para as crianças e pronto para morar em 6 meses. O que você acha de garantirmos essa unidade?"

### 4. Fechamento por Escassez
Use a realidade da disponibilidade a seu favor (sem mentir!).

> "Essa unidade é a última nessa posição solar. Se você tem interesse, recomendo garantir hoje."

> "O preço de lançamento é válido só até sexta-feira. Depois sobe 5%."

### 5. Fechamento por Testemunho
Use histórias de outros clientes.

> "Um cliente meu estava na mesma dúvida há 6 meses. Decidiu comprar e hoje me agradece - o apartamento dele já valorizou 15%."

## Frases de fechamento

Para pedir a venda de forma natural:

- "Vamos fazer a reserva?"
- "Posso preparar a proposta?"
- "Quer que eu segure essa unidade para você?"
- "Como você prefere seguir?"
- "O que falta para fecharmos?"

## Se o cliente disser não

Não desista! Pergunte:

> "Entendo. Me ajuda a entender o que está faltando? Quero ter certeza de que estou te mostrando a melhor opção."

Às vezes o "não" é para aquela unidade, não para a compra em si.

## Depois do sim

1. **Parabenize** o cliente pela decisão
2. **Explique** os próximos passos claramente
3. **Envie** tudo por escrito (proposta, documentos necessários)
4. **Acompanhe** de perto até a assinatura
5. **Mantenha contato** mesmo após a venda

---

**Lembre-se:** Você não está tirando dinheiro do cliente. Você está ajudando ele a realizar um sonho!',
 10, 2, true),

(1,
 (SELECT id FROM academy_modules WHERE slug = 'fechamento' AND tenant_id = 1),
 'pos-venda',
 'Pós-Venda e Indicações',
 'Como transformar clientes em promotores da sua marca',
 '# Pós-Venda e Indicações

A venda não termina na assinatura do contrato. O pós-venda bem feito gera indicações e novas vendas.

## Por que o pós-venda importa?

### Números que impressionam:
- Conquistar um novo cliente custa **5x mais** que manter um atual
- **84%** das pessoas confiam em recomendações de conhecidos
- Um cliente satisfeito indica em média **3 pessoas**
- Um cliente insatisfeito conta para **11 pessoas**

## O que fazer após a venda

### Semana 1: Confirmação
- Envie mensagem agradecendo a confiança
- Confirme que a documentação está em ordem
- Coloque-se à disposição para dúvidas

### Mês 1: Acompanhamento
- Pergunte se está tudo certo com o processo
- Informe sobre o andamento da obra (se aplicável)
- Envie fotos de progresso

### A cada 3 meses: Contato
- Mande novidades sobre a obra
- Compartilhe fotos do empreendimento
- Convide para eventos do stand

### Na entrega: Celebração
- Parabenize pela conquista
- Ofereça ajuda na vistoria
- Peça feedback sobre a experiência

## Como pedir indicações

### O momento certo
Peça indicações quando o cliente demonstrar satisfação:
- Logo após o fechamento (está empolgado)
- Quando elogiar seu atendimento
- Na entrega das chaves

### A forma certa

**Opção 1: Direta**
> "Fico muito feliz que você tenha gostado do atendimento! Você conhece alguém que também está procurando um imóvel? Adoraria ajudar seus amigos e familiares da mesma forma."

**Opção 2: Benefício**
> "Temos um programa de indicação: se você indicar alguém que feche negócio, você ganha [benefício]. Conhece alguém interessado?"

**Opção 3: Específica**
> "Vi que você trabalha na [empresa]. Tem algum colega que está procurando imóvel? Posso fazer uma condição especial para indicações suas."

## Programa de relacionamento

Mantenha contato mesmo com quem já comprou:

### Datas especiais:
- Aniversário do cliente
- 1 ano da compra
- Natal e Ano Novo

### Conteúdo útil:
- Dicas de decoração
- Novidades do bairro
- Informações sobre valorização

### Eventos:
- Convite para lançamentos
- Visitas ao canteiro de obras
- Confraternizações

## Lidando com problemas

Se algo der errado após a venda:

1. **Escute** sem interromper
2. **Assuma** a responsabilidade de resolver
3. **Aja** rapidamente
4. **Acompanhe** até a solução
5. **Compense** se necessário

Um problema bem resolvido pode gerar mais fidelidade do que se não tivesse acontecido!

## Construindo sua rede

Com o tempo, seus clientes se tornam sua melhor fonte de novos negócios:

- **Hoje:** Você busca clientes ativamente
- **Em 1 ano:** Metade vem de indicações
- **Em 3 anos:** Maioria são indicações

---

**A venda mais fácil é aquela que vem de uma indicação. Cuide bem de cada cliente!**',
 8, 3, true);

-- ============================================================================
-- ATUALIZAR DURAÇÃO DOS MÓDULOS (soma das lições)
-- ============================================================================

UPDATE academy_modules m
SET duracao_minutos = (
    SELECT COALESCE(SUM(l.duracao_minutos), 0)
    FROM academy_lessons l
    WHERE l.modulo_id = m.id
)
WHERE tenant_id = 1;
