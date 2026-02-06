'use client';

import * as React from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PrintButtonProps {
  contentRef: React.RefObject<HTMLElement | null>;
  documentTitle?: string;
  beforePrint?: () => void | Promise<void>;
  afterPrint?: () => void | Promise<void>;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  disabled?: boolean;
}

// Estilos de impressao
const PRINT_STYLES = `
  @media print {
    /* Reset geral */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Esconder elementos nao imprimiveis */
    [data-no-print],
    .no-print,
    button,
    nav,
    header:not([data-print]),
    footer:not([data-print]),
    aside,
    .sidebar {
      display: none !important;
    }

    /* Configurar pagina */
    @page {
      size: A4;
      margin: 1.5cm;
    }

    /* Corpo principal */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
    }

    /* Container de impressao */
    .print-container,
    [data-print-container] {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Tabelas */
    table {
      border-collapse: collapse;
      width: 100%;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    thead {
      display: table-header-group;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #f5f5f5 !important;
      font-weight: bold;
    }

    /* Cards */
    .card, [data-slot="card"] {
      border: 1px solid #ddd;
      page-break-inside: avoid;
      margin-bottom: 1cm;
    }

    /* Titulos */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }

    /* Graficos */
    .recharts-wrapper {
      page-break-inside: avoid;
    }

    /* Imagens */
    img {
      max-width: 100% !important;
      page-break-inside: avoid;
    }

    /* Links */
    a {
      text-decoration: none;
      color: inherit;
    }

    /* Badges */
    .badge, [data-slot="badge"] {
      border: 1px solid currentColor;
      padding: 2px 6px;
    }

    /* Evitar quebras */
    .page-break-avoid {
      page-break-inside: avoid;
    }

    /* Forcar quebra */
    .page-break {
      page-break-before: always;
    }

    /* Cabecalho e rodape de impressao */
    .print-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10pt;
      color: #666;
      padding-bottom: 5mm;
      border-bottom: 1px solid #ddd;
    }

    .print-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10pt;
      color: #666;
      padding-top: 5mm;
      border-top: 1px solid #ddd;
    }

    /* Contador de paginas (funciona em alguns navegadores) */
    .print-footer::after {
      content: counter(page);
    }
  }
`;

export function PrintButton({
  contentRef,
  documentTitle = 'Documento',
  beforePrint,
  afterPrint,
  className,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  disabled = false,
}: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = async () => {
    if (!contentRef.current || isPrinting) return;

    setIsPrinting(true);

    try {
      // Callback antes de imprimir
      if (beforePrint) {
        await beforePrint();
      }

      // Obter conteudo HTML
      const content = contentRef.current;

      // Criar nova janela de impressao
      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        throw new Error('Popup bloqueado. Permita popups para imprimir.');
      }

      // Coletar estilos da pagina original
      const styles = Array.from(document.styleSheets)
        .map(stylesheet => {
          try {
            return Array.from(stylesheet.cssRules)
              .map(rule => rule.cssText)
              .join('\n');
          } catch {
            // Alguns stylesheets podem ser de origem cruzada
            return '';
          }
        })
        .join('\n');

      // Montar documento de impressao
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${documentTitle}</title>
          <style>
            ${styles}
            ${PRINT_STYLES}
          </style>
        </head>
        <body>
          <div class="print-container" data-print-container>
            ${content.innerHTML}
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();

      // Aguardar carregamento de imagens
      await new Promise<void>(resolve => {
        const images = printWindow.document.images;
        let loadedCount = 0;
        const totalImages = images.length;

        if (totalImages === 0) {
          resolve();
          return;
        }

        Array.from(images).forEach(img => {
          if (img.complete) {
            loadedCount++;
            if (loadedCount === totalImages) resolve();
          } else {
            img.onload = () => {
              loadedCount++;
              if (loadedCount === totalImages) resolve();
            };
            img.onerror = () => {
              loadedCount++;
              if (loadedCount === totalImages) resolve();
            };
          }
        });

        // Timeout de seguranca
        setTimeout(resolve, 2000);
      });

      // Imprimir
      printWindow.focus();
      printWindow.print();

      // Fechar apos impressao (com delay para garantir que o dialogo abriu)
      setTimeout(() => {
        printWindow.close();
      }, 1000);

      // Callback apos imprimir
      if (afterPrint) {
        await afterPrint();
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao imprimir');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={disabled || isPrinting}
      className={cn('gap-2', className)}
    >
      {isPrinting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      {showLabel && <span>{isPrinting ? 'Preparando...' : 'Imprimir'}</span>}
    </Button>
  );
}

// Hook para facilitar uso do PrintButton
export function usePrintRef() {
  const ref = React.useRef<HTMLDivElement>(null);
  return ref;
}

// Componente wrapper para area imprimivel
interface PrintAreaProps {
  children: React.ReactNode;
  className?: string;
  showPrintButton?: boolean;
  documentTitle?: string;
}

export function PrintArea({
  children,
  className,
  showPrintButton = false,
  documentTitle,
}: PrintAreaProps) {
  const printRef = usePrintRef();

  return (
    <div className={cn('relative', className)}>
      {showPrintButton && (
        <div className="absolute top-2 right-2 z-10" data-no-print>
          <PrintButton
            contentRef={printRef}
            documentTitle={documentTitle}
            variant="ghost"
            size="sm"
          />
        </div>
      )}
      <div ref={printRef} data-print-container>
        {children}
      </div>
    </div>
  );
}

// Componente para elementos que nao devem ser impressos
interface NoPrintProps {
  children: React.ReactNode;
  className?: string;
}

export function NoPrint({ children, className }: NoPrintProps) {
  return (
    <div className={cn('no-print', className)} data-no-print>
      {children}
    </div>
  );
}

// Componente para forcar quebra de pagina
interface PageBreakProps {
  className?: string;
}

export function PageBreak({ className }: PageBreakProps) {
  return <div className={cn('page-break', className)} style={{ pageBreakBefore: 'always' }} />;
}

export default PrintButton;
