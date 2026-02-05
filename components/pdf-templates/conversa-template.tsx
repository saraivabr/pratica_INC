import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 25,
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metaItem: {
    fontSize: 9,
    color: '#6B7280',
  },
  messagesContainer: {
    marginTop: 10,
  },
  messageBlock: {
    marginBottom: 15,
  },
  userMessage: {
    backgroundColor: '#18181B',
    borderRadius: 8,
    padding: 12,
    marginLeft: 40,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 1.5,
  },
  assistantMessage: {
    marginRight: 40,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  assistantBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  assistantBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  assistantLabel: {
    fontSize: 9,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  assistantMessageText: {
    color: '#374151',
    fontSize: 10,
    lineHeight: 1.6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  dataBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dataBlockTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#7C3AED',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  footerBrand: {
    fontSize: 8,
    color: '#7C3AED',
    fontWeight: 'bold',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
  },
});

interface DataBlock {
  toolName: string;
  payload: any;
}

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
  dataBlocks?: DataBlock[];
}

interface ConversaTemplateProps {
  titulo: string;
  mensagens: Mensagem[];
  corretor: {
    nome: string;
    telefone?: string;
  };
  dataExportacao: string;
}

function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return '—';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n) || n === 0) return 'Consultar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPhone(t: string | null | undefined): string {
  if (!t) return '—';
  const clean = t.replace(/\D/g, '');
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return t;
}

