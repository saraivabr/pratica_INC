import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const moduloSlug = searchParams.get('modulo');
        const moduloId = searchParams.get('modulo_id');
        const licaoSlug = searchParams.get('licao'); // Para buscar uma lição específica

        // Verificar autenticação e obter contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;
        const { workspaceId, user } = ctx;

        // Se solicitando uma lição específica
        if (licaoSlug && moduloSlug) {
            const lessonQuery = `
                SELECT
                    l.id, l.slug, l.titulo, l.conteudo, l.resumo, l.duracao_minutos, l.ordem,
                    m.id as modulo_id, m.slug as modulo_slug, m.nome as modulo_nome,
                    c.id as categoria_id, c.slug as categoria_slug, c.nome as categoria_nome
                FROM academy_lessons l
                JOIN academy_modules m ON m.id = l.modulo_id AND m.ativo = true
                JOIN academy_categories c ON c.id = m.categoria_id AND c.ativo = true
                WHERE l.workspace_id = $1 AND l.ativo = true
                  AND m.slug = $2 AND l.slug = $3
            `;
            const lessonResult = await pool.query(lessonQuery, [workspaceId, moduloSlug, licaoSlug]);

            if (lessonResult.rows.length === 0) {
                return NextResponse.json({ error: 'Lição não encontrada' }, { status: 404 });
            }

            const lesson = lessonResult.rows[0];

            // Verificar se completou
            const progressQuery = `
                SELECT completed_at FROM academy_progress
                WHERE lesson_id = $1 AND user_id = $2
            `;
            const progressResult = await pool.query(progressQuery, [lesson.id, user.id]);
            lesson.completed = progressResult.rows.length > 0;
            lesson.completed_at = progressResult.rows[0]?.completed_at || null;

            // Buscar lições anterior e próxima
            const navQuery = `
                SELECT id, slug, titulo, ordem FROM academy_lessons
                WHERE modulo_id = $1 AND ativo = true
                ORDER BY ordem ASC
            `;
            const navResult = await pool.query(navQuery, [lesson.modulo_id]);
            const lessons = navResult.rows;
            const currentIndex = lessons.findIndex((l: any) => l.id === lesson.id);

            lesson.prev_lesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
            lesson.next_lesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

            return NextResponse.json({ data: lesson });
        }

        // Listar todas as lições de um módulo
        let whereClause = 'WHERE l.workspace_id = $1 AND l.ativo = true';
        const params: any[] = [workspaceId];
        let paramIndex = 2;

        if (moduloSlug) {
            whereClause += ` AND m.slug = $${paramIndex}`;
            params.push(moduloSlug);
            paramIndex++;
        } else if (moduloId) {
            whereClause += ` AND l.modulo_id = $${paramIndex}`;
            params.push(parseInt(moduloId));
            paramIndex++;
        } else {
            return NextResponse.json(
                { error: 'Informe modulo ou modulo_id' },
                { status: 400 }
            );
        }

        const query = `
            SELECT
                l.id, l.slug, l.titulo, l.resumo, l.duracao_minutos, l.ordem,
                m.id as modulo_id, m.slug as modulo_slug, m.nome as modulo_nome,
                c.id as categoria_id, c.slug as categoria_slug, c.nome as categoria_nome
            FROM academy_lessons l
            JOIN academy_modules m ON m.id = l.modulo_id AND m.ativo = true
            JOIN academy_categories c ON c.id = m.categoria_id AND c.ativo = true
            ${whereClause}
            ORDER BY l.ordem ASC, l.titulo ASC
        `;

        const result = await pool.query(query, params);

        // Adicionar status de progresso para cada lição
        const lessonsWithProgress = await Promise.all(
            result.rows.map(async (lesson) => {
                const progressQuery = `
                    SELECT completed_at FROM academy_progress
                    WHERE lesson_id = $1 AND user_id = $2
                `;
                const progressResult = await pool.query(progressQuery, [lesson.id, user.id]);

                return {
                    ...lesson,
                    completed: progressResult.rows.length > 0,
                    completed_at: progressResult.rows[0]?.completed_at || null
                };
            })
        );

        // Informações do módulo
        let moduleInfo = null;
        if (result.rows.length > 0) {
            moduleInfo = {
                id: result.rows[0].modulo_id,
                slug: result.rows[0].modulo_slug,
                nome: result.rows[0].modulo_nome,
                categoria_id: result.rows[0].categoria_id,
                categoria_slug: result.rows[0].categoria_slug,
                categoria_nome: result.rows[0].categoria_nome
            };
        }

        return NextResponse.json({
            data: lessonsWithProgress,
            module: moduleInfo,
            total: lessonsWithProgress.length,
            completed: lessonsWithProgress.filter(l => l.completed).length
        });
    } catch (error) {
        console.error('Erro ao buscar lições:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar lições', details: String(error) },
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
        const { modulo_id, slug, titulo, conteudo, resumo, duracao_minutos, ordem } = body;

        if (!modulo_id || !slug || !titulo || !conteudo) {
            return NextResponse.json(
                { error: 'Módulo, slug, título e conteúdo são obrigatórios' },
                { status: 400 }
            );
        }

        const query = `
            INSERT INTO academy_lessons (workspace_id, modulo_id, slug, titulo, conteudo, resumo, duracao_minutos, ordem)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const result = await pool.query(query, [
            workspaceId,
            modulo_id,
            slug,
            titulo,
            conteudo,
            resumo || null,
            duracao_minutos || 5,
            ordem || 0
        ]);

        // Atualizar duração total do módulo
        await pool.query(`
            UPDATE academy_modules
            SET duracao_minutos = (
                SELECT COALESCE(SUM(duracao_minutos), 0)
                FROM academy_lessons
                WHERE modulo_id = $1 AND ativo = true
            )
            WHERE id = $1
        `, [modulo_id]);

        return NextResponse.json({
            data: result.rows[0],
            message: 'Lição criada com sucesso'
        });
    } catch (error) {
        console.error('Erro ao criar lição:', error);
        return NextResponse.json(
            { error: 'Erro ao criar lição', details: String(error) },
            { status: 500 }
        );
    }
}
