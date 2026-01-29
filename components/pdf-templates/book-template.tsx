import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

const primaryColor = '#7c3aed';
const secondaryColor = '#10b981';
const textColor = '#374151';
const mutedColor = '#6b7280';
const borderColor = '#e5e7eb';
const backgroundColor = '#f9fafb';

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: textColor,
  },
  // Capa
  coverPage: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  coverImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 40,
    paddingTop: 100,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
  },
  coverBadge: {
    backgroundColor: primaryColor,
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  coverLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  coverPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  coverPriceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  coverLogo: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: primaryColor,
  },
  // Páginas internas
  contentPage: {
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: primaryColor,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: primaryColor,
  },
  headerSubtitle: {
    fontSize: 10,
    color: mutedColor,
  },
  // Descrição
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: textColor,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
  },
  description: {
    fontSize: 11,
    lineHeight: 1.6,
    color: mutedColor,
    marginBottom: 24,
    textAlign: 'justify',
  },
  // Diferenciais
  diferenciaisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  diferencial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: backgroundColor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    width: '48%',
  },
  diferencialIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    color: secondaryColor,
  },
  diferencialText: {
    fontSize: 9,
    color: textColor,
  },
  // Info boxes
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  infoBox: {
    flex: 1,
    backgroundColor: backgroundColor,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: borderColor,
  },
  infoLabel: {
    fontSize: 9,
    color: mutedColor,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: textColor,
  },
  // Tabela de unidades
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: primaryColor,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableHeaderCell: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
  },
  tableRowAlt: {
    backgroundColor: backgroundColor,
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'center',
    color: textColor,
  },
  tableCellPrice: {
    fontSize: 9,
    textAlign: 'center',
    fontWeight: 'bold',
    color: primaryColor,
  },
  // Colunas da tabela
  colUnidade: { width: '15%' },
  colTipo: { width: '20%' },
  colArea: { width: '15%' },
  colQuartos: { width: '15%' },
  colVagas: { width: '15%' },
  colValor: { width: '20%' },
  // Status badges
  statusDisponivel: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
  },
  statusReservado: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
  },
  statusVendido: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: borderColor,
  },
  footerLeft: {
    flexDirection: 'column',
  },
  footerCorretorName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: textColor,
    marginBottom: 2,
  },
  footerCorretorPhone: {
    fontSize: 10,
    color: mutedColor,
  },
  footerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: primaryColor,
  },
  footerDate: {
    fontSize: 8,
    color: mutedColor,
    marginTop: 2,
  },
  // Summary box
  summaryBox: {
    backgroundColor: primaryColor + '10',
    borderWidth: 1,
    borderColor: primaryColor + '30',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: primaryColor,
  },
  summaryLabel: {
    fontSize: 9,
    color: mutedColor,
    marginTop: 4,
  },
  // Checkmark
  checkmark: {
    width: 12,
    height: 12,
    backgroundColor: secondaryColor,
    borderRadius: 6,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
});

function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

