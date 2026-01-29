import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

// GET /api/crm/stages - Lista stages do pipeline
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    // Buscar stages padrão (simulado - pode vir do banco ou config)
    const stages = [
      { id: '1', name: 'Novo Lead', color: '#3B82F6', order: 1 },
      { id: '2', name: 'Contato Realizado', color: '#8B5CF6', order: 2 },
      { id: '3', name: 'Proposta Enviada', color: '#F59E0B', order: 3 },
      { id: '4', name: 'Negociação', color: '#EF4444', order: 4 },
      { id: '5', name: 'Ganho', color: '#10B981', order: 5 },
    ];

    return NextResponse.json({ stages });
  } catch (error) {
    console.error('Erro ao buscar stages:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar stages' },
      { status: 500 }
    );
  }
}
