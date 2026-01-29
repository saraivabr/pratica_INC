import type { Imobiliaria, User, WhatsAppSession } from '../utils/test-database'

// Predefined test tenants
export const testTenants: Partial<Imobiliaria>[] = [
  {
    nome: 'Imobiliária Alpha',
    cnpj: '12345678000199'
  },
  {
    nome: 'Imobiliária Beta',
    cnpj: '98765432000188'
  },
  {
    nome: 'Imobiliária Gamma',
    cnpj: '11122233000177'
  }
]

// Predefined test users (without tenant association - add dynamically)
export const testUsers = {
  corretor1: {
    nome: 'João Corretor',
    telefone: '+5511999991111',
    role: 'corretor' as const
  },
  corretor2: {
    nome: 'Maria Corretora',
    telefone: '+5511999992222',
    role: 'corretor' as const
  },
  gerente1: {
    nome: 'Pedro Gerente',
    telefone: '+5511999993333',
    role: 'gerente' as const
  },
  admin1: {
    nome: 'Ana Admin',
    telefone: '+5511999994444',
    role: 'admin' as const
  }
}

// Predefined WhatsApp session states
export const sessionStates: Record<string, Partial<WhatsAppSession>> = {
  disconnected: {
    status: 'disconnected',
    paired_phone: null,
    device_name: null,
    session_data: null,
    last_qr: null
  },
  connecting: {
    status: 'connecting',
    paired_phone: null,
    device_name: null,
    session_data: null
  },
  qr: {
    status: 'qr',
    last_qr: 'mock-qr-code-data',
    paired_phone: null,
    device_name: null
  },
  ready: {
    status: 'ready',
    paired_phone: '5511999999999',
    device_name: 'Test Device',
    session_data: 'encrypted-session-data-mock'
  },
  error: {
    status: 'error',
    error_log: 'Connection failed: timeout',
    paired_phone: null,
    device_name: null
  }
}

// Helper to generate realistic Brazilian phone numbers
export function generateBrazilianPhone(): string {
  const ddds = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
    '21', '22', '24', // Rio de Janeiro
    '27', '28', // Espírito Santo
    '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
    '41', '42', '43', '44', '45', '46', // Paraná
    '47', '48', '49', // Santa Catarina
    '51', '53', '54', '55', // Rio Grande do Sul
    '61', // Brasília
    '62', '64', // Goiás
    '63', // Tocantins
    '65', '66', // Mato Grosso
    '67', // Mato Grosso do Sul
    '68', // Acre
    '69', // Rondônia
    '71', '73', '74', '75', '77', // Bahia
    '79', // Sergipe
    '81', '87', // Pernambuco
    '82', // Alagoas
    '83', // Paraíba
    '84', // Rio Grande do Norte
    '85', '88', // Ceará
    '86', '89', // Piauí
    '91', '93', '94', // Pará
    '92', '97', // Amazonas
    '95', // Roraima
    '96', // Amapá
    '98', '99', // Maranhão
  ]

  const ddd = ddds[Math.floor(Math.random() * ddds.length)]
  const firstDigit = '9' // Mobile numbers start with 9
  const remainingDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')

  return `+55${ddd}${firstDigit}${remainingDigits}`
}

// Helper to generate test CNPJ
export function generateCNPJ(): string {
  const base = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  const branch = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${base}${branch}99`
}
