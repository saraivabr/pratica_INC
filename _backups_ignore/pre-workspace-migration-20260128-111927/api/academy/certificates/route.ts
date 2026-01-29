import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const codigo = searchParams.get('codigo'); // Para verificar um certificado específico

        // Verificar autenticação e obter contexto do tenant
        const ctx = await requireTenantContext(request);
        if (ctx.error) return ctx.error;
        const { tenantId, user } = ctx;

        // Se buscando certificado específico por código
        if (codigo) {
            const certQuery = `
                SELECT
                    c.id, c.codigo, c.emitido_em,
                    m.id as modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
                    cat.nome as categoria_nome, cat.slug as categoria_slug,
                    u.nome as usuario_nome, u.id as usuario_id
                FROM academy_certificates c
                JOIN academy_modules m ON m.id = c.modulo_id
                JOIN academy_categories cat ON cat.id = m.categoria_id
                JOIN users u ON u.id = c.user_id
                WHERE c.codigo = $1
            `;
            const certResult = await pool.query(certQuery, [codigo]);

            if (certResult.rows.length === 0) {
                return NextResponse.json(
                    { error: 'Certificado não encontrado' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                data: certResult.rows[0],
                valid: true
            });
        }

        // Listar todos os certificados do usuário
        const query = `
            SELECT
                c.id, c.codigo, c.emitido_em,
                m.id as modulo_id, m.nome as modulo_nome, m.slug as modulo_slug,
                m.duracao_minutos,
                cat.id as categoria_id, cat.nome as categoria_nome,
                cat.slug as categoria_slug, cat.icone, cat.cor,
                (SELECT COUNT(*) FROM academy_lessons WHERE modulo_id = m.id AND ativo = true) as total_licoes
            FROM academy_certificates c
            JOIN academy_modules m ON m.id = c.modulo_id
            JOIN academy_categories cat ON cat.id = m.categoria_id
            WHERE c.user_id = $1
            ORDER BY c.emitido_em DESC
        `;

        const result = await pool.query(query, [user.id]);

        // Módulos disponíveis para certificação (em progresso ou não iniciados)
        const availableQuery = `
            SELECT
                m.id, m.nome, m.slug, m.duracao_minutos,
                cat.nome as categoria_nome, cat.slug as categoria_slug,
                (SELECT COUNT(*) FROM academy_lessons WHERE modulo_id = m.id AND ativo = true) as total_licoes,
                (SELECT COUNT(*) FROM academy_progress p
                 JOIN academy_lessons l ON l.id = p.lesson_id
                 WHERE l.modulo_id = m.id AND p.user_id = $1) as completed_licoes
            FROM academy_modules m
            JOIN academy_categories cat ON cat.id = m.categoria_id AND cat.ativo = true
            WHERE m.ativo = true
              AND m.tenant_id = $2
              AND m.id NOT IN (SELECT modulo_id FROM academy_certificates WHERE user_id = $1)
            ORDER BY cat.ordem, m.ordem
        `;
        const availableResult = await pool.query(availableQuery, [user.id, tenantId]);

        const availableModules = availableResult.rows.map(m => ({
            ...m,
            total_licoes: parseInt(m.total_licoes || '0'),
            completed_licoes: parseInt(m.completed_licoes || '0'),
            progresso: parseInt(m.total_licoes || '0') > 0
                ? Math.round((parseInt(m.completed_licoes || '0') / parseInt(m.total_licoes || '1')) * 100)
                : 0
        }));

        return NextResponse.json({
            data: result.rows,
            total: result.rows.length,
            available_modules: availableModules.filter(m => m.total_licoes > 0)
        });
    } catch (error) {
        console.error('Erro ao buscar certificados:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar certificados', details: String(error) },
            { status: 500 }
        );
    }
}
