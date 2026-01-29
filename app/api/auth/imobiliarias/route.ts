import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, nome
      FROM imobiliarias
      WHERE is_active = true
      ORDER BY nome ASC
    `)

    const imobiliarias = result.rows.map(row => ({
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