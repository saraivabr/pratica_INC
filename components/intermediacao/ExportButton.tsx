'use client';

import * as React from 'react';
import { Download, FileText, FileSpreadsheet, FileType, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  onExportPDF?: () => void | Promise<void>;
  onExportExcel?: () => void | Promise<void>;
  onExportCSV?: () => void | Promise<void>;
  loading?: boolean;
  loadingType?: 'pdf' | 'excel' | 'csv' | null;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export function ExportButton({
  onExportPDF,
  onExportExcel,
  onExportCSV,
  loading = false,
  loadingType = null,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className,
  label = 'Exportar',
  showLabel = true,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalLoading, setInternalLoading] = React.useState<string | null>(null);

  const hasOptions = onExportPDF || onExportExcel || onExportCSV;

  if (!hasOptions) {
    return null;
  }

  const handleExport = async (
    type: 'pdf' | 'excel' | 'csv',
    handler?: () => void | Promise<void>
  ) => {
    if (!handler || loading || internalLoading) return;

    setInternalLoading(type);
    try {
      await handler();
    } catch (error) {
      console.error(`Erro ao exportar ${type}:`, error);
    } finally {
      setInternalLoading(null);
      setIsOpen(false);
    }
  };

  const isLoading = loading || internalLoading !== null;
  const currentLoadingType = loadingType || internalLoading;

  // Se houver apenas uma opcao de exportacao, mostrar botao direto
  const singleOption =
    [onExportPDF, onExportExcel, onExportCSV].filter(Boolean).length === 1;

  if (singleOption) {
    const exportType = onExportPDF ? 'pdf' : onExportExcel ? 'excel' : 'csv';
    const handler = onExportPDF || onExportExcel || onExportCSV;
    const Icon = exportType === 'pdf' ? FileText : exportType === 'excel' ? FileSpreadsheet : FileType;
    const exportLabel = exportType === 'pdf' ? 'PDF' : exportType === 'excel' ? 'Excel' : 'CSV';

    return (
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        onClick={() => handleExport(exportType, handler)}
        className={cn('gap-2', className)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
        {showLabel && (
          <span>
            {isLoading ? 'Exportando...' : `Exportar ${exportLabel}`}
          </span>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isLoading}
          className={cn('gap-2', className)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {showLabel && (
            <>
              <span>{isLoading ? 'Exportando...' : label}</span>
              {!isLoading && <ChevronDown className="h-4 w-4" />}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Formato de exportacao</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {onExportPDF && (
          <DropdownMenuItem
            onClick={() => handleExport('pdf', onExportPDF)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              {currentLoadingType === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              ) : (
                <FileText className="h-4 w-4 text-red-600" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">PDF</span>
                <span className="text-xs text-muted-foreground">
                  Documento formatado
                </span>
              </div>
            </div>
          </DropdownMenuItem>
        )}

        {onExportExcel && (
          <DropdownMenuItem
            onClick={() => handleExport('excel', onExportExcel)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              {currentLoadingType === 'excel' ? (
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">Excel</span>
                <span className="text-xs text-muted-foreground">
                  Planilha .xlsx
                </span>
              </div>
            </div>
          </DropdownMenuItem>
        )}

        {onExportCSV && (
          <DropdownMenuItem
            onClick={() => handleExport('csv', onExportCSV)}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              {currentLoadingType === 'csv' ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <FileType className="h-4 w-4 text-blue-600" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">CSV</span>
                <span className="text-xs text-muted-foreground">
                  Dados separados por virgula
                </span>
              </div>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Componente de botao de exportacao simplificado para uso inline
interface QuickExportButtonProps {
  type: 'pdf' | 'excel' | 'csv';
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function QuickExportButton({
  type,
  onClick,
  loading = false,
  disabled = false,
  className,
}: QuickExportButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async () => {
    if (isLoading || loading) return;
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  const config = {
    pdf: {
      icon: FileText,
      color: 'text-red-600 hover:text-red-700',
      bgColor: 'hover:bg-red-50',
      label: 'PDF',
    },
    excel: {
      icon: FileSpreadsheet,
      color: 'text-green-600 hover:text-green-700',
      bgColor: 'hover:bg-green-50',
      label: 'Excel',
    },
    csv: {
      icon: FileType,
      color: 'text-blue-600 hover:text-blue-700',
      bgColor: 'hover:bg-blue-50',
      label: 'CSV',
    },
  };

  const { icon: Icon, color, bgColor, label } = config[type];
  const showLoading = loading || isLoading;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={disabled || showLoading}
      className={cn('gap-2', bgColor, className)}
    >
      {showLoading ? (
        <Loader2 className={cn('h-4 w-4 animate-spin', color)} />
      ) : (
        <Icon className={cn('h-4 w-4', color)} />
      )}
      <span className={color}>{label}</span>
    </Button>
  );
}

export default ExportButton;
