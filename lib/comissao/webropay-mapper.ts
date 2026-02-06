/**
 * Webropay Mapper
 *
 * Maps our local comissao schema to the Webropay API payload format.
 * Handles currency conversion (reais → centavos), document cleanup,
 * and payload validation.
 */

import 'server-only'

import type {
  WebropayVendaPayload,
  WebropayParcela,
  WebropayRecebivel,
  WebropayEndereco,
  WebropayPagador,
} from './types'

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert reais (decimal) to centavos (integer)
 * R$100.50 → 10050
 */
export function reaisParaCentavos(valor: number): number {
  return Math.round(valor * 100)
}

/**
 * Remove non-digit characters from document (CPF/CNPJ)
 */
export function limparDocumento(doc: string | null | undefined): string {
  if (!doc) return ''
  return doc.replace(/\D/g, '')
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  campo: string
  mensagem: string
}

export interface ValidationResult {
  valido: boolean
  erros: ValidationError[]
}

/**
 * Validate payload before sending to Webropay
 */
export function validarPayloadWebropay(
  venda: Record<string, any>,
  corretores: Record<string, any>[],
  parcelas: Record<string, any>[],
  matrizRows: Record<string, any>[]
): ValidationResult {
  const erros: ValidationError[] = []

  // Venda fields
  if (!venda.codigo) {
    erros.push({ campo: 'codigo', mensagem: 'Código da venda é obrigatório' })
  }
  if (!venda.empreendimento) {
    erros.push({ campo: 'empreendimento', mensagem: 'Nome do empreendimento é obrigatório' })
  }
  if (!venda.unidade) {
    erros.push({ campo: 'unidade', mensagem: 'Nome da unidade é obrigatório' })
  }
  if (!venda.valor_venda || venda.valor_venda <= 0) {
    erros.push({ campo: 'valor_venda', mensagem: 'Valor da venda deve ser maior que zero' })
  }
  if (!venda.data_venda) {
    erros.push({ campo: 'data_venda', mensagem: 'Data da venda é obrigatória' })
  }

  // Cliente/pagador
  if (!venda.cliente_nome) {
    erros.push({ campo: 'cliente_nome', mensagem: 'Nome do cliente é obrigatório' })
  }
  const cpfLimpo = limparDocumento(venda.cliente_cpf)
  if (!cpfLimpo || (cpfLimpo.length !== 11 && cpfLimpo.length !== 14)) {
    erros.push({ campo: 'cliente_cpf', mensagem: 'CPF/CNPJ do cliente é obrigatório e deve ter 11 ou 14 dígitos' })
  }
  if (!venda.cliente_email) {
    erros.push({ campo: 'cliente_email', mensagem: 'Email do cliente é obrigatório para Webropay' })
  }

  // Endereço do pagador
  if (!venda.cliente_logradouro) {
    erros.push({ campo: 'cliente_logradouro', mensagem: 'Logradouro do cliente é obrigatório' })
  }
  if (!venda.cliente_numero) {
    erros.push({ campo: 'cliente_numero', mensagem: 'Número do endereço é obrigatório' })
  }
  if (!venda.cliente_bairro) {
    erros.push({ campo: 'cliente_bairro', mensagem: 'Bairro é obrigatório' })
  }
  if (!venda.cliente_cidade) {
    erros.push({ campo: 'cliente_cidade', mensagem: 'Cidade é obrigatória' })
  }
  if (!venda.cliente_uf) {
    erros.push({ campo: 'cliente_uf', mensagem: 'UF é obrigatória' })
  }
  if (!venda.cliente_cep) {
    erros.push({ campo: 'cliente_cep', mensagem: 'CEP é obrigatório' })
  }

  // Parcelas
  if (parcelas.length === 0) {
    erros.push({ campo: 'parcelas', mensagem: 'Pelo menos uma parcela é necessária' })
  }
  for (const p of parcelas) {
    if (!p.data_prevista) {
      erros.push({ campo: `parcela_${p.id}`, mensagem: `Parcela ${p.numero || p.id} sem data prevista` })
    }
  }

  // Corretores - todos devem ter documento
  for (const c of corretores) {
    const doc = limparDocumento(c.documento || c.cpf)
    if (!doc || (doc.length !== 11 && doc.length !== 14)) {
      erros.push({ campo: `corretor_${c.id}`, mensagem: `Corretor "${c.nome}" sem CPF/CNPJ válido` })
    }
  }

  // Matriz - deve ter valores para cada corretor/parcela
  if (matrizRows.length === 0) {
    erros.push({ campo: 'matriz', mensagem: 'Matriz de cálculo não foi gerada' })
  }

  return { valido: erros.length === 0, erros }
}

// ============================================================================
// MAIN MAPPER
// ============================================================================

/**
 * Map local venda + corretores + parcelas + matriz to Webropay payload
 */
export function mapVendaParaWebropay(
  venda: Record<string, any>,
  corretores: Record<string, any>[],
  parcelas: Record<string, any>[],
  matrizRows: Record<string, any>[]
): WebropayVendaPayload {
  // Build pagador address
  const enderecoPagador: WebropayEndereco = {
    logradouro: venda.cliente_logradouro || '',
    numero: venda.cliente_numero || '',
    complemento: venda.cliente_complemento || undefined,
    bairro: venda.cliente_bairro || '',
    cidade: venda.cliente_cidade || '',
    uf: venda.cliente_uf || '',
    cep: limparDocumento(venda.cliente_cep),
  }

  // Build pagador
  const pagador: WebropayPagador = {
    nome: venda.cliente_nome || '',
    cpfCnpj: limparDocumento(venda.cliente_cpf),
    email: (venda.cliente_email || '').trim(),
    telefone: limparDocumento(venda.cliente_telefone) || undefined,
    endereco: enderecoPagador,
  }

  // Compradores = same as pagador (if same person)
  const compradores: WebropayPagador[] = [{ ...pagador }]

  // Build parcelas with recebiveis per corretor
  const webropayParcelas: WebropayParcela[] = parcelas.map((parcela) => {
    const recebiveis: WebropayRecebivel[] = []

    for (const corretor of corretores) {
      // Find matrix row for this corretor + parcela
      const matrizRow = matrizRows.find(
        (m: any) => m.corretor_id === corretor.id && m.parcela_id === parcela.id
      )

      const valorFinal = matrizRow
        ? parseFloat(matrizRow.valor_manual ?? matrizRow.valor_calculado ?? 0)
        : 0

      if (valorFinal > 0) {
        recebiveis.push({
          cpfCnpjCorretor: limparDocumento(corretor.documento || corretor.cpf),
          valor: reaisParaCentavos(valorFinal),
        })
      }
    }

    return {
      idParcela: String(parcela.id),
      vencimentoParcela: parcela.data_prevista,
      meioPagamento: 'boleto' as const,
      recebiveisCorretores: recebiveis,
    }
  })

  // Build final payload
  const payload: WebropayVendaPayload = {
    idVenda: venda.codigo,
    nomeEmpreendimento: venda.empreendimento || '',
    nomeUnidade: venda.unidade || '',
    dataVenda: venda.data_venda,
    valorTotalVenda: reaisParaCentavos(parseFloat(venda.valor_venda)),
    pagador,
    compradores,
    parcelas: webropayParcelas,
  }

  return payload
}
