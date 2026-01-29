import { NextResponse } from "next/server"

/**
 * Formato padrão de resposta da API
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    timestamp?: string
    total?: number
    page?: number
    perPage?: number
    [key: string]: any
  }
}

/**
 * Cria uma resposta de sucesso padronizada
 */
export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>["meta"],
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  )
}

/**
 * Cria uma resposta de erro padronizada
 */
export function errorResponse(
  error: string | Error,
  status: number = 500,
  meta?: Record<string, any>
): NextResponse<ApiResponse<never>> {
  const errorMessage = error instanceof Error ? error.message : error

  // Log do erro no servidor
  console.error("[API Error]", {
    error: errorMessage,
    status,
    timestamp: new Date().toISOString(),
    ...meta,
  })

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  )
}

/**
 * Define o tipo de erro baseado em suas propriedades
 */
function getErrorType(error: Error): "validation" | "authorization" | "notFound" | "generic" {
  const errorName = error.name?.toLowerCase() || ""
  const errorMsg = error.message?.toLowerCase() || ""

  // Verifica pelo nome do erro primeiro (mais confiável)
  if (errorName === "validationerror" || errorName === "typeerror") {
    return "validation"
  }

  if (errorName === "unauthorizederror" || errorName === "forbiddenerror") {
    return "authorization"
  }

  if (errorName === "notfounderror") {
    return "notFound"
  }

  // Fallback para análise de mensagem como último recurso
  if (errorMsg.includes("validation") || errorMsg.includes("invalid")) {
    return "validation"
  }

  if (errorMsg.includes("unauthorized") || errorMsg.includes("forbidden")) {
    return "authorization"
  }

  if (errorMsg.includes("not found")) {
    return "notFound"
  }

  return "generic"
}

/**
 * Handler de erro genérico para rotas de API
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  console.error(`[API Error${context ? ` - ${context}` : ""}]`, error)

  if (error instanceof Error) {
    const errorType = getErrorType(error)

    switch (errorType) {
      case "validation":
        return errorResponse(error.message, 400)
      case "authorization":
        return errorResponse(error.message, 403)
      case "notFound":
        return errorResponse(error.message, 404)
      default:
        return errorResponse(error.message, 500)
    }
  }

  // Erro desconhecido
  return errorResponse("Erro interno do servidor", 500)
}

/**
 * Valida se o usuário está autenticado
 */
export function requireAuth(request: Request): string | null {
  const authHeader = request.headers.get("authorization")
  const cookieHeader = request.headers.get("cookie")

  // Verifica token Bearer
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  // Verifica cookie de sessão
  if (cookieHeader) {
    const sessionMatch = cookieHeader.match(/session=([^;]+)/)
    if (sessionMatch) {
      return sessionMatch[1]
    }
  }

  return null
}

/**
 * Extrai parâmetros de paginação da URL
 */
export function getPaginationParams(url: URL): {
  page: number
  perPage: number
  offset: number
} {
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage")) || 30))
  const offset = (page - 1) * perPage

  return { page, perPage, offset }
}
