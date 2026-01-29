'use client';

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ColumnDef } from './types';

// Tipos de formatacao
type FormatType = 'text' | 'currency' | 'date' | 'percent' | 'number';

interface ExportExcelProps {
  data: Record<string, unknown>[];
  columns: ColumnDef[];
  filename: string;
  sheetName?: string;
  includeTotals?: boolean;
  totalColumns?: string[];
  headerStyle?: {
    backgroundColor?: string;
    fontColor?: string;
    bold?: boolean;
  };
}

// Funcao para formatar valor de acordo com o tipo
function formatValue(value: unknown, formatType: FormatType): string | number {
  if (value === null || value === undefined) {
    return '';
  }

  switch (formatType) {
    case 'currency':
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numValue)) return '';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(numValue);

    case 'date':
      const dateValue = value instanceof Date ? value : new Date(String(value));
      if (isNaN(dateValue.getTime())) return String(value);
      return format(dateValue, 'dd/MM/yyyy', { locale: ptBR });

    case 'percent':
      const percentValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(percentValue)) return '';
      return `${percentValue.toFixed(2).replace('.', ',')}%`;

    case 'number':
      const numberValue = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numberValue)) return '';
      return new Intl.NumberFormat('pt-BR').format(numberValue);

    default:
      return String(value);
  }
}

// Funcao para obter valor aninhado (ex: "cliente.nome")
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Funcao principal de exportacao
export function exportToExcel({
  data,
  columns,
  filename,
  sheetName = 'Dados',
  includeTotals = false,
  totalColumns = [],
}: ExportExcelProps): void {
  // Criar array de headers
  const headers = columns.map(col => col.label);

  // Criar array de dados formatados
  const rows = data.map(item => {
    return columns.map(col => {
      const value = getNestedValue(item, col.key);
      return formatValue(value, col.format || 'text');
    });
  });

  // Criar worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Configurar largura das colunas
  const colWidths = columns.map(col => ({
    wch: col.width || Math.max(
      col.label.length,
      ...rows.map(row => {
        const idx = columns.indexOf(col);
        const cellValue = row[idx];
        return String(cellValue).length;
      })
    ) + 2,
  }));
  worksheet['!cols'] = colWidths;

  // Adicionar totalizadores se solicitado
  if (includeTotals && totalColumns.length > 0) {
    const totalsRow = columns.map(col => {
      if (totalColumns.includes(col.key)) {
        const total = data.reduce((sum, item) => {
          const value = getNestedValue(item, col.key);
          const numValue = typeof value === 'number' ? value : parseFloat(String(value));
          return sum + (isNaN(numValue) ? 0 : numValue);
        }, 0);
        return formatValue(total, col.format || 'number');
      }
      return col.key === columns[0].key ? 'TOTAL' : '';
    });

    // Adicionar linha de totais
    XLSX.utils.sheet_add_aoa(worksheet, [totalsRow], {
      origin: -1,
    });
  }

  // Criar workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Gerar nome do arquivo com data
  const dataAtual = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
  const nomeArquivo = `${filename}_${dataAtual}.xlsx`;

  // Download do arquivo
  XLSX.writeFile(workbook, nomeArquivo);
}

