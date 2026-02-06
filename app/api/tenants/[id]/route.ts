/**
 * API: Gerenciar Tenant Individual
 *
 * GET /api/tenants/:id - Obter detalhes do tenant
 * PATCH /api/tenants/:id - Atualizar tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace, updateWorkspace } from '@/lib/tenant-context';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    if (ctx.user.role !== 'admin' && ctx.user.role !== 'gerente') {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const workspaceId = parseInt(id);

    if (isNaN(workspaceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const tenant = await getWorkspace(workspaceId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tenant
    });
  } catch (error: any) {
    console.error('Error getting tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    if (ctx.user.role !== 'admin' && ctx.user.role !== 'gerente') {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const workspaceId = parseInt(id);

    if (isNaN(workspaceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const tenant = await updateWorkspace(workspaceId, body);

    return NextResponse.json({
      success: true,
      data: tenant
    });
  } catch (error: any) {
    console.error('Error updating tenant:', error);

    if (error.message && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
