import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const categoriaSlug = searchParams.get('categoria');
        const categoriaId = searchParams.get('categoria_id');

        // Verificar autenticação e obter contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;
        const { workspaceId, user } = ctx;

        // Construir query
        let whereClause = 'WHERE m.workspace_id = $1 AND m.ativo = true';
        const params: any[] = [workspaceId];
        let paramIndex = 2;

        if (categoriaSlug) {
            whereClause += ` AND c.slug = $${paramIndex}`;
            params.push(categoriaSlug);
            paramIndex++;
        } else if (categoriaId) {
            whereClause += ` AND m.categoria_id = $${paramIndex}`;
            params.push(parseInt(categoriaId));
            paramIndex++;
        }

        const query = `
            SELECT
                m.id, m.slug, m.nome, m.descricao, m.imagem_url, m.duracao_minutos, m.ordem,
                c.id as categoria_id, c.slug as categoria_slug, c.nome as categoria_nome,
                COUNT(DISTINCT l.id) as total_licoes
            FROM academy_modules m
            JOIN academy_categories c ON c.id = m.categoria_id AND c.ativo = true
            LEFT JOIN academy_lessons l ON l.modulo_id = m.id AND l.ativo = true
            ${whereClause}
            GROUP BY m.id, c.id
            ORDER BY m.ordem ASC, m.nome ASC
        `;

        const result = await pool.query(query, params);

        // Adicionar progresso do usuário para cada módulo
        const modulesWithProgress = await Promise.all(
            result.rows.map(async (module) => {
                const progressQuery = `
                    SELECT COUNT(*) as completed
                    FROM academy_progress p
                    JOIN academy_lessons l ON l.id = p.lesson_id
                    WHERE l.modulo_id = $1 AND p.user_id = $2
                `;
                const progressResult = await pool.query(progressQuery, [module.id, user.id]);
                const completed = parseInt(progressResult.rows[0]?.completed || '0');
                const total = parseInt(module.total_licoes || '0');

                // Verificar se tem certificado
                const certQuery = `
                    SELECT codigo, emitido_em
                    FROM academy_certificates
                    WHERE modulo_id = $1 AND user_id = $2
                `;
                const certResult = await pool.query(certQuery, [module.id, user.id]);
                const certificate = certResult.rows[0] || null;

                return {
                    ...module,
                    total_licoes: total,
                    licoes_completas: completed,
                    progresso: total > 0 ? Math.round((completed / total) * 100) : 0,
                    concluido: total > 0 && completed >= total,
                    certificado: certificate
                };
            })
        );

        return NextResponse.json({
            data: modulesWithProgress,
            total: modulesWithProgress.length
        });
    } catch (error) {
        console.error('Erro ao buscar módulos:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar módulos', details: String(error) },
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
        const { categoria_id, slug, nome, descricao, imagem_url, duracao_minutos, ordem } = body;

        if (!categoria_id || !slug || !nome) {
            return NextResponse.json(
                { error: 'Categoria, slug e nome são obrigatórios' },
                { status: 400 }
            );
        }

        const query = `
            INSERT INTO academy_modules (workspace_id, categoria_id, slug, nome, descricao, imagem_url, duracao_minutos, ordem)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const result = await pool.query(query, [
            workspaceId,
            categoria_id,
            slug,
            nome,
            descricao || null,
            imagem_url || null,
            duracao_minutos || 0,
            ordem || 0
        ]);

        return NextResponse.json({
            data: result.rows[0],
            message: 'Módulo criado com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        return NextResponse.json(
            { error: 'Erro ao criar módulo', details: String(error) },
            { status: 500 }
        );
    }
}
