/**
 * API: Gerenciar Tenants (Empresas/Clientes)
 *
 * GET /api/tenants - Listar todos os tenants (admin only)
 * POST /api/tenants - Criar novo tenant (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { listTenants, createTenant } from '@/lib/tenant-context';
import { getAuthenticatedUser } from '@/lib/api-auth';

async function requireAdmin(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('status') !== 'inactive';

    const tenants = await listTenants(isActive);

    return NextResponse.json({
      success: true,
      data: tenants,
      total: tenants.length
    });
  } catch (error: any) {
    console.error('Error listing tenants:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.slug || !body.name || !body.cvcrm_config) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: slug, name, cvcrm_config'
        },
        { status: 400 }
      );
    }

    const tenant = await createTenant({
      owner_id: user.id,
      slug: body.slug,
      name: body.name,
      cvcrm_config: body.cvcrm_config,
      plan: body.plan || 'free',
    });

    return NextResponse.json({
      success: true,
      data: tenant
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tenant:', error);

    if (error.code === '23505') {
      // Unique violation
      return NextResponse.json(
        { success: false, error: 'Tenant with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
