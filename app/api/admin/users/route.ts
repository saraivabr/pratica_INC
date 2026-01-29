import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { normalizePhone } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== "admin" && user.role !== "gerente")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imobiliariaId = searchParams.get("imobiliaria_id");

    let query = `
      SELECT u.*, i.nome as imobiliaria_nome,
        g.nome as gerente_nome
      FROM users u
      LEFT JOIN imobiliarias i ON i.id = u.imobiliaria_id
      LEFT JOIN users g ON g.id = u.gerente_id
    `;
    const params: any[] = [];

    if (imobiliariaId) {
      query += ` WHERE u.imobiliaria_id = $1`;
      params.push(imobiliariaId);
    }

    query += ` ORDER BY u.nome ASC`;

    const { rows } = await dbQuery(query, params);

    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== "admin" && user.role !== "gerente")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nome, telefone, role, imobiliaria_id, gerente_id } = body;

    if (!nome || !telefone) {
      return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(telefone);

    // Check if phone already exists
    const { rows: existing } = await dbQuery(
      `SELECT id FROM users WHERE telefone = $1`,
      [normalizedPhone]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "Telefone já cadastrado" }, { status: 400 });
    }

    // Gerentes can only create corretores in their imobiliaria
    let finalImobiliariaId = imobiliaria_id;
    let finalGerenteId = gerente_id;
    let finalRole = role || "corretor";

    if (user.role === "gerente") {
      finalImobiliariaId = user.imobiliaria_id;
      finalGerenteId = user.id;
      finalRole = "corretor"; // Gerentes só podem criar corretores
    }

    const { rows } = await dbQuery(
      `INSERT INTO users (nome, telefone, role, imobiliaria_id, gerente_id, is_active, onboarding_status)
       VALUES ($1, $2, $3, $4, $5, true, 'completed')
       RETURNING *`,
      [nome, normalizedPhone, finalRole, finalImobiliariaId || null, finalGerenteId || null]
    );

    return NextResponse.json({ user: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== "admin" && user.role !== "gerente")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, nome, telefone, role, imobiliaria_id, gerente_id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    // Gerentes só podem editar usuários da sua imobiliária
    if (user.role === "gerente") {
      const { rows: targetUser } = await dbQuery(
        `SELECT imobiliaria_id FROM users WHERE id = $1`,
        [id]
      );
      if (targetUser[0]?.imobiliaria_id !== user.imobiliaria_id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const normalizedPhone = telefone ? normalizePhone(telefone) : null;

    const { rows } = await dbQuery(
      `UPDATE users
       SET nome = COALESCE($2, nome),
           telefone = COALESCE($3, telefone),
           role = COALESCE($4, role),
           imobiliaria_id = COALESCE($5, imobiliaria_id),
           gerente_id = COALESCE($6, gerente_id),
           is_active = COALESCE($7, is_active)
       WHERE id = $1
       RETURNING *`,
      [id, nome, normalizedPhone, role, imobiliaria_id, gerente_id, is_active]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user: rows[0] });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    // Prevent deleting self
    if (id === user.id) {
      return NextResponse.json({ error: "Não é possível excluir seu próprio usuário" }, { status: 400 });
    }

    await dbQuery(`DELETE FROM users WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
