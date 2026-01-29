/**
 * API: Gerenciar Tenant Individual
 *
 * GET /api/tenants/:id - Obter detalhes do tenant
 * PATCH /api/tenants/:id - Atualizar tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenant, updateTenant } from '@/lib/tenant-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = parseInt(id);

    if (isNaN(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const tenant = await getTenant(tenantId);

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
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = parseInt(id);

    if (isNaN(tenantId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const tenant = await updateTenant(tenantId, body);

    return NextResponse.json({
      success: true,
      data: tenant
    });
  } catch (error: any) {
    console.error('Error updating tenant:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
