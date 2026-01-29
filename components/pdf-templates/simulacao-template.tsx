import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
    textAlign: 'center',
  },
  empreendimentoName: {
    fontSize: 14,
    color: '#7C2D12',
    textAlign: 'center',
    marginBottom: 5,
  },
  unidadeInfo: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 25,
  },
  mainBox: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  mainValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7C2D12',
    textAlign: 'center',
  },
  mainLabel: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 5,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 6,
  },
  gridValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  gridLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  rowValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  highlight: {
    backgroundColor: '#ECFDF5',
    padding: 15,
    borderRadius: 6,
    marginTop: 15,
  },
  highlightText: {
    fontSize: 11,
    color: '#059669',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  highlightSubtext: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 5,
  },
  disclaimer: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 20,
    textAlign: 'center',
    fontStyle: 'italic',
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
});

interface SimulacaoTemplateProps {
  empreendimento: {
    nome: string;
  };
  unidade?: {
    numero: string;
    tipo: string;
  };
  simulacao: {
    valorImovel: number;
    entrada: number;
    percentualEntrada: number;
    valorFinanciado: number;
    prazoMeses: number;
    taxaAnual: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
  };
  corretor: {
    nome: string;
    telefone: string;
  };
}

function formatCurrency(value: number): string {
  if (value === undefined || value === null || Number.isNaN(value) || !isFinite(value)) return "R$ 0";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SimulacaoTemplate({
  empreendimento,
  unidade,
  simulacao,
  corretor,
}: SimulacaoTemplateProps) {
  const rendaMinimaRecomendada = simulacao.parcelaMensal * 3.33;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>PRATICA</Text>
          <Text style={styles.subtitle}>INCORPORADORA</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Simulacao de Financiamento</Text>
        <Text style={styles.empreendimentoName}>{empreendimento.nome}</Text>
        {unidade && (
          <Text style={styles.unidadeInfo}>
            Unidade {unidade.numero} - {unidade.tipo}
          </Text>
        )}

        {/* Main Value - Parcela */}
        <View style={styles.mainBox}>
          <Text style={styles.mainValue}>{formatCurrency(simulacao.parcelaMensal)}</Text>
          <Text style={styles.mainLabel}>PARCELA MENSAL ESTIMADA</Text>
        </View>

        {/* Grid - Entrada e Financiado */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridValue}>{formatCurrency(simulacao.entrada)}</Text>
            <Text style={styles.gridLabel}>
              ENTRADA ({simulacao.percentualEntrada}%)
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridValue}>{formatCurrency(simulacao.valorFinanciado)}</Text>
            <Text style={styles.gridLabel}>VALOR FINANCIADO</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes da Simulacao</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Valor do Imovel</Text>
            <Text style={styles.rowValue}>{formatCurrency(simulacao.valorImovel)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Prazo do Financiamento</Text>
            <Text style={styles.rowValue}>{simulacao.prazoMeses} meses ({Math.round(simulacao.prazoMeses / 12)} anos)</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Taxa de Juros</Text>
            <Text style={styles.rowValue}>{simulacao.taxaAnual.toFixed(1)}% ao ano</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total a Pagar</Text>
            <Text style={styles.rowValue}>{formatCurrency(simulacao.totalPago)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total de Juros</Text>
            <Text style={styles.rowValue}>{formatCurrency(simulacao.totalJuros)}</Text>
          </View>
        </View>

        {/* Highlight Box */}
        <View style={styles.highlight}>
          <Text style={styles.highlightText}>
            Renda Minima Recomendada: {formatCurrency(rendaMinimaRecomendada)}
          </Text>
          <Text style={styles.highlightSubtext}>
            Considerando comprometimento maximo de 30% da renda
          </Text>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          * Esta simulacao e meramente ilustrativa e nao representa proposta de credito.
          Valores sujeitos a alteracao conforme analise de credito e condicoes vigentes.
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Simulacao preparada por:</Text>
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
