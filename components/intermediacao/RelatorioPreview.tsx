'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText,
  FileSpreadsheet,
  FileType,
  Eye,
  Columns,
  Check,
  X,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { FiltrosRelatorio, ColumnDef } from './types';

interface DadosPreview {
  total: number;
  dados: Record<string, unknown>[];
  totalizadores?: Record<string, number>;
}

interface RelatorioPreviewProps {
  tipo: 'vendas' | 'comissoes' | 'parcelas';
  filtros: FiltrosRelatorio;
  onExport: (formato: 'pdf' | 'xlsx' | 'csv') => void | Promise<void>;
  dados?: DadosPreview;
  colunas?: ColumnDef[];
  loading?: boolean;
  error?: string;
  className?: string;
}

// Colunas padrao por tipo
const COLUNAS_PADRAO: Record<string, ColumnDef[]> = {
  vendas: [
    { key: 'codigo', label: 'Codigo', width: 100 },
    { key: 'dataVenda', label: 'Data', format: 'date', width: 100 },
    { key: 'empreendimento', label: 'Empreendimento', width: 150 },
    { key: 'unidade', label: 'Unidade', width: 100 },
    { key: 'cliente', label: 'Cliente', width: 150 },
    { key: 'valor', label: 'Valor', format: 'currency', width: 120, align: 'right' },
    { key: 'status', label: 'Status', width: 100 },
  ],
  comissoes: [
    { key: 'vendaCodigo', label: 'Venda', width: 100 },
    { key: 'beneficiario', label: 'Beneficiario', width: 150 },
    { key: 'empreendimento', label: 'Empreendimento', width: 150 },
    { key: 'percentual', label: '%', format: 'percent', width: 80, align: 'right' },
    { key: 'valor', label: 'Valor', format: 'currency', width: 120, align: 'right' },
    { key: 'valorPago', label: 'Pago', format: 'currency', width: 120, align: 'right' },
    { key: 'valorPendente', label: 'Pendente', format: 'currency', width: 120, align: 'right' },
  ],
  parcelas: [
    { key: 'vendaCodigo', label: 'Venda', width: 100 },
    { key: 'beneficiario', label: 'Beneficiario', width: 150 },
    { key: 'parcela', label: 'Parcela', width: 80, align: 'center' },
    { key: 'dataVencimento', label: 'Vencimento', format: 'date', width: 100 },
    { key: 'valor', label: 'Valor', format: 'currency', width: 120, align: 'right' },
    { key: 'status', label: 'Status', width: 100 },
    { key: 'dataPagamento', label: 'Pagamento', format: 'date', width: 100 },
  ],
};

// Titulos por tipo
const TITULOS: Record<string, string> = {
  vendas: 'Relatorio de Vendas',
  comissoes: 'Relatorio de Comissoes',
  parcelas: 'Relatorio de Parcelas',
};

// Funcao para formatar valor
function formatarValor(valor: unknown, formato?: string): string {
  if (valor === null || valor === undefined) return '-';

  switch (formato) {
    case 'currency':
      const numVal = typeof valor === 'number' ? valor : parseFloat(String(valor));
      if (isNaN(numVal)) return '-';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(numVal);

    case 'date':
      const dateVal = valor instanceof Date ? valor : new Date(String(valor));
      if (isNaN(dateVal.getTime())) return String(valor);
      return format(dateVal, 'dd/MM/yyyy', { locale: ptBR });

    case 'percent':
      const percentVal = typeof valor === 'number' ? valor : parseFloat(String(valor));
      if (isNaN(percentVal)) return '-';
      return `${percentVal.toFixed(2).replace('.', ',')}%`;

    default:
      return String(valor);
  }
}

