/**
 * @fileoverview Tipos TypeScript para gerenciamento de Leads
 * @module types/lead
 * @description Define interfaces e tipos para leads, interacoes, corretores,
 * empreendimentos e componentes relacionados.
 */

import type { LucideIcon } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

// =============================================================================
// TIPOS BASE - Identificadores e Valores Comuns
// =============================================================================

/**
 * Tipo para identificadores que podem ser numeros ou strings
 * @description Utilizado para IDs que vem da API podendo ser number ou string
 */
export type LeadId = number | string

/**
 * Tipo para valores monetarios
 * @description Pode ser number ou string formatada (ex: "1.500,00")
 */
export type MonetaryValue = number | string

/**
 * Tipo para datas em formato ISO string
 * @example "2024-01-15T10:30:00Z"
 */
export type ISODateString = string

// =============================================================================
// INTERACOES
// =============================================================================

/**
 * Tipos de interacao disponiveis
 * @description Categorias padrao para classificacao de interacoes
 */
export type InteracaoTipo =
  | "ligacao"
  | "email"
  | "whatsapp"
  | "reuniao"
  | "nota"
  | "proposta"
  | "venda"
  | "perda"
  | "alerta"
  | "envio"
  | "cadastro"
  | "atualizacao"
  | "tag"
  | string

/**
 * Interface para interacoes do lead
 * @description Representa um registro de interacao/historico do lead
 */
export interface LeadInteracao {
  /** Identificador unico da interacao */
  id?: LeadId
  /** Descricao ou conteudo da interacao */
  descricao: string
  /** Data de cadastro da interacao (ISO string) */
  data_cad: ISODateString
  /** Data da interacao (alternativo a data_cad) */
  data?: ISODateString
  /** Tipo/categoria da interacao */
  tipo?: InteracaoTipo
  /** Observacao adicional */
  observacao?: string
  /** Usuario que registrou a interacao */
  usuario?: string
  /** ID do usuario que registrou */
  usuario_id?: LeadId
}

/**
 * Props para componente InteractionCard
 * @description Usada pelo componente de card de interacao individual
 */
export interface InteractionCardProps {
  /** Dados da interacao */
  interacao: LeadInteracao
  /** Funcao para formatar data */
  formatDate: (date: string) => string
  /** Funcao para obter informacoes visuais do badge baseado no tipo */
  getBadgeInfo: (tipo?: string) => InteractionBadgeInfo
}

/**
 * Informacoes visuais do badge de interacao
 * @description Define cores e icone para cada tipo de interacao
 */
export interface InteractionBadgeInfo {
  /** Classe CSS para cor de fundo */
  bgColor: string
  /** Classe CSS para cor do texto */
  textColor: string
  /** Classe CSS para cor da borda */
  borderColor: string
  /** Icone React a ser exibido */
  icon: React.ReactNode
  /** Classe CSS para gradiente */
  gradient: string
}

// =============================================================================
// CORRETOR
// =============================================================================

/**
 * Interface para corretor associado ao lead
 * @description Representa o profissional responsavel pelo lead
 */
export interface LeadCorretor {
  /** Identificador unico do corretor */
  id?: LeadId
  /** Nome completo do corretor */
  nome: string
  /** Email do corretor */
  email?: string
  /** Telefone do corretor */
  telefone?: string
  /** Avatar/foto do corretor */
  avatar?: string
  /** Status ativo/inativo */
  ativo?: boolean
}

/**
 * Tipo para campo corretor que pode vir em diferentes formatos da API
 * @description Normaliza diferentes formatos de resposta da API
 */
export type LeadCorretorField = string | LeadCorretor | null | undefined

// =============================================================================
// EMPREENDIMENTO
// =============================================================================

/**
 * Interface para empreendimento associado ao lead
 * @description Representa o imovel/empreendimento de interesse
 */
export interface LeadEmpreendimento {
  /** Identificador unico do empreendimento */
  id: LeadId
  /** Nome do empreendimento */
  nome: string
  /** Endereco completo */
  endereco?: string
  /** Cidade */
  cidade?: string
  /** Estado (UF) */
  estado?: string
  /** CEP */
  cep?: string
  /** Tipo do empreendimento (apartamento, casa, etc) */
  tipo?: string
  /** Valor do empreendimento */
  valor?: MonetaryValue
  /** URL da imagem principal */
  imagem?: string
}

