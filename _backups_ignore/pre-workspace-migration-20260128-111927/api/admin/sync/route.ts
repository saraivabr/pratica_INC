import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getImobiliariasCVCRM, getCorretoresCVCRM } from "@/lib/cvcrm-client";
import { normalizePhone } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-auth";

// POST - Sync data from CV CRM
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body; // 'imobiliarias' or 'corretores'

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    if (type === "imobiliarias") {
      try {
        const response = await getImobiliariasCVCRM();
        const imobiliarias = (response as any).imobiliarias || (response as any).data || [];

        for (const imob of imobiliarias) {
          const nome = imob.nome || imob.razao_social || imob.fantasia;
          if (!nome) continue;

          try {
            // Check if exists by name (case insensitive)
            const { rows: existing } = await dbQuery(
              `SELECT id FROM imobiliarias WHERE LOWER(nome) = LOWER($1)`,
              [nome]
            );

            if (existing.length > 0) {
              // Update
              await dbQuery(
                `UPDATE imobiliarias SET
                  cnpj = COALESCE($2, cnpj),
                  telefone = COALESCE($3, telefone),
                  email = COALESCE($4, email)
                WHERE id = $1`,
                [existing[0].id, imob.cnpj, imob.telefone, imob.email]
              );
              results.updated++;
            } else {
              // Create
              await dbQuery(
                `INSERT INTO imobiliarias (nome, cnpj, telefone, email)
                 VALUES ($1, $2, $3, $4)`,
                [nome, imob.cnpj || null, imob.telefone || null, imob.email || null]
              );
              results.created++;
            }
          } catch (err: any) {
            results.errors.push(`Imobiliária ${nome}: ${err.message}`);
          }
        }
      } catch (err: any) {
        return NextResponse.json({ error: `Erro ao buscar imobiliárias: ${err.message}` }, { status: 500 });
      }
    } else if (type === "corretores") {
      try {
        const response = await getCorretoresCVCRM();
        const corretores = (response as any).corretores || (response as any).data || [];

        for (const corretor of corretores) {
          const nome = corretor.nome;
          const telefone = corretor.telefone || corretor.celular;
          if (!nome || !telefone) continue;

          const normalizedPhone = normalizePhone(telefone);

          try {
            // Check if exists by phone
            const { rows: existing } = await dbQuery(
              `SELECT id FROM users WHERE telefone = $1`,
              [normalizedPhone]
            );

            // Try to find imobiliaria
            let imobiliariaId = null;
            if (corretor.imobiliaria || corretor.imobiliaria_nome) {
              const imobNome = corretor.imobiliaria || corretor.imobiliaria_nome;
              const { rows: imobs } = await dbQuery(
                `SELECT id FROM imobiliarias WHERE LOWER(nome) = LOWER($1)`,
                [imobNome]
              );
              if (imobs.length > 0) {
                imobiliariaId = imobs[0].id;
              }
            }

            if (existing.length > 0) {
              // Update
              await dbQuery(
                `UPDATE users SET
                  nome = COALESCE($2, nome),
                  imobiliaria_id = COALESCE($3, imobiliaria_id)
                WHERE id = $1`,
                [existing[0].id, nome, imobiliariaId]
              );
              results.updated++;
            } else {
              // Create
              await dbQuery(
                `INSERT INTO users (nome, telefone, role, imobiliaria_id, is_active, onboarding_status)
                 VALUES ($1, $2, 'corretor', $3, true, 'completed')`,
                [nome, normalizedPhone, imobiliariaId]
              );
              results.created++;
            }
          } catch (err: any) {
            results.errors.push(`Corretor ${nome}: ${err.message}`);
          }
        }
      } catch (err: any) {
        return NextResponse.json({ error: `Erro ao buscar corretores: ${err.message}` }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Tipo inválido. Use 'imobiliarias' ou 'corretores'" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      type,
      results,
    });
  } catch (error: any) {
    console.error("Error syncing:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}