export function RelatorioPreview({
  tipo,
  filtros,
  onExport,
  dados,
  colunas,
  loading = false,
  error,
  className,
}: RelatorioPreviewProps) {
  const [colunasVisiveis, setColunasVisiveis] = React.useState<string[]>([]);
  const [exportando, setExportando] = React.useState<string | null>(null);

  const colunasDisponiveis = colunas || COLUNAS_PADRAO[tipo] || [];

  // Inicializar colunas visiveis
  React.useEffect(() => {
    setColunasVisiveis(colunasDisponiveis.map(c => c.key));
  }, [colunasDisponiveis]);

  const handleExport = async (formato: 'pdf' | 'xlsx' | 'csv') => {
    setExportando(formato);
    try {
      await onExport(formato);
    } finally {
      setExportando(null);
    }
  };

  const toggleColuna = (key: string) => {
    setColunasVisiveis(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const colunasExibidas = colunasDisponiveis.filter(c =>
    colunasVisiveis.includes(c.key)
  );

  // Preview dos dados (max 5 linhas)
  const dadosPreview = dados?.dados.slice(0, 5) || [];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {TITULOS[tipo]}
            </CardTitle>
            <CardDescription>
              Preview dos dados que serao exportados
            </CardDescription>
          </div>

          {/* Seletor de colunas */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns className="h-4 w-4" />
                Colunas ({colunasVisiveis.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="text-sm font-medium mb-2">Colunas visiveis</div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {colunasDisponiveis.map(col => (
                  <div
                    key={col.key}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent',
                      colunasVisiveis.includes(col.key) && 'bg-accent/50'
                    )}
                    onClick={() => toggleColuna(col.key)}
                  >
                    <div
                      className={cn(
                        'h-4 w-4 border rounded flex items-center justify-center',
                        colunasVisiveis.includes(col.key)
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      )}
                    >
                      {colunasVisiveis.includes(col.key) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm">{col.label}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Info do filtro aplicado */}
        {filtros.periodoInicio && filtros.periodoFim && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>
              Periodo: {format(filtros.periodoInicio, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
              {format(filtros.periodoFim, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            {filtros.beneficiarioId && (
              <Badge variant="secondary" className="text-xs">
                Beneficiario filtrado
              </Badge>
            )}
            {filtros.empreendimentoId && (
              <Badge variant="secondary" className="text-xs">
                Empreendimento filtrado
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <X className="h-12 w-12 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : dadosPreview.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado com os filtros aplicados
            </p>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {colunasExibidas.map(col => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                      style={{ width: col.width }}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosPreview.map((item, index) => (
                  <TableRow key={index}>
                    {colunasExibidas.map(col => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-sm',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center'
                        )}
                      >
                        {formatarValor(item[col.key], col.format)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Indicador de mais registros */}
            {dados && dados.total > 5 && (
              <div className="text-center py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Exibindo 5 de {dados.total} registros
                </span>
              </div>
            )}
          </div>
        )}

        {/* Totalizadores */}
        {dados?.totalizadores && Object.keys(dados.totalizadores).length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Totalizadores</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(dados.totalizadores).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-lg font-semibold">
                    {typeof value === 'number'
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(value)
                      : value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {dados ? (
            <>
              <span className="font-medium">{dados.total}</span> registro(s) encontrado(s)
            </>
          ) : (
            'Carregando...'
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={loading || !dados || dados.total === 0 || exportando !== null}
            className="gap-2"
          >
            {exportando === 'csv' ? (
              <span className="animate-spin">...</span>
            ) : (
              <FileType className="h-4 w-4 text-blue-600" />
            )}
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('xlsx')}
            disabled={loading || !dados || dados.total === 0 || exportando !== null}
            className="gap-2"
          >
            {exportando === 'xlsx' ? (
              <span className="animate-spin">...</span>
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
            )}
            Excel
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={loading || !dados || dados.total === 0 || exportando !== null}
            className="gap-2"
          >
            {exportando === 'pdf' ? (
              <span className="animate-spin">...</span>
            ) : (
              <FileText className="h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Modal de preview completo
interface RelatorioPreviewModalProps extends Omit<RelatorioPreviewProps, 'className'> {
  trigger?: React.ReactNode;
}

export function RelatorioPreviewModal({
  trigger,
  ...props
}: RelatorioPreviewModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview do Relatorio</DialogTitle>
          <DialogDescription>
            Visualize os dados antes de exportar
          </DialogDescription>
        </DialogHeader>
        <RelatorioPreview {...props} />
      </DialogContent>
    </Dialog>
  );
}

export default RelatorioPreview;