// Render data blocks as PDF elements
function DataBlockRenderer({ block }: { block: DataBlock }) {
  const { payload } = block;
  if (!payload || payload.error) return null;

  switch (payload.tipo) {
    case 'estatisticas':
      return (
        <View style={styles.dataBlock}>
          <Text style={styles.dataBlockTitle}>Estatisticas do CRM</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{payload.total_leads ?? '—'}</Text>
              <Text style={styles.statLabel}>Total de Leads</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{payload.empreendimentos_ativos ?? '—'}</Text>
              <Text style={styles.statLabel}>Empreendimentos Ativos</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{payload.total_reservas ?? '—'}</Text>
              <Text style={styles.statLabel}>Reservas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{payload.vendas_realizadas ?? '—'}</Text>
              <Text style={styles.statLabel}>Vendas Realizadas</Text>
            </View>
          </View>
        </View>
      );

    case 'contagem_leads':
      return (
        <View style={styles.dataBlock}>
          <Text style={styles.dataBlockTitle}>Leads por Situacao</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '70%' }]}>Situacao</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>Total</Text>
            </View>
            {payload.dados?.slice(0, 10).map((d: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '70%' }]}>{d.situacao_nome}</Text>
                <Text style={[styles.tableCell, { width: '30%', textAlign: 'right', fontWeight: 'bold' }]}>{d.total}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    case 'leads':
      return (
        <View style={styles.dataBlock}>
          <Text style={styles.dataBlockTitle}>
            Leads {payload.total ? `(${payload.mostrando} de ${payload.total})` : ''}
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Nome</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Telefone</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Situacao</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Empreendimento</Text>
            </View>
            {payload.dados?.slice(0, 15).map((lead: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '25%' }]}>{lead.nome || '—'}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{formatPhone(lead.telefone)}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{lead.situacao || '—'}</Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>{lead.empreendimentos || '—'}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    case 'empreendimentos':
      return (
        <View style={styles.dataBlock}>
          <Text style={styles.dataBlockTitle}>Empreendimentos ({payload.dados?.length || 0})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Nome</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Cidade</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Disponiveis</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Faixa de Preco</Text>
            </View>
            {payload.dados?.slice(0, 10).map((emp: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '35%' }]}>{emp.nome}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{emp.cidade || '—'}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{emp.unidades_disponiveis ?? '—'}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{emp.faixa_preco || 'Consultar'}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    case 'unidades':
    case 'resumo_unidades':
      const isResumo = payload.tipo === 'resumo_unidades';
      return (
        <View style={styles.dataBlock}>
          <Text style={styles.dataBlockTitle}>
            Unidades {payload.total ? `(${payload.mostrando} de ${payload.total})` : ''}
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {isResumo ? (
                <>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Tipo</Text>
                  <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Situacao</Text>
                  <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Qtd</Text>
                  <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Valor</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Unidade</Text>
                  <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Tipo</Text>
                  <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Area</Text>
                  <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Situacao</Text>
                  <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Valor</Text>
                </>
              )}
            </View>
            {payload.dados?.slice(0, 20).map((u: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                {isResumo ? (
                  <>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{u.tipo_unidade || '—'}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{u.situacao || '—'}</Text>
                    <Text style={[styles.tableCell, { width: '15%', fontWeight: 'bold' }]}>{u.quantidade}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>
                      {u.valor_min ? `${formatCurrency(u.valor_min)} - ${formatCurrency(u.valor_max)}` : '—'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{u.unidade || '—'}</Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>{u.tipo || '—'}</Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{u.area_privativa_m2 ? `${u.area_privativa_m2}m2` : '—'}</Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{u.situacao || '—'}</Text>
                    <Text style={[styles.tableCell, { width: '20%' }]}>{formatCurrency(u.valor)}</Text>
                  </>
                )}
              </View>
            ))}
          </View>
        </View>
      );

    case 'reservas':
      return (
        <View style={styles.dataBlock}>
          <Text style={styles.dataBlockTitle}>Reservas ({payload.dados?.length || 0})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Reserva</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Empreendimento</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Cliente</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Valor</Text>
            </View>
            {payload.dados?.slice(0, 15).map((r: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '15%' }]}>{r.numero_reserva || '—'}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{r.empreendimento_nome || '—'}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>{r.cliente_principal_nome || '—'}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{r.status || '—'}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{formatCurrency(r.valor_venda || r.valor_reserva)}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    default:
      return null;
  }
}

// Simple markdown-like text cleaner for PDF
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/`(.*?)`/g, '$1') // inline code
    .replace(/#{1,6}\s/g, '') // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^\s*[-*]\s/gm, '• ') // list items
    .replace(/^\s*\d+\.\s/gm, '') // numbered lists
    .trim();
}

export function ConversaTemplate({
  titulo,
  mensagens,
  corretor,
  dataExportacao,
}: ConversaTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>PRATICA IA</Text>
          <Text style={styles.subtitle}>Assistente Inteligente para Corretores</Text>
        </View>

        {/* Metadata */}
        <View style={styles.metadata}>
          <View>
            <Text style={styles.title}>{titulo}</Text>
            <Text style={styles.metaItem}>Corretor: {corretor.nome}</Text>
            {corretor.telefone && <Text style={styles.metaItem}>Tel: {corretor.telefone}</Text>}
          </View>
          <View>
            <Text style={styles.metaItem}>Exportado em:</Text>
            <Text style={styles.metaItem}>{dataExportacao}</Text>
          </View>
        </View>

        {/* Messages */}
        <View style={styles.messagesContainer}>
          {mensagens.map((msg, i) => (
            <View key={i} style={styles.messageBlock}>
              {msg.role === 'user' ? (
                <View style={styles.userMessage}>
                  <Text style={styles.userMessageText}>{msg.content}</Text>
                </View>
              ) : (
                <View style={styles.assistantMessage}>
                  <View style={styles.assistantHeader}>
                    <View style={styles.assistantBadge}>
                      <Text style={styles.assistantBadgeText}>IA</Text>
                    </View>
                    <Text style={styles.assistantLabel}>Pratica IA</Text>
                  </View>

                  {/* Data blocks */}
                  {msg.dataBlocks?.map((block, bi) => (
                    <DataBlockRenderer key={bi} block={block} />
                  ))}

                  {/* Text content */}
                  {msg.content && (
                    <Text style={styles.assistantMessageText}>
                      {cleanMarkdown(msg.content)}
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Gerado automaticamente pela Pratica IA
          </Text>
          <Text style={styles.footerBrand}>
            corretorparceria.com.br
          </Text>
        </View>
      </Page>
    </Document>
  );
}
