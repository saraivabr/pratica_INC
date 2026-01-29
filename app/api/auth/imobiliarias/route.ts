import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'

export async function GET() {
  try {
    // Buscar imobiliárias ativas ordenadas por nome
    const { rows } = await dbQuery(`
      SELECT id, nome
      FROM imobiliarias
      WHERE is_active = true
        AND nome NOT ILIKE '%construtora%'
        AND nome NOT ILIKE '%incorpora%'
        AND nome NOT ILIKE '%engenharia%'
      ORDER BY nome ASC
      LIMIT 500
    `)

    const imobiliarias = rows.map(row => ({
      id: row.id,
      nome: row.nome
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
