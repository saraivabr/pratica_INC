/**
 * Middleware de autenticação para rotas de API
 * Wrapper para getAuthenticatedUser que lança erro se não autenticado
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { type User } from '@/lib/supabase';

/**
 * Requer que o usuário esteja autenticado
 * @throws Error se não autenticado
 */
export async function requireUser(request: NextRequest): Promise<User | null> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return null; // Deixar a rota tratar o erro
  }
  
  return user;
}

/**
 * Verifica se usuário é admin
 */
export async function requireAdmin(request: NextRequest): Promise<User> {
  const user = await requireUser(request);
  
  if (!user) {
    throw new Error('Não autenticado');
  }
  
  if (user.role !== 'admin' && user.role !== 'gerente') {
    throw new Error('Acesso negado');
  }
  
  return user;
}

/**
 * Verifica se usuário é corretor
 */
export async function requireCorretor(request: NextRequest): Promise<User> {
  const user = await requireUser(request);
  
  if (!user) {
    throw new Error('Não autenticado');
  }
  
  if (user.role !== 'corretor' && user.role !== 'admin' && user.role !== 'gerente') {
    throw new Error('Acesso negado: apenas corretores');
  }
  
  return user;
}
