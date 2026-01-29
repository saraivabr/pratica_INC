import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    // Buscar imobiliárias ordenadas por quantidade de corretores (mais populares primeiro)
    const result = await pool.query(`
      SELECT i.id, i.nome, COUNT(c.id) as total_corretores
      FROM imobiliarias i
      LEFT JOIN cvcrm_corretores c 
        ON c.imobiliaria_id = i.id 
        OR LOWER(TRIM(c.imobiliaria_nome)) = LOWER(TRIM(i.nome))
      WHERE i.is_active = true
        AND i.nome NOT ILIKE '%construtora%'
        AND i.nome NOT ILIKE '%incorpora%'
        AND i.nome NOT ILIKE '%engenharia%'
      GROUP BY i.id, i.nome
      ORDER BY COUNT(c.id) DESC, i.nome COLLATE "pt-BR-x-icu" ASC
    `)

    const imobiliarias = result.rows.map(row => ({
      id: row.id,
      nome: row.nome,
      corretores: parseInt(row.total_corretores) || 0
    }))

    return NextResponse.json(imobiliarias)
  } catch (error) {
    console.error('Error fetching imobiliarias:', error)
    return NextResponse.json(
      { error: 'Failed to fetch imobiliarias' },
      { status: 500 }
    )
  }
}