// Funcao para exportar multiplas sheets
export function exportToExcelMultiSheet(
  sheets: Array<{
    data: Record<string, unknown>[];
    columns: ColumnDef[];
    sheetName: string;
    includeTotals?: boolean;
    totalColumns?: string[];
  }>,
  filename: string
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const headers = sheet.columns.map(col => col.label);
    const rows = sheet.data.map(item => {
      return sheet.columns.map(col => {
        const value = getNestedValue(item, col.key);
        return formatValue(value, col.format || 'text');
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Configurar largura das colunas
    const colWidths = sheet.columns.map(col => ({
      wch: col.width || 15,
    }));
    worksheet['!cols'] = colWidths;

    // Adicionar totalizadores
    if (sheet.includeTotals && sheet.totalColumns && sheet.totalColumns.length > 0) {
      const totalsRow = sheet.columns.map(col => {
        if (sheet.totalColumns!.includes(col.key)) {
          const total = sheet.data.reduce((sum, item) => {
            const value = getNestedValue(item, col.key);
            const numValue = typeof value === 'number' ? value : parseFloat(String(value));
            return sum + (isNaN(numValue) ? 0 : numValue);
          }, 0);
          return formatValue(total, col.format || 'number');
        }
        return col.key === sheet.columns[0].key ? 'TOTAL' : '';
      });
      XLSX.utils.sheet_add_aoa(worksheet, [totalsRow], { origin: -1 });
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  });

  const dataAtual = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
  const nomeArquivo = `${filename}_${dataAtual}.xlsx`;
  XLSX.writeFile(workbook, nomeArquivo);
}

// Funcao para exportar para CSV
export function exportToCSV({
  data,
  columns,
  filename,
}: Omit<ExportExcelProps, 'sheetName' | 'includeTotals' | 'totalColumns' | 'headerStyle'>): void {
  // Criar header
  const header = columns.map(col => col.label).join(';');

  // Criar linhas de dados
  const rows = data.map(item => {
    return columns.map(col => {
      const value = getNestedValue(item, col.key);
      const formattedValue = formatValue(value, col.format || 'text');

      // Escapar valores com ponto e virgula ou aspas
      const strValue = String(formattedValue).replace(/"/g, '""');
      if (strValue.includes(';') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue}"`;
      }
      return strValue;
    }).join(';');
  });

  // Combinar header e linhas
  const csv = [header, ...rows].join('\n');

  // Adicionar BOM para compatibilidade com Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });

  // Criar link de download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const dataAtual = format(new Date(), 'yyyy-MM-dd', { locale: ptBR });
  link.download = `${filename}_${dataAtual}.csv`;

  // Acionar download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Colunas pre-definidas para tipos comuns
export const COLUNAS_VENDAS: ColumnDef[] = [
  { key: 'codigo', label: 'Codigo', width: 15 },
  { key: 'dataVenda', label: 'Data', format: 'date', width: 12 },
  { key: 'imovel.empreendimento', label: 'Empreendimento', width: 25 },
  { key: 'imovel.unidade', label: 'Unidade', width: 15 },
  { key: 'cliente.nome', label: 'Cliente', width: 25 },
  { key: 'imovel.valor', label: 'Valor', format: 'currency', width: 15, align: 'right' },
  { key: 'comissao.percentual', label: '% Comissao', format: 'percent', width: 12, align: 'right' },
  { key: 'comissao.valorTotal', label: 'Valor Comissao', format: 'currency', width: 15, align: 'right' },
  { key: 'status', label: 'Status', width: 12 },
];

export const COLUNAS_COMISSOES: ColumnDef[] = [
  { key: 'venda.codigo', label: 'Codigo Venda', width: 15 },
  { key: 'venda.dataVenda', label: 'Data Venda', format: 'date', width: 12 },
  { key: 'venda.empreendimento', label: 'Empreendimento', width: 25 },
  { key: 'venda.unidade', label: 'Unidade', width: 15 },
  { key: 'venda.valorVenda', label: 'Valor Venda', format: 'currency', width: 15, align: 'right' },
  { key: 'percentual', label: '% Comissao', format: 'percent', width: 12, align: 'right' },
  { key: 'valor', label: 'Valor Comissao', format: 'currency', width: 15, align: 'right' },
  { key: 'parcelasPagas', label: 'Pagas', format: 'number', width: 8, align: 'center' },
  { key: 'parcelasTotal', label: 'Total', format: 'number', width: 8, align: 'center' },
  { key: 'valorPago', label: 'Valor Pago', format: 'currency', width: 15, align: 'right' },
  { key: 'valorPendente', label: 'Valor Pendente', format: 'currency', width: 15, align: 'right' },
];

export const COLUNAS_PARCELAS: ColumnDef[] = [
  { key: 'vendaCodigo', label: 'Codigo Venda', width: 15 },
  { key: 'beneficiario.nome', label: 'Beneficiario', width: 25 },
  { key: 'numero', label: 'Parcela', format: 'number', width: 10, align: 'center' },
  { key: 'dataVencimento', label: 'Vencimento', format: 'date', width: 12 },
  { key: 'valor', label: 'Valor', format: 'currency', width: 15, align: 'right' },
  { key: 'status', label: 'Status', width: 12 },
  { key: 'dataPagamento', label: 'Pagamento', format: 'date', width: 12 },
];

export const COLUNAS_BENEFICIARIOS: ColumnDef[] = [
  { key: 'nome', label: 'Nome', width: 25 },
  { key: 'cargo', label: 'Cargo', width: 15 },
  { key: 'cpf', label: 'CPF', width: 15 },
  { key: 'email', label: 'E-mail', width: 25 },
  { key: 'telefone', label: 'Telefone', width: 15 },
  { key: 'pix', label: 'Chave PIX', width: 20 },
];

export default {
  exportToExcel,
  exportToExcelMultiSheet,
  exportToCSV,
  COLUNAS_VENDAS,
  COLUNAS_COMISSOES,
  COLUNAS_PARCELAS,
  COLUNAS_BENEFICIARIOS,
};
