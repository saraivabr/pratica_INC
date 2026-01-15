export interface Corretor {
  id: string
  nome: string
  whatsapp: string
  codigo: string
  ativo: boolean
}

export interface CorretoresData {
  corretores: Corretor[]
}
