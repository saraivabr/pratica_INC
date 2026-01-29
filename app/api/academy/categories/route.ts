import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export async function GET(request: NextRequest) {
    try {
        // Verificar autenticação e obter contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;
        const { workspaceId, user } = ctx;

        // Buscar categorias ativas
        const query = `
            SELECT
                c.id, c.slug, c.nome, c.descricao, c.icone, c.cor, c.ordem,
                COUNT(DISTINCT m.id) as total_modulos,
                COUNT(DISTINCT l.id) as total_licoes
            FROM academy_categories c
            LEFT JOIN academy_modules m ON m.categoria_id = c.id AND m.ativo = true
            LEFT JOIN academy_lessons l ON l.modulo_id = m.id AND l.ativo = true
            WHERE c.workspace_id = $1 AND c.ativo = true
            GROUP BY c.id
            ORDER BY c.ordem ASC, c.nome ASC
        `;

        const result = await pool.query(query, [workspaceId]);

        // Para cada categoria, buscar progresso do usuário
        const categoriesWithProgress = await Promise.all(
            result.rows.map(async (category) => {
                const progressQuery = `
                    SELECT COUNT(*) as completed
                    FROM academy_progress p
                    JOIN academy_lessons l ON l.id = p.lesson_id
                    JOIN academy_modules m ON m.id = l.modulo_id
                    WHERE m.categoria_id = $1 AND p.user_id = $2
                `;
                const progressResult = await pool.query(progressQuery, [category.id, user.id]);
                const completed = parseInt(progressResult.rows[0]?.completed || '0');
                const total = parseInt(category.total_licoes || '0');

                return {
                    ...category,
                    total_modulos: parseInt(category.total_modulos || '0'),
                    total_licoes: total,
                    licoes_completas: completed,
                    progresso: total > 0 ? Math.round((completed / total) * 100) : 0
                };
            })
        );

        return NextResponse.json({
            data: categoriesWithProgress,
            total: categoriesWithProgress.length
        });
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar categorias', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Verificar autenticação e obter contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;
        const { workspaceId, user } = ctx;

        // Verificar permissão admin
        if (user.role !== 'admin') {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const { slug, nome, descricao, icone, cor, ordem } = body;

        if (!slug || !nome) {
            return NextResponse.json(
                { error: 'Slug e nome são obrigatórios' },
                { status: 400 }
            );
        }

        const query = `
            INSERT INTO academy_categories (workspace_id, slug, nome, descricao, icone, cor, ordem)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await pool.query(query, [
            workspaceId,
            slug,
            nome,
            descricao || null,
            icone || null,
            cor || null,
            ordem || 0
        ]);

        return NextResponse.json({
            data: result.rows[0],
            message: 'Categoria criada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        return NextResponse.json(
            { error: 'Erro ao criar categoria', details: String(error) },
            { status: 500 }
        );
    }
}
