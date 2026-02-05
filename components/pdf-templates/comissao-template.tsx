import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

// Tipos
interface Autonomo {
  id: string;
  nome: string;
  cpf?: string;
  percentual: number;
  valorComissao: number;
  creci?: string;
  imobiliaria?: string;
}

interface PagamentoRateio {
  id: string;
  data: string;
  tipo: 'ato' | 'mensal' | 'anual' | 'financiamento';
  valorRecebido: number;
  valorRateio: number;
  pagamentos: { autonomoId: string; percentual: number; valor: number }[];
}

interface ComissaoPDFData {
  // Dados do imóvel
  nomeProduto: string;
  numeroImovel: string;
  torre?: string;
  valorImovel: number;
  percentualComissao: number;
  comissaoTotal: number;
  dataVenda: string;
  // Cliente
  clienteNome: string;
  clienteCpf?: string;
  // Autônomos
  autonomos: Autonomo[];
  // Matriz
  matrizRateio: PagamentoRateio[];
  totaisPorAutonomo: Record<string, number>;
  // Resumo
  totalProposta: number;
  valorContrato: number;
}

const TIPO_LABELS: Record<string, string> = {
  ato: 'Ato',
  mensal: 'Mensal',
  anual: 'Anual',
  financiamento: 'Financ.',
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
    paddingBottom: 10,
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 8,
    color: '#6B7280',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 8,
    backgroundColor: '#EEF2FF',
    padding: 6,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '35%',
    color: '#6B7280',
    fontSize: 8,
  },
  value: {
    width: '65%',
    fontWeight: 'bold',
    fontSize: 9,
  },
  // Tabela
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    padding: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 7,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 5,
    minHeight: 20,
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 8,
    textAlign: 'center',
  },
  tableCellLeft: {
    fontSize: 8,
    textAlign: 'left',
  },
  // Cards resumo
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryCard: {
    width: '31%',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cardBlue: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cardPurple: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  cardGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cardValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 7,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    color: '#9CA3AF',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  // Matriz compacta
  matrizHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 2,
  },
  matrizCell: {
    flex: 1,
    fontSize: 6,
    textAlign: 'center',
    padding: 2,
  },
  matrizCellFirst: {
    flex: 2,
    fontSize: 7,
    textAlign: 'left',
    padding: 2,
  },
  matrizRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
    padding: 3,
  },
  matrizTotal: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 4,
    marginTop: 2,
    borderRadius: 2,
  },
  tipoTag: {
    fontSize: 5,
    padding: 2,
    borderRadius: 2,
    marginBottom: 1,
    textAlign: 'center',
  },
  tipoAto: { backgroundColor: '#D1FAE5', color: '#065F46' },
  tipoMensal: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  tipoAnual: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  tipoFinanciamento: { backgroundColor: '#FEF3C7', color: '#92400E' },
});

function formatMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatDataCurta(data: string): string {
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function ComissaoPDFTemplate({ data }: { data: ComissaoPDFData }) {
  const {
    nomeProduto,
    numeroImovel,
    torre,
    valorImovel,
    percentualComissao,
    comissaoTotal,
    dataVenda,
    clienteNome,
    clienteCpf,
    autonomos,
    matrizRateio,
    totaisPorAutonomo,
    totalProposta,
    valorContrato,
  } = data;

  const totalComissoes = Object.values(totaisPorAutonomo).reduce((a, b) => a + b, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>CONTROLE DE COMISSOES</Text>
          <Text style={styles.subtitle}>Planilha Analitica de Rateio</Text>
        </View>

        {/* Cards Resumo */}
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.cardBlue]}>
            <Text style={[styles.cardValue, { color: '#1E40AF' }]}>{formatMoeda(totalProposta)}</Text>
            <Text style={styles.cardLabel}>Valor da Proposta</Text>
          </View>
          <View style={[styles.summaryCard, styles.cardPurple]}>
            <Text style={[styles.cardValue, { color: '#5B21B6' }]}>{formatMoeda(totalComissoes)}</Text>
            <Text style={styles.cardLabel}>Total Comissoes</Text>
          </View>
          <View style={[styles.summaryCard, styles.cardGreen]}>
            <Text style={[styles.cardValue, { color: '#065F46' }]}>{formatMoeda(valorContrato)}</Text>
            <Text style={styles.cardLabel}>Valor Contrato</Text>
          </View>
        </View>

        {/* Dados da Venda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS DA VENDA</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Produto/Empreendimento:</Text>
            <Text style={styles.value}>{nomeProduto || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Unidade:</Text>
            <Text style={styles.value}>{numeroImovel}{torre ? ` - Torre ${torre}` : ''}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Valor do Imovel:</Text>
            <Text style={styles.value}>{formatMoeda(valorImovel)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Comissao ({percentualComissao}%):</Text>
            <Text style={styles.value}>{formatMoeda(comissaoTotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data da Venda:</Text>
            <Text style={styles.value}>{formatData(dataVenda)}</Text>
          </View>
        </View>

        {/* Dados do Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CLIENTE</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{clienteNome || '-'}</Text>
          </View>
          {clienteCpf && (
            <View style={styles.row}>
              <Text style={styles.label}>CPF/CNPJ:</Text>
              <Text style={styles.value}>{clienteCpf}</Text>
            </View>
          )}
        </View>

        {/* Autonomos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AUTONOMOS / BENEFICIARIOS</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '35%', textAlign: 'left' }]}>Nome</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>CPF</Text>
              <Text style={[styles.tableHeaderCell, { width: '15%' }]}>CRECI</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%' }]}>%</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Valor Total</Text>
            </View>
            {autonomos.map((autonomo, index) => (
              <View key={autonomo.id} style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
                <Text style={[styles.tableCellLeft, { width: '35%' }]}>{autonomo.nome}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{autonomo.cpf || '-'}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{autonomo.creci || '-'}</Text>
                <Text style={[styles.tableCell, { width: '10%' }]}>{autonomo.percentual}%</Text>
                <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>
                  {formatMoeda(totaisPorAutonomo[autonomo.id] || 0)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Matriz de Rateio */}
        {matrizRateio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MATRIZ DE RATEIO - CRONOGRAMA DE PAGAMENTOS</Text>

            {/* Header com datas */}
            <View style={styles.matrizHeader}>
              <Text style={styles.matrizCellFirst}>Autonomo</Text>
              <Text style={[styles.matrizCell, { fontWeight: 'bold' }]}>Total</Text>
              {matrizRateio.map((r) => (
                <View key={r.id} style={[styles.matrizCell, { alignItems: 'center' }]}>
                  <Text style={[
                    styles.tipoTag,
                    r.tipo === 'ato' ? styles.tipoAto : {},
                    r.tipo === 'mensal' ? styles.tipoMensal : {},
                    r.tipo === 'anual' ? styles.tipoAnual : {},
                    r.tipo === 'financiamento' ? styles.tipoFinanciamento : {},
                  ]}>
                    {TIPO_LABELS[r.tipo]}
                  </Text>
                  <Text style={{ fontSize: 6 }}>{formatDataCurta(r.data)}</Text>
                </View>
              ))}
            </View>

            {/* Linhas por autonomo */}
            {autonomos.map((autonomo, index) => (
              <View key={autonomo.id} style={[styles.matrizRow, index % 2 === 1 ? { backgroundColor: '#F9FAFB' } : {}]}>
                <Text style={styles.matrizCellFirst}>{autonomo.nome}</Text>
                <Text style={[styles.matrizCell, { fontWeight: 'bold', color: '#4F46E5' }]}>
                  {formatMoeda(totaisPorAutonomo[autonomo.id] || 0)}
                </Text>
                {matrizRateio.map((rateio) => {
                  const pag = rateio.pagamentos.find(p => p.autonomoId === autonomo.id);
                  return (
                    <View key={rateio.id} style={styles.matrizCell}>
                      <Text style={{ fontSize: 5, color: '#6B7280' }}>{pag?.percentual || 0}%</Text>
                      <Text style={{ fontSize: 7 }}>{pag && pag.valor > 0 ? formatMoeda(pag.valor) : '-'}</Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Totais */}
            <View style={styles.matrizTotal}>
              <Text style={[styles.matrizCellFirst, { fontWeight: 'bold' }]}>TOTAL</Text>
              <Text style={[styles.matrizCell, { fontWeight: 'bold', color: '#4F46E5' }]}>
                {formatMoeda(totalComissoes)}
              </Text>
              {matrizRateio.map((rateio) => {
                const totalParcela = rateio.pagamentos.reduce((sum, p) => sum + p.valor, 0);
                return (
                  <Text key={rateio.id} style={[styles.matrizCell, { fontWeight: 'bold' }]}>
                    {formatMoeda(totalParcela)}
                  </Text>
                );
              })}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Documento gerado em {new Date().toLocaleDateString('pt-BR')} as {new Date().toLocaleTimeString('pt-BR')}</Text>
          <Text>Sistema de Controle de Comissoes - Pratica Imobiliaria</Text>
        </View>
      </Page>
    </Document>
  );
}

export default ComissaoPDFTemplate;
