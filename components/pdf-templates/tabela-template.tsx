import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Registrar fonte para melhor renderização
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#7C2D12',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C2D12',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  location: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 20,
  },
  priceRange: {
    fontSize: 14,
    color: '#7C2D12',
    fontWeight: 'bold',
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
    padding: 8,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#7C2D12',
    padding: 8,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
  },
  col1: { width: '15%' },
  col2: { width: '20%' },
  col3: { width: '12%' },
  col4: { width: '12%' },
  col5: { width: '12%' },
  col6: { width: '15%' },
  col7: { width: '14%' },
  statusDisponivel: {
    color: '#059669',
    fontWeight: 'bold',
  },
  statusReservado: {
    color: '#D97706',
    fontWeight: 'bold',
  },
  statusVendido: {
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 3,
  },
  footerName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  footerPhone: {
    fontSize: 10,
    color: '#7C2D12',
  },
  footerDate: {
    position: 'absolute',
    right: 0,
    fontSize: 8,
    color: '#9CA3AF',
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginTop: 15,
    borderRadius: 4,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7C2D12',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 2,
  },
});

interface TabelaTemplateProps {
  empreendimento: {
    nome: string;
    cidade?: string;
    bairro?: string;
    precoMinimo?: number;
    precoMaximo?: number;
  };
  unidades: Array<{
    id: string;
    tipo: string;
    metragem: number;
    valor: number;
    status: 'disponivel' | 'reservado' | 'vendido';
    quartos: number;
    vagas: number;
    andar?: number;
    final?: string;
  }>;
  corretor: {
    nome: string;
    telefone: string;
  };
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'disponivel':
      return styles.statusDisponivel;
    case 'reservado':
      return styles.statusReservado;
    default:
      return styles.statusVendido;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'disponivel':
      return 'Disponível';
    case 'reservado':
      return 'Reservado';
    case 'vendido':
      return 'Vendido';
    default:
      return status;
  }
}

export function TabelaTemplate({ empreendimento, unidades, corretor }: TabelaTemplateProps) {
  const disponiveis = unidades.filter(u => u.status === 'disponivel').length;
  const reservadas = unidades.filter(u => u.status === 'reservado').length;
  const vendidas = unidades.filter(u => u.status === 'vendido').length;
  const hasPrice = typeof empreendimento.precoMinimo === 'number' && empreendimento.precoMinimo > 0;
  const location = [empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(', ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>PRATICA</Text>
          <Text style={styles.subtitle}>INCORPORADORA</Text>
        </View>

        {/* Empreendimento Info */}
        <Text style={styles.title}>{empreendimento.nome}</Text>
        {location ? <Text style={styles.location}>{location}</Text> : null}
        {hasPrice ? (
          <Text style={styles.priceRange}>
            A partir de {formatCurrency(empreendimento.precoMinimo)}
          </Text>
        ) : null}

        {/* Tabela */}
        <Text style={styles.sectionTitle}>Tabela de Unidades</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Unidade</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Tipo</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Área</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Quartos</Text>
            <Text style={[styles.tableHeaderCell, styles.col5]}>Vagas</Text>
            <Text style={[styles.tableHeaderCell, styles.col6]}>Valor</Text>
            <Text style={[styles.tableHeaderCell, styles.col7]}>Status</Text>
          </View>

          {/* Rows */}
          {unidades.map((unidade, index) => (
            <View
              key={unidade.id}
              style={[
                styles.tableRow,
                index % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              <Text style={[styles.tableCell, styles.col1]}>
                {unidade.andar ? `${unidade.andar}${unidade.final || ''}` : unidade.id}
              </Text>
              <Text style={[styles.tableCell, styles.col2]}>{unidade.tipo}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{unidade.metragem}m²</Text>
              <Text style={[styles.tableCell, styles.col4]}>{unidade.quartos}</Text>
              <Text style={[styles.tableCell, styles.col5]}>{unidade.vagas}</Text>
              <Text style={[styles.tableCell, styles.col6]}>
                {formatCurrency(unidade.valor)}
              </Text>
              <Text style={[styles.tableCell, styles.col7, getStatusStyle(unidade.status)]}>
                {getStatusLabel(unidade.status)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{unidades.length}</Text>
            <Text style={styles.summaryLabel}>TOTAL</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>{disponiveis}</Text>
            <Text style={styles.summaryLabel}>DISPONÍVEIS</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#D97706' }]}>{reservadas}</Text>
            <Text style={styles.summaryLabel}>RESERVADAS</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#6B7280' }]}>{vendidas}</Text>
            <Text style={styles.summaryLabel}>VENDIDAS</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Material preparado por:</Text>
          <Text style={styles.footerName}>{corretor.nome}</Text>
          <Text style={styles.footerPhone}>{corretor.telefone}</Text>
          <Text style={styles.footerDate}>
            Gerado em {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