interface BookTemplateProps {
  empreendimento: {
    nome: string;
    cidade?: string;
    bairro?: string;
    construtora?: string;
    previsaoEntrega?: string;
    tipo?: string;
    descricao?: string;
    diferenciais?: string[];
    imagemPrincipal?: string;
    precoMinimo?: number;
    precoMaximo?: number;
  };
  unidades: Array<{
    id: string;
    tipo: string;
    metragem: number;
    valor: number;
    status: string;
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

export function BookTemplate({ empreendimento, unidades, corretor }: BookTemplateProps) {
  const disponiveisCount = unidades.filter(u => u.status === 'disponivel').length;
  const unidadesDisponiveis = unidades.filter(u => u.status === 'disponivel').slice(0, 15);
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const tipoLabel = empreendimento.tipo === 'apartamento'
    ? 'Apartamento'
    : empreendimento.tipo === 'casa'
      ? 'Casa'
      : empreendimento.tipo || '';
  const location = [empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(', ');
  const hasPrice = typeof empreendimento.precoMinimo === 'number' && empreendimento.precoMinimo > 0;

  return (
    <Document>
      {/* Página 1: Capa */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          {empreendimento.imagemPrincipal && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={empreendimento.imagemPrincipal} style={styles.coverImage} />
          )}

          <View style={styles.coverLogo}>
            <Text style={styles.logoText}>PRATICA</Text>
          </View>

          <View style={styles.coverOverlay}>
            {tipoLabel ? <Text style={styles.coverBadge}>{tipoLabel}</Text> : null}
            <Text style={styles.coverTitle}>{empreendimento.nome}</Text>
            {location ? <Text style={styles.coverLocation}>{location}</Text> : null}
            {hasPrice ? (
              <>
                <Text style={styles.coverPriceLabel}>A partir de</Text>
                <Text style={styles.coverPrice}>{formatCurrency(empreendimento.precoMinimo)}</Text>
              </>
            ) : null}
          </View>
        </View>
      </Page>

      {/* Página 2: Descrição e Diferenciais */}
      <Page size="A4" style={[styles.page, styles.contentPage]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{empreendimento.nome}</Text>
            {location ? <Text style={styles.headerSubtitle}>{location}</Text> : null}
          </View>
          <Text style={styles.logoText}>PRATICA</Text>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Construtora</Text>
            <Text style={styles.infoValue}>{empreendimento.construtora || '-'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Previsao de Entrega</Text>
            <Text style={styles.infoValue}>{empreendimento.previsaoEntrega || '-'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Disponiveis</Text>
            <Text style={[styles.infoValue, { color: secondaryColor }]}>{disponiveisCount} unidades</Text>
          </View>
        </View>

        {/* Descrição */}
        {empreendimento.descricao && (
          <>
            <Text style={styles.sectionTitle}>Sobre o Empreendimento</Text>
            <Text style={styles.description}>{empreendimento.descricao}</Text>
          </>
        )}

        {/* Diferenciais */}
        {empreendimento.diferenciais && empreendimento.diferenciais.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Diferenciais</Text>
            <View style={styles.diferenciaisGrid}>
              {empreendimento.diferenciais.slice(0, 10).map((dif, index) => (
                <View key={index} style={styles.diferencial}>
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                  <Text style={styles.diferencialText}>{dif}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerCorretorName}>{corretor.nome}</Text>
            <Text style={styles.footerCorretorPhone}>{formatPhone(corretor.telefone)}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerBrand}>PRATICA</Text>
            <Text style={styles.footerDate}>Atualizado em {currentDate}</Text>
          </View>
        </View>
      </Page>

      {/* Página 3: Tabela de Unidades */}
      {unidadesDisponiveis.length > 0 && (
        <Page size="A4" style={[styles.page, styles.contentPage]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Unidades Disponiveis</Text>
              <Text style={styles.headerSubtitle}>{empreendimento.nome}</Text>
            </View>
            <Text style={styles.logoText}>PRATICA</Text>
          </View>

          {/* Summary */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{disponiveisCount}</Text>
              <Text style={styles.summaryLabel}>Disponiveis</Text>
            </View>
            {hasPrice ? (
              <>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatCurrency(empreendimento.precoMinimo)}</Text>
                  <Text style={styles.summaryLabel}>A partir de</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatCurrency(empreendimento.precoMaximo)}</Text>
                  <Text style={styles.summaryLabel}>Ate</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Tabela */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colUnidade]}>Unidade</Text>
              <Text style={[styles.tableHeaderCell, styles.colTipo]}>Tipo</Text>
              <Text style={[styles.tableHeaderCell, styles.colArea]}>Area</Text>
              <Text style={[styles.tableHeaderCell, styles.colQuartos]}>Quartos</Text>
              <Text style={[styles.tableHeaderCell, styles.colVagas]}>Vagas</Text>
              <Text style={[styles.tableHeaderCell, styles.colValor]}>Valor</Text>
            </View>

            {unidadesDisponiveis.map((unidade, index) => (
              <View
                key={unidade.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, styles.colUnidade]}>
                  {unidade.andar ? `${unidade.andar}${unidade.final || ''}` : '-'}
                </Text>
                <Text style={[styles.tableCell, styles.colTipo]}>{unidade.tipo}</Text>
                <Text style={[styles.tableCell, styles.colArea]}>{unidade.metragem}m²</Text>
                <Text style={[styles.tableCell, styles.colQuartos]}>{unidade.quartos}</Text>
                <Text style={[styles.tableCell, styles.colVagas]}>{unidade.vagas}</Text>
                <Text style={[styles.tableCellPrice, styles.colValor]}>
                  {formatCurrency(unidade.valor)}
                </Text>
              </View>
            ))}
          </View>

          {unidades.filter(u => u.status === 'disponivel').length > 15 && (
            <Text style={{ marginTop: 12, fontSize: 9, color: mutedColor, textAlign: 'center' }}>
              E mais {unidades.filter(u => u.status === 'disponivel').length - 15} unidades disponiveis
            </Text>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerCorretorName}>{corretor.nome}</Text>
              <Text style={styles.footerCorretorPhone}>{formatPhone(corretor.telefone)}</Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerBrand}>PRATICA</Text>
              <Text style={styles.footerDate}>Atualizado em {currentDate}</Text>
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
}
