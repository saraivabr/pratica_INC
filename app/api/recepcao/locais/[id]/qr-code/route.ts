/**
 * API: Gerar QR Code do Local
 *
 * GET /api/recepcao/locais/:id/qr-code - Retorna URL do QR Code para check-in
 * POST /api/recepcao/locais/:id/qr-code - Regenera token do QR Code
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LocalDB {
  id: string;
  nome: string;
  qr_code_token: string;
}

/**
 * GET /api/recepcao/locais/:id/qr-code
 * Retorna dados do QR Code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de local inválido' },
        { status: 400 }
      );
    }

    const result = await pool.query<LocalDB>(
      `SELECT id, nome, qr_code_token FROM recepcao_locais
       WHERE id = $1 AND workspace_id = $2 AND is_active = true`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Local não encontrado' },
        { status: 404 }
      );
    }

    const local = result.rows[0];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratica.app';
    const checkinUrl = `${baseUrl}/corretor/recepcao?qr=${local.qr_code_token}`;

    // URL para gerar QR Code via API externa (Google Charts)
    const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(checkinUrl)}`;

    return NextResponse.json({
      success: true,
      data: {
        local_id: local.id,
        local_nome: local.nome,
        qr_code_token: local.qr_code_token,
        checkin_url: checkinUrl,
        qr_code_image_url: qrCodeUrl,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar QR Code' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recepcao/locais/:id/qr-code
 * Regenera token do QR Code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de local inválido' },
        { status: 400 }
      );
    }

    const result = await pool.query<LocalDB>(
      `UPDATE recepcao_locais
       SET qr_code_token = gen_random_uuid(), updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND is_active = true
       RETURNING id, nome, qr_code_token`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Local não encontrado' },
        { status: 404 }
      );
    }

    const local = result.rows[0];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratica.app';
    const checkinUrl = `${baseUrl}/corretor/recepcao?qr=${local.qr_code_token}`;
    const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(checkinUrl)}`;

    return NextResponse.json({
      success: true,
      data: {
        local_id: local.id,
        local_nome: local.nome,
        qr_code_token: local.qr_code_token,
        checkin_url: checkinUrl,
        qr_code_image_url: qrCodeUrl,
      },
      message: 'QR Code regenerado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao regenerar QR Code:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao regenerar QR Code' },
      { status: 500 }
    );
  }
}
