import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

// GET - List all imobiliarias
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== "admin" && user.role !== "gerente")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { rows } = await dbQuery(`
      SELECT i.*,
        (SELECT COUNT(*) FROM users u WHERE u.imobiliaria_id = i.id) as total_users
      FROM imobiliarias i
      ORDER BY i.nome ASC
    `);

    return NextResponse.json({ imobiliarias: rows });
  } catch (error) {
    console.error("Error fetching imobiliarias:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST - Create new imobiliaria
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nome, cnpj, telefone, email, endereco } = body;

    if (!nome) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const { rows } = await dbQuery(
      `INSERT INTO imobiliarias (nome, cnpj, telefone, email, endereco)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome, cnpj || null, telefone || null, email || null, endereco || null]
    );

    return NextResponse.json({ imobiliaria: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating imobiliaria:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT - Update imobiliaria
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, nome, cnpj, telefone, email, endereco, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const { rows } = await dbQuery(
      `UPDATE imobiliarias
       SET nome = COALESCE($2, nome),
           cnpj = COALESCE($3, cnpj),
           telefone = COALESCE($4, telefone),
           email = COALESCE($5, email),
           endereco = COALESCE($6, endereco),
           is_active = COALESCE($7, is_active)
       WHERE id = $1
       RETURNING *`,
      [id, nome, cnpj, telefone, email, endereco, is_active]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Imobiliária não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ imobiliaria: rows[0] });
  } catch (error) {
    console.error("Error updating imobiliaria:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE - Delete imobiliaria
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

    // Check if there are users associated
    const { rows: users } = await dbQuery(
      `SELECT COUNT(*) as count FROM users WHERE imobiliaria_id = $1`,
      [id]
    );

    if (parseInt(users[0]?.count) > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir imobiliária com usuários associados" },
        { status: 400 }
      );
    }

    await dbQuery(`DELETE FROM imobiliarias WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting imobiliaria:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
