/**
 * API: Gerenciar Tenants (Empresas/Clientes)
 *
 * GET /api/tenants - Listar todos os tenants
 * POST /api/tenants - Criar novo tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { listTenants, createTenant } from '@/lib/tenant-context';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';

    const tenants = await listTenants(status as any);

    return NextResponse.json({
      success: true,
      data: tenants,
      total: tenants.length
    });
  } catch (error: any) {
    console.error('Error listing tenants:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Validar formato do slug (apenas letras minúsculas, números e hífens)
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slug deve conter apenas letras minúsculas, números e hífens'
        },
        { status: 400 }
      );
    }

    // Validar comprimento
    if (body.slug.length < 3 || body.slug.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: 'Slug deve ter entre 3 e 50 caracteres'
        },
        { status: 400 }
      );
    }

    if (body.name.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nome deve ter pelo menos 2 caracteres'
        },
        { status: 400 }
      );
    }

    const tenant = await createTenant({
      slug: body.slug,
      name: body.name,
      cvcrm_config: body.cvcrm_config,
      plan: body.plan || 'free',
      metadata: body.metadata || {}
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
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
