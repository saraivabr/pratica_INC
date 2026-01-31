import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { normalizePhone } from '@/lib/supabase';
import { validateRequest, RegisterSchema } from '@/lib/validation-schemas';

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(request, RegisterSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { telefone, nome, imobiliaria, gerente } = validation.data;

    const normalizedPhone = normalizePhone(telefone);

    // Check if user already exists
    const { rows: existingUsers } = await dbQuery(
      `select id from users where telefone = $1 limit 1`,
      [normalizedPhone]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Este telefone já está cadastrado no sistema' },
        { status: 409 }
      );
    }

    // Resolve imobiliaria
    let imobiliariaId = null;
    if (imobiliaria && imobiliaria.toLowerCase() !== 'autonomo') {
      // Try to find existing imobiliaria by name (case-insensitive)
      const { rows: imobiliariaRows } = await dbQuery(
        `select id from imobiliarias where lower(nome) = lower($1) and is_active = true limit 1`,
        [imobiliaria]
      );
      
      if (imobiliariaRows.length > 0) {
        imobiliariaId = imobiliariaRows[0].id;
      } else {
        // Create new imobiliaria
        const { rows: newImobiliariaRows } = await dbQuery(
          `insert into imobiliarias (nome, is_active) values ($1, true) returning id`,
          [imobiliaria]
        );
        imobiliariaId = newImobiliariaRows[0]?.id;
      }
    } else {
      // Use "Orcioli Realizando Sonhos" for autonomous
      const { rows: orcioliRows } = await dbQuery(
        `select id from imobiliarias where nome = $1 and is_active = true limit 1`,
        ['Orcioli Realizando Sonhos']
      );
      
      if (orcioliRows.length > 0) {
        imobiliariaId = orcioliRows[0].id;
      } else {
        // Create Orcioli if it doesn't exist
        const { rows: newOrcioliRows } = await dbQuery(
          `insert into imobiliarias (nome, is_active) values ($1, true) returning id`,
          ['Orcioli Realizando Sonhos']
        );
        imobiliariaId = newOrcioliRows[0]?.id;
      }
    }

    // Resolve gerente
    let gerenteId = null;
    if (gerente && gerente.toLowerCase() !== 'nao tenho' && gerente.toLowerCase() !== 'não tenho') {
      // Try to find existing gerente by exact name match
      const { rows: gerenteRows } = await dbQuery(
        `select id from users where lower(nome) = lower($1) and role in ('gerente', 'admin') and is_active = true limit 1`,
        [gerente]
      );
      
      if (gerenteRows.length > 0) {
        gerenteId = gerenteRows[0].id;
      }
    }

    // Create user
    const { rows: userRows } = await dbQuery(
      `insert into users (telefone, nome, role, imobiliaria_id, gerente_id, onboarding_status, is_active)
       values ($1, $2, 'corretor', $3, $4, 'completed', true)
       returning id, telefone, nome, role, imobiliaria_id, gerente_id`,
      [normalizedPhone, nome, imobiliariaId, gerenteId]
    );

    const newUser = userRows[0];

    if (!newUser) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso!',
      user: {
        id: newUser.id,
        nome: newUser.nome,
        telefone: newUser.telefone,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Error in register:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
