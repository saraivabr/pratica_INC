/**
 * Utilitarios para validacao e formatacao de documentos
 */

// === Validacao de CPF ===
export function validarCPF(cpf: string): boolean {
  // Remove caracteres nao numericos
  const cpfLimpo = cpf.replace(/\D/g, '')

  // Verifica se tem 11 digitos
  if (cpfLimpo.length !== 11) return false

  // Verifica se todos os digitos sao iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false

  // Calcula primeiro digito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo[9])) return false

  // Calcula segundo digito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo[10])) return false

  return true
}

// === Validacao de CNPJ ===
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres nao numericos
  const cnpjLimpo = cnpj.replace(/\D/g, '')

  // Verifica se tem 14 digitos
  if (cnpjLimpo.length !== 14) return false

  // Verifica se todos os digitos sao iguais
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false

  // Calcula primeiro digito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let soma = 0
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo[i]) * pesos1[i]
  }
  let resto = soma % 11
  const digito1 = resto < 2 ? 0 : 11 - resto
  if (digito1 !== parseInt(cnpjLimpo[12])) return false

  // Calcula segundo digito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  soma = 0
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpjLimpo[i]) * pesos2[i]
  }
  resto = soma % 11
  const digito2 = resto < 2 ? 0 : 11 - resto
  if (digito2 !== parseInt(cnpjLimpo[13])) return false

  return true
}

// === Validacao de documento (CPF ou CNPJ) ===
export function validarDocumento(documento: string): { valido: boolean; tipo: 'CPF' | 'CNPJ' | null } {
  const docLimpo = documento.replace(/\D/g, '')

  if (docLimpo.length === 11) {
    return { valido: validarCPF(documento), tipo: 'CPF' }
  }

  if (docLimpo.length === 14) {
    return { valido: validarCNPJ(documento), tipo: 'CNPJ' }
  }

  return { valido: false, tipo: null }
}

// === Formatacao de CPF ===
export function formatarCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '')
  if (cpfLimpo.length <= 3) return cpfLimpo
  if (cpfLimpo.length <= 6) return `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3)}`
  if (cpfLimpo.length <= 9) return `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6)}`
  return `${cpfLimpo.slice(0, 3)}.${cpfLimpo.slice(3, 6)}.${cpfLimpo.slice(6, 9)}-${cpfLimpo.slice(9, 11)}`
}

// === Formatacao de CNPJ ===
export function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  if (cnpjLimpo.length <= 2) return cnpjLimpo
  if (cnpjLimpo.length <= 5) return `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2)}`
  if (cnpjLimpo.length <= 8) return `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5)}`
  if (cnpjLimpo.length <= 12) return `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5, 8)}/${cnpjLimpo.slice(8)}`
  return `${cnpjLimpo.slice(0, 2)}.${cnpjLimpo.slice(2, 5)}.${cnpjLimpo.slice(5, 8)}/${cnpjLimpo.slice(8, 12)}-${cnpjLimpo.slice(12, 14)}`
}

// === Formatacao de documento (auto-detecta CPF ou CNPJ) ===
export function formatarDocumento(documento: string): string {
  const docLimpo = documento.replace(/\D/g, '')
  if (docLimpo.length <= 11) {
    return formatarCPF(documento)
  }
  return formatarCNPJ(documento)
}

// === Mascara de documento (oculta parte do documento) ===
export function mascararDocumento(documento: string): string {
  const docLimpo = documento.replace(/\D/g, '')

  if (docLimpo.length === 11) {
    // CPF: ***.XXX.XXX-XX
    return `***.${docLimpo.slice(3, 6)}.${docLimpo.slice(6, 9)}-${docLimpo.slice(9, 11)}`
  }

  if (docLimpo.length === 14) {
    // CNPJ: **.XXX.XXX/XXXX-XX
    return `**.${docLimpo.slice(2, 5)}.${docLimpo.slice(5, 8)}/${docLimpo.slice(8, 12)}-${docLimpo.slice(12, 14)}`
  }

  return documento
}

// === Formatacao de telefone ===
export function formatarTelefone(telefone: string): string {
  const telLimpo = telefone.replace(/\D/g, '')
  if (telLimpo.length <= 2) return `(${telLimpo}`
  if (telLimpo.length <= 6) return `(${telLimpo.slice(0, 2)}) ${telLimpo.slice(2)}`
  if (telLimpo.length <= 10) return `(${telLimpo.slice(0, 2)}) ${telLimpo.slice(2, 6)}-${telLimpo.slice(6)}`
  return `(${telLimpo.slice(0, 2)}) ${telLimpo.slice(2, 7)}-${telLimpo.slice(7, 11)}`
}

// === Formatacao de moeda ===
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

// === Formatacao de moeda compacta ===
export function formatarMoedaCompacta(valor: number): string {
  if (Math.abs(valor) >= 1000000) {
    return `R$ ${(valor / 1000000).toFixed(1)}M`
  }
  if (Math.abs(valor) >= 1000) {
    return `R$ ${(valor / 1000).toFixed(1)}K`
  }
  return formatarMoeda(valor)
}

// === Mascara de conta bancaria ===
export function mascararConta(conta: string): string {
  if (!conta) return ''
  const contaLimpa = conta.replace(/\D/g, '')
  if (contaLimpa.length <= 3) return contaLimpa
  return `*****${contaLimpa.slice(-3)}`
}

// === Mascara de chave PIX ===
export function mascararPix(pix: string): string {
  if (!pix) return ''

  // Email
  if (pix.includes('@')) {
    const [nome, dominio] = pix.split('@')
    const nomeOculto = nome.slice(0, 2) + '***'
    return `${nomeOculto}@${dominio}`
  }

  // Telefone
  if (/^\d{10,11}$/.test(pix.replace(/\D/g, ''))) {
    const tel = pix.replace(/\D/g, '')
    return `(${tel.slice(0, 2)}) *****-${tel.slice(-4)}`
  }

  // CPF/CNPJ
  const docLimpo = pix.replace(/\D/g, '')
  if (docLimpo.length === 11 || docLimpo.length === 14) {
    return mascararDocumento(pix)
  }

  // Chave aleatoria
  if (pix.length > 8) {
    return `${pix.slice(0, 4)}****${pix.slice(-4)}`
  }

  return pix
}
