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
    const { telefone, nome, imobiliaria } = validation.data;

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

    // Resolve imobiliaria - simplified
    let imobiliariaId = null;
    const imobiliariaName = imobiliaria?.trim();

    if (imobiliariaName && imobiliariaName.toLowerCase() !== 'autonomo') {
      // Try to find existing imobiliaria by name (case-insensitive)
      const { rows: imobiliariaRows } = await dbQuery(
        `select id from imobiliarias where lower(nome) = lower($1) limit 1`,
        [imobiliariaName]
      );

      if (imobiliariaRows.length > 0) {
        imobiliariaId = imobiliariaRows[0].id;
      } else {
        // Create new imobiliaria
        const { rows: newImobiliariaRows } = await dbQuery(
          `insert into imobiliarias (nome, is_active) values ($1, true) returning id`,
          [imobiliariaName]
        );
        imobiliariaId = newImobiliariaRows[0]?.id;
      }
    }
    // Se não informou imobiliária, deixa null (autônomo)

    // Create user - simplified without gerente
    // Email é obrigatório no banco, então geramos um baseado no telefone
    const generatedEmail = `${normalizedPhone}@corretor.pratica.app`;

    const { rows: userRows } = await dbQuery(
      `insert into users (telefone, nome, email, role, imobiliaria_id, onboarding_status, is_active)
       values ($1, $2, $3, 'corretor', $4, 'completed', true)
       returning id, telefone, nome, role, imobiliaria_id`,
      [normalizedPhone, nome, generatedEmail, imobiliariaId]
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
  } catch (error: any) {
    console.error('Error in register:', error);
    // Retorna mensagem mais específica em dev
    const message = process.env.NODE_ENV === 'development'
      ? `Erro: ${error?.message || 'desconhecido'}`
      : 'Erro interno do servidor';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
