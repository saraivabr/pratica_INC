import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Gerar código único para certificado
function generateCertificateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'CP-';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const moduloId = searchParams.get('modulo_id');

        // Verificar autenticação e obter contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;
        const { workspaceId, user } = ctx;

        // Buscar progresso geral do usuário
        let query: string;
        let params: any[];

        if (moduloId) {
            // Progresso de um módulo específico
            query = `
                SELECT
                    p.lesson_id,
                    p.completed_at,
                    l.titulo,
                    l.slug
                FROM academy_progress p
                JOIN academy_lessons l ON l.id = p.lesson_id
                WHERE p.user_id = $1 AND l.modulo_id = $2
                ORDER BY p.completed_at DESC
            `;
            params = [user.id, parseInt(moduloId)];
        } else {
            // Progresso geral (última lição, total, etc.)
            query = `
                SELECT
                    p.lesson_id,
                    p.completed_at,
                    l.titulo as licao_titulo,
                    l.slug as licao_slug,
                    m.id as modulo_id,
                    m.nome as modulo_nome,
                    m.slug as modulo_slug,
                    c.id as categoria_id,
                    c.nome as categoria_nome,
                    c.slug as categoria_slug
                FROM academy_progress p
                JOIN academy_lessons l ON l.id = p.lesson_id
                JOIN academy_modules m ON m.id = l.modulo_id
                JOIN academy_categories c ON c.id = m.categoria_id
                WHERE p.user_id = $1
                ORDER BY p.completed_at DESC
            `;
            params = [user.id];
        }

        const result = await pool.query(query, params);

        // Estatísticas gerais
        const statsQuery = `
            SELECT
                (SELECT COUNT(*) FROM academy_progress WHERE user_id = $1) as total_completas,
                (SELECT COUNT(*) FROM academy_lessons WHERE ativo = true AND workspace_id = $2) as total_licoes,
                (SELECT COUNT(*) FROM academy_certificates WHERE user_id = $1) as total_certificados
        `;
        const statsResult = await pool.query(statsQuery, [user.id, workspaceId]);
        const stats = statsResult.rows[0];

        // Última lição acessada (para "Continue de onde parou")
        const lastLessonQuery = `
            SELECT
                l.id, l.slug, l.titulo,
                m.slug as modulo_slug, m.nome as modulo_nome,
                c.slug as categoria_slug, c.nome as categoria_nome
            FROM academy_progress p
            JOIN academy_lessons l ON l.id = p.lesson_id
            JOIN academy_modules m ON m.id = l.modulo_id
            JOIN academy_categories c ON c.id = m.categoria_id
            WHERE p.user_id = $1
            ORDER BY p.completed_at DESC
            LIMIT 1
        `;
        const lastLessonResult = await pool.query(lastLessonQuery, [user.id]);
        const lastLesson = lastLessonResult.rows[0] || null;

        // Próxima lição a fazer (se tiver última lição)
        let nextLesson = null;
        if (lastLesson) {
            const nextQuery = `
                SELECT
                    l.id, l.slug, l.titulo,
                    m.slug as modulo_slug, m.nome as modulo_nome,
                    c.slug as categoria_slug
                FROM academy_lessons l
                JOIN academy_modules m ON m.id = l.modulo_id AND m.ativo = true
                JOIN academy_categories c ON c.id = m.categoria_id AND c.ativo = true
                WHERE l.ativo = true
                  AND l.id NOT IN (SELECT lesson_id FROM academy_progress WHERE user_id = $1)
                ORDER BY c.ordem, m.ordem, l.ordem
                LIMIT 1
            `;
            const nextResult = await pool.query(nextQuery, [user.id]);
            nextLesson = nextResult.rows[0] || null;
        }

        return NextResponse.json({
            data: result.rows,
            stats: {
                total_completas: parseInt(stats.total_completas || '0'),
                total_licoes: parseInt(stats.total_licoes || '0'),
                total_certificados: parseInt(stats.total_certificados || '0'),
                progresso_geral: parseInt(stats.total_licoes || '0') > 0
                    ? Math.round((parseInt(stats.total_completas || '0') / parseInt(stats.total_licoes || '1')) * 100)
                    : 0
            },
            last_lesson: lastLesson,
            next_lesson: nextLesson
        });
    } catch (error) {
        console.error('Erro ao buscar progresso:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar progresso', details: String(error) },
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

        const body = await request.json();
        const { lesson_id } = body;

        if (!lesson_id) {
            return NextResponse.json(
                { error: 'lesson_id é obrigatório' },
                { status: 400 }
            );
        }

        // Verificar se a lição existe
        const lessonQuery = `
            SELECT l.id, l.modulo_id, m.nome as modulo_nome
            FROM academy_lessons l
            JOIN academy_modules m ON m.id = l.modulo_id
            WHERE l.id = $1 AND l.ativo = true
        `;
        const lessonResult = await pool.query(lessonQuery, [lesson_id]);

        if (lessonResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Lição não encontrada' },
                { status: 404 }
            );
        }

        const lesson = lessonResult.rows[0];

        // Marcar como completa (upsert)
        const progressQuery = `
            INSERT INTO academy_progress (workspace_id, user_id, lesson_id, completed_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed_at = NOW()
            RETURNING *
        `;
        const progressResult = await pool.query(progressQuery, [workspaceId, user.id, lesson_id]);

        // Verificar se completou todas as lições do módulo
        const moduleProgressQuery = `
            SELECT
                (SELECT COUNT(*) FROM academy_lessons WHERE modulo_id = $1 AND ativo = true) as total,
                (SELECT COUNT(*) FROM academy_progress p
                 JOIN academy_lessons l ON l.id = p.lesson_id
                 WHERE l.modulo_id = $1 AND p.user_id = $2) as completed
        `;
        const moduleProgress = await pool.query(moduleProgressQuery, [lesson.modulo_id, user.id]);
        const { total, completed } = moduleProgress.rows[0];
        const moduleCompleted = parseInt(total) > 0 && parseInt(completed) >= parseInt(total);

        let certificate = null;

        // Se completou o módulo, emitir certificado
        if (moduleCompleted) {
            const existingCertQuery = `
                SELECT * FROM academy_certificates
                WHERE user_id = $1 AND modulo_id = $2
            `;
            const existingCert = await pool.query(existingCertQuery, [user.id, lesson.modulo_id]);

            if (existingCert.rows.length === 0) {
                const certCode = generateCertificateCode();
                const certQuery = `
                    INSERT INTO academy_certificates (workspace_id, user_id, modulo_id, codigo, emitido_em)
                    VALUES ($1, $2, $3, $4, NOW())
                    RETURNING *
                `;
                const certResult = await pool.query(certQuery, [workspaceId, user.id, lesson.modulo_id, certCode]);
                certificate = {
                    ...certResult.rows[0],
                    modulo_nome: lesson.modulo_nome,
                    is_new: true
                };
            } else {
                certificate = {
                    ...existingCert.rows[0],
                    modulo_nome: lesson.modulo_nome,
                    is_new: false
                };
            }
        }

        return NextResponse.json({
            data: progressResult.rows[0],
            module_completed: moduleCompleted,
            certificate,
            message: moduleCompleted
                ? 'Parabéns! Você completou o módulo!'
                : 'Lição marcada como completa'
        });
    } catch (error) {
        console.error('Erro ao registrar progresso:', error);
        return NextResponse.json(
            { error: 'Erro ao registrar progresso', details: String(error) },
            { status: 500 }
        );
    }
}
