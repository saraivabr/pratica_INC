import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatarPreco(valor: number | undefined): string {
  if (!valor) return "Consulte"
  return valor.toLocaleString("pt-BR")
}

export function formatarPrecoAbreviado(valor: number | undefined): string {
  if (!valor) return "Consulte"
  if (valor >= 1000000) {
    return `${(valor / 1000000).toFixed(1)}M`
  }
  return `${(valor / 1000).toFixed(0)}k`
}

export function formatarArea(area: number | string | undefined): string {
  if (!area) return ""
  return `${area}m²`
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, "")
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }
  return telefone
}
