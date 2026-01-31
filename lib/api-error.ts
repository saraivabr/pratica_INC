import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard API Error class for route handlers
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string) {
    return new ApiError(400, message, code || 'BAD_REQUEST');
  }

  static unauthorized(message = 'Não autorizado') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Acesso negado') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Recurso não encontrado') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static tooManyRequests(retryAfter?: number) {
    const error = new ApiError(429, 'Muitas requisições. Tente novamente mais tarde.', 'RATE_LIMITED');
    (error as any).retryAfter = retryAfter;
    return error;
  }

  static internal(message = 'Erro interno do servidor') {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }

  static timeout(message = 'A requisição excedeu o tempo limite') {
    return new ApiError(504, message, 'TIMEOUT');
  }
}

/**
 * Convert any error to a standardized NextResponse
 */
export function handleApiError(error: unknown): NextResponse {
  // Known ApiError
  if (error instanceof ApiError) {
    const body: Record<string, any> = {
      error: error.message,
      code: error.code,
    };
    if ((error as any).retryAfter) {
      body.retryAfter = (error as any).retryAfter;
    }
    return NextResponse.json(body, { status: error.statusCode });
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // AbortError (timeout)
  if (error instanceof Error && error.name === 'AbortError') {
    return NextResponse.json(
      { error: 'A requisição excedeu o tempo limite', code: 'TIMEOUT' },
      { status: 504 }
    );
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  console.error('[API Error]', error);

  // Don't leak internal details in production
  const safeMessage = process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : message;

  return NextResponse.json(
    { error: safeMessage, code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

/**
 * Wrapper for route handlers with automatic error handling
 *
 * Usage:
 * export const GET = withErrorHandler(async (request) => {
 *   // your logic here
 *   return NextResponse.json({ data });
 * });
 */
export function withErrorHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