/**
 * Tipo para campo empreendimento que pode vir em diferentes formatos
 */
export type LeadEmpreendimentoField = string | LeadEmpreendimento | null | undefined

// =============================================================================
// SCORE DE CREDITO
// =============================================================================

/**
 * Faixas de classificacao do score
 */
export type ScoreFaixa = "Ruim" | "Regular" | "Bom" | "Excelente" | string

/**
 * Configuracao visual do score baseada na pontuacao
 * @description Define aparencia do gauge de score
 */
export interface ScoreConfig {
  /** Classe CSS para cor do texto */
  text: string
  /** Classe CSS para cor de fundo */
  bg: string
  /** Classe CSS para fundo claro */
  bgLight: string
  /** Label descritivo da faixa */
  label: ScoreFaixa
  /** ID do gradiente SVG */
  gradientId: string
  /** Cores do gradiente */
  colors: {
    start: string
    mid: string
    end: string
  }
  /** Cor do efeito glow */
  glowColor: string
  /** Sombra CSS */
  shadowColor: string
}

/**
 * Resposta da API Brasil para consulta de score
 * @description Estrutura retornada pela API de consulta de credito
 */
export interface ScoreResponse {
  /** Pontuacao do score (0-1000) */
  score?: number
  /** Probabilidade de inadimplencia */
  probabilidade?: string
  /** Faixa de classificacao */
  faixa?: string
  /** Risco (alternativo a faixa) */
  risco?: string
  /** Data da consulta */
  data_consulta?: ISODateString

  // Campos de erro
  /** Mensagem de erro ou sucesso */
  mensagem?: string
  /** Indica se houve erro */
  erro?: boolean

  // Dados adicionais
  /** Nome do titular do CPF */
  nome?: string
  /** CPF consultado */
  cpf?: string
  /** Situacao do CPF na Receita */
  situacao_cpf?: string
}

/**
 * Request para consulta de score
 */
export interface ScoreRequest {
  /** CPF a ser consultado (apenas numeros) */
  cpf: string
  /** Tipo de consulta */
  tipo?: string
  /** Usar ambiente de homologacao */
  homolog?: boolean
}

/**
 * Props para o componente ScoreDisplay
 * @description Exibe o gauge circular de score de credito
 */
export interface ScoreDisplayProps {
  /** Pontuacao do score (0-1000) */
  score: number
  /** Probabilidade de inadimplencia */
  probabilidade?: string
  /** Faixa/classificacao do score */
  faixa?: string
  /** Exibir estado de loading */
  loading?: boolean
}

// =============================================================================
// LEAD - TIPO PRINCIPAL
// =============================================================================

/**
 * Situacoes/status possiveis do lead
 */
export type LeadSituacao =
  | "Novo"
  | "Em Andamento"
  | "Qualificado"
  | "Convertido"
  | "Perdido"
  | "Descartado"
  | "Aguardando"
  | "Ativo"
  | string

/**
 * Interface completa do Lead
 * @description Representa todos os dados de um lead no sistema
 */
export interface Lead {
  /** Identificador unico do lead */
  id: LeadId
  /** Nome completo do lead */
  nome: string
  /** Email do lead */
  email?: string | null
  /** Telefone fixo */
  telefone?: string | null
  /** Celular/WhatsApp */
  celular?: string | null
  /** CPF do lead (apenas numeros) */
  cpf?: string | null

  // Corretor - pode vir em diferentes formatos
  /** Corretor responsavel (objeto ou string) */
  corretor?: LeadCorretorField
  /** Nome do corretor (campo alternativo) */
  corretor_nome?: string

  // Empreendimento - pode vir em diferentes formatos
  /** Empreendimento de interesse (objeto ou string) */
  empreendimento?: LeadEmpreendimentoField
  /** Nome do empreendimento (campo alternativo) */
  empreendimento_nome?: string

  // Status e classificacao
  /** Situacao/status atual do lead */
  situacao?: LeadSituacao
  /** Origem/canal de captacao */
  origem?: string
  /** Midia/campanha de origem */
  midia?: string

  // Interacoes (pode vir com diferentes nomes)
  /** Lista de interacoes (nome alternativo) */
  interacao?: LeadInteracao[]
  /** Lista de interacoes */
  interacoes?: LeadInteracao[]

  // Datas
  /** Data de cadastro */
  data_cad?: ISODateString
  /** Data da ultima alteracao */
  data_alterado?: ISODateString

