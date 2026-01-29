/**
 * API: Importar Convidados de Planilha
 *
 * POST /api/eventos/:id/convidados/importar
 * Importa convidados de arquivo Excel (.xlsx) ou CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

interface ConvidadoDB {
  id: string;
  evento_id: string;
  workspace_id: number;
  nome: string;
  celular: string;
  origem: string;
  cvcrm_id: number | null;
  status: string;
  created_at: string;
}

/**
 * Normaliza numero de celular para formato padrao
 */
function normalizeCelular(celular: string): string {
  // Remove tudo exceto numeros
  const digits = celular.replace(/\D/g, '');

  // Se ja tem codigo do pais, retorna
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }

  // Adiciona codigo do pais se necessario
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }

  return digits;
}

/**
 * Valida se o celular tem formato valido
 */
function isValidCelular(celular: string): boolean {
  const normalized = normalizeCelular(celular);
  // Celular brasileiro: 55 + DDD (2) + 9 + numero (8) = 13 digitos
  // ou telefone fixo: 55 + DDD (2) + numero (8) = 12 digitos
  return normalized.length >= 12 && normalized.length <= 13;
}

/**
 * Parse CSV content
 */
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Detectar delimitador (virgula, ponto-virgula ou tab)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  } else if (firstLine.includes('\t') && !firstLine.includes(',') && !firstLine.includes(';')) {
    delimiter = '\t';
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

/**
 * Encontra indice da coluna por nome (suporta variantes)
 */
function findColumnIndex(headers: string[], variants: string[]): number {
  for (const variant of variants) {
    const index = headers.findIndex((h) =>
      h.toLowerCase().includes(variant.toLowerCase())
    );
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * POST /api/eventos/:id/convidados/importar
 * Importa convidados de arquivo CSV ou Excel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id: eventoId } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventoId)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    // Verificar se evento existe e pertence ao tenant
    const eventoCheck = await pool.query(
      'SELECT id, status FROM eventos WHERE id = $1 AND workspace_id = $2',
      [eventoId, workspaceId]
    );

    if (eventoCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    if (eventoCheck.rows[0].status === 'cancelado') {
      return NextResponse.json(
        { success: false, error: 'Nao e possivel importar convidados em evento cancelado' },
        { status: 400 }
      );
    }

    // Processar form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Arquivo nao fornecido' },
        { status: 400 }
      );
    }

    // Verificar tipo de arquivo
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { success: false, error: 'Formato de arquivo nao suportado. Use CSV ou Excel (.xlsx)' },
        { status: 400 }
      );
    }

    let parsedData: { headers: string[]; rows: string[][] };

    if (isCSV) {
      // Parse CSV
      const content = await file.text();
      parsedData = parseCSV(content);
    } else {
      // Para Excel, usar uma biblioteca como xlsx
      // Por simplicidade, vamos exigir CSV por enquanto
      // Em producao, adicione: import * as XLSX from 'xlsx';
      try {
        // Tentar importar xlsx dinamicamente
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

        if (data.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Arquivo Excel vazio' },
            { status: 400 }
          );
        }

        parsedData = {
          headers: (data[0] as string[]).map((h) => String(h || '').toLowerCase().trim()),
          rows: data.slice(1).map((row) => (row as string[]).map((cell) => String(cell || '').trim())),
        };
      } catch (xlsxError) {
        console.error('Erro ao processar Excel:', xlsxError);
        return NextResponse.json(
          { success: false, error: 'Erro ao processar arquivo Excel. Tente usar CSV.' },
          { status: 400 }
        );
      }
    }

    const { headers, rows } = parsedData;

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Arquivo vazio ou sem dados validos' },
        { status: 400 }
      );
    }

    // Encontrar colunas de nome e celular
    const nomeIndex = findColumnIndex(headers, ['nome', 'name', 'corretor', 'convidado']);
    const celularIndex = findColumnIndex(headers, [
      'celular',
      'telefone',
      'phone',
      'whatsapp',
      'tel',
      'fone',
    ]);

    if (nomeIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coluna "Nome" nao encontrada. Colunas disponiveis: ' + headers.join(', '),
        },
        { status: 400 }
      );
    }

    if (celularIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coluna "Celular" nao encontrada. Colunas disponiveis: ' + headers.join(', '),
        },
        { status: 400 }
      );
    }

    // Extrair e validar convidados
    const convidados: { nome: string; celular: string }[] = [];
    const erros: { linha: number; motivo: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nome = row[nomeIndex]?.trim();
      const celular = row[celularIndex]?.trim();

      // Pular linhas vazias
      if (!nome && !celular) continue;

      // Validar nome
      if (!nome || nome.length < 2) {
        erros.push({ linha: i + 2, motivo: 'Nome invalido ou vazio' });
        continue;
      }

      // Validar celular
      if (!celular) {
        erros.push({ linha: i + 2, motivo: 'Celular vazio' });
        continue;
      }

      if (!isValidCelular(celular)) {
        erros.push({ linha: i + 2, motivo: `Celular invalido: ${celular}` });
        continue;
      }

      convidados.push({
        nome,
        celular: normalizeCelular(celular),
      });
    }

    if (convidados.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhum convidado valido encontrado no arquivo',
          erros: erros.slice(0, 10), // Mostrar apenas primeiros 10 erros
        },
        { status: 400 }
      );
    }

    // Verificar duplicatas no banco
    const celulares = convidados.map((c) => c.celular);
    const existingCheck = await pool.query(
      `SELECT celular FROM evento_convidados
       WHERE evento_id = $1 AND celular = ANY($2)`,
      [eventoId, celulares]
    );

    const existingCelulares = new Set(existingCheck.rows.map((r) => r.celular));

    // Filtrar convidados novos
    const novosConvidados = convidados.filter((c) => !existingCelulares.has(c.celular));
    const duplicados = convidados.length - novosConvidados.length;

    if (novosConvidados.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Todos os convidados ja estavam cadastrados',
        added: 0,
        skipped: duplicados,
        erros: erros.slice(0, 10),
      });
    }

    // Inserir novos convidados
    const insertValues: any[][] = novosConvidados.map((c) => [
      eventoId,
      workspaceId,
      c.nome,
      c.celular,
      'importado',
      null, // cvcrm_id
      'pendente',
    ]);

    const placeholders = insertValues
      .map(
        (_, i) =>
          `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
      )
      .join(', ');

    const flatValues = insertValues.flat();

    const insertQuery = `
      INSERT INTO evento_convidados (evento_id, workspace_id, nome, celular, origem, cvcrm_id, status)
      VALUES ${placeholders}
      RETURNING *
    `;

    const result = await pool.query<ConvidadoDB>(insertQuery, flatValues);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        added: result.rows.length,
        skipped: duplicados,
        erros: erros.slice(0, 10),
        message: `${result.rows.length} convidado(s) importado(s) com sucesso`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao importar convidados:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao importar convidados' },
      { status: 500 }
    );
  }
}