  // Dados pessoais adicionais
  /** Observacoes gerais */
  observacao?: string
  /** Endereco */
  endereco?: string
  /** Cidade */
  cidade?: string
  /** Estado (UF) */
  estado?: string
  /** CEP */
  cep?: string
  /** Renda mensal */
  renda?: MonetaryValue
  /** Profissao */
  profissao?: string
  /** Data de nascimento */
  data_nascimento?: ISODateString

  // Score (se ja consultado)
  /** Score de credito */
  score?: number
  /** Faixa do score */
  score_faixa?: ScoreFaixa
  /** Data da consulta do score */
  score_data?: ISODateString
}

// =============================================================================
// PROPS DE COMPONENTES
// =============================================================================

/**
 * Props para o modal de detalhes do lead
 * @description Componente LeadDetailModal
 */
export interface LeadDetailModalProps {
  /** Dados do lead a ser exibido */
  lead: Lead | null
  /** Estado de abertura do modal */
  open: boolean
  /** Callback para mudanca de estado do modal */
  onOpenChange: (open: boolean) => void
}

/**
 * Props para componente de informacoes de contato
 * @description Componente LeadContactInfo
 */
export interface LeadContactInfoProps {
  /** Email do lead */
  email?: string | null
  /** Telefone fixo */
  telefone?: string | null
  /** Celular/WhatsApp */
  celular?: string | null
}

/**
 * Props para secao de historico de interacoes
 * @description Componente LeadHistorySection
 */
export interface LeadHistorySectionProps {
  /** Lista de interacoes do lead */
  interacoes: LeadInteracao[]
}

/**
 * Variantes visuais do InfoCard
 */
export type InfoCardVariant = "default" | "elevated" | "outlined" | "filled"

/**
 * Tamanhos do InfoCard
 */
export type InfoCardSize = "sm" | "default" | "lg"

/**
 * Props para o componente InfoCard
 * @description Card para exibicao de informacoes individuais
 */
export interface InfoCardProps {
  /** Componente de icone (Lucide) */
  icon: LucideIcon
  /** Label/rotulo do campo */
  label: string
  /** Valor a ser exibido */
  value: string | null | undefined
  /** Callback ao copiar valor */
  onCopy?: () => void
  /** Indica se foi copiado recentemente */
  copied?: boolean
  /** Exibir skeleton de loading */
  loading?: boolean
  /** Variante visual */
  variant?: InfoCardVariant
  /** Tamanho do card */
  size?: InfoCardSize
  /** Classe CSS para cor do icone */
  iconColor?: string
  /** Se o card e interativo (hover pointer) */
  interactive?: boolean
  /** Classes CSS adicionais */
  className?: string
}

/**
 * Variantes visuais do LeadInfoCard
 */
export type LeadInfoCardVariant = "default" | "outlined" | "filled" | "gradient" | "glass"

/**
 * Props para o componente LeadInfoCard
 * @description Card reutilizavel para exibir informacoes do lead
 */
export interface LeadInfoCardProps {
  /** Componente de icone (Lucide) */
  icon: React.ElementType
  /** Label/rotulo do campo */
  label: string
  /** Valor a ser exibido */
  value: string | null | undefined
  /** Placeholder quando valor e vazio */
  placeholder?: string
  /** Variante visual */
  variant?: LeadInfoCardVariant
  /** Tamanho do card */
  size?: "sm" | "md" | "lg"
  /** Exibir skeleton de loading */
  loading?: boolean
  /** Permitir copia do valor */
  copyable?: boolean
  /** Truncar texto longo */
  truncate?: boolean
  /** Largura maxima do valor */
  maxWidth?: string
  /** Cor customizada do icone */
  iconColor?: string
  /** Cor de fundo customizada do icone */
  iconBgColor?: string
  /** Callback ao clicar no card */
  onClick?: () => void
  /** Callback ao copiar valor */
  onCopy?: (value: string) => void
  /** Classes CSS adicionais */
  className?: string
}

// =============================================================================
// TIPOS PARA LISTAGEM E PAGINACAO
// =============================================================================

/**
 * Item resumido para listagem de leads
 * @description Versao otimizada para tabelas e listas
 */
export interface LeadListItem {
  /** Identificador unico */
  id: LeadId
  /** Nome do lead */
  nome: string
  /** Email */
  email?: string
  /** Telefone */
  telefone?: string
  /** Situacao atual */
  situacao?: LeadSituacao
  /** Data de cadastro */
  data_cad?: ISODateString
  /** Empreendimento resumido */
  empreendimento?: Pick<LeadEmpreendimento, "id" | "nome">
}

/**
 * Resposta paginada de leads
 * @description Estrutura de paginacao da API
 */
export interface LeadsPaginatedResponse {
  /** Lista de leads */
  data: Lead[]
  /** Total de registros */
  total: number
  /** Pagina atual */
  page: number
  /** Registros por pagina */
  per_page: number
  /** Ultima pagina */
  last_page: number
}

/**
 * Filtros para busca de leads
 * @description Parametros de query para listagem
 */
export interface LeadFilters {
  /** Filtrar por nome (parcial) */
  nome?: string
  /** Filtrar por email (parcial) */
  email?: string
  /** Filtrar por CPF */
  cpf?: string
  /** Filtrar por situacao */
  situacao?: LeadSituacao
  /** Filtrar por origem */
  origem?: string
  /** Filtrar por empreendimento */
  empreendimento_id?: LeadId
  /** Filtrar por corretor */
  corretor_id?: LeadId
  /** Data inicial (cadastro) */
  data_inicio?: ISODateString
  /** Data final (cadastro) */
  data_fim?: ISODateString
  /** Ordenacao */
  order_by?: string
  /** Direcao da ordenacao */
  order_dir?: "asc" | "desc"
}

// =============================================================================
// TIPOS UTILITARIOS
// =============================================================================

/**
 * Estado de copia para multiplos campos
 * @description Usado para controlar feedback visual de copia
 */
export type CopiedState = Record<string, boolean>

/**
 * Configuracao de contato para componente LeadContactInfo
 * @internal
 */
export interface ContactConfig {
  /** Tipo do contato */
  type: "email" | "telefone" | "celular"
  /** Valor do contato */
  value: string | undefined
  /** URL para acao (mailto, tel, wa.me) */
  href: string | undefined
  /** Componente de icone */
  icon: React.ElementType
  /** Label descritivo */
  label: string
  /** Label da acao */
  actionLabel: string
  /** Classe de gradiente */
  gradient: string
  /** Classe de glow */
  bgGlow: string
  /** Classe de fundo do icone */
  iconBg: string
  /** Classe de ring */
  ringColor: string
  /** Classe de hover ring */
  hoverRing: string
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Verifica se o corretor e um objeto LeadCorretor
 * @param corretor - Campo corretor do lead
 * @returns true se for objeto LeadCorretor
 */
export function isLeadCorretor(corretor: LeadCorretorField): corretor is LeadCorretor {
  return corretor !== null && typeof corretor === "object" && "nome" in corretor
}

/**
 * Verifica se o empreendimento e um objeto LeadEmpreendimento
 * @param empreendimento - Campo empreendimento do lead
 * @returns true se for objeto LeadEmpreendimento
 */
export function isLeadEmpreendimento(
  empreendimento: LeadEmpreendimentoField
): empreendimento is LeadEmpreendimento {
  return empreendimento !== null && typeof empreendimento === "object" && "nome" in empreendimento
}

/**
 * Extrai o nome do corretor independente do formato
 * @param corretor - Campo corretor do lead
 * @returns Nome do corretor ou undefined
 */
export function getCorretorNome(corretor: LeadCorretorField): string | undefined {
  if (!corretor) return undefined
  if (typeof corretor === "string") return corretor
  if (isLeadCorretor(corretor)) return corretor.nome
  return undefined
}

/**
 * Extrai o nome do empreendimento independente do formato
 * @param empreendimento - Campo empreendimento do lead
 * @returns Nome do empreendimento ou undefined
 */
export function getEmpreendimentoNome(empreendimento: LeadEmpreendimentoField): string | undefined {
  if (!empreendimento) return undefined
  if (typeof empreendimento === "string") return empreendimento
  if (isLeadEmpreendimento(empreendimento)) return empreendimento.nome
  return undefined
}

/**
 * Obtem todas as interacoes do lead normalizando os campos
 * @param lead - Objeto lead
 * @returns Array de interacoes
 */
export function getLeadInteracoes(lead: Lead | null | undefined): LeadInteracao[] {
  if (!lead) return []
  return lead.interacoes ?? lead.interacao ?? []
}
