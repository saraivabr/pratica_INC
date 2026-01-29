'use client';

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { VendaCompleta, DadosEmpresa } from './types';

// Registrar fonte (opcional - usar fonte padrão se não disponível)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf',
// });

// Estilos profissionais
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  empresaNome: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginTop: 5,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 5,
  },
  subtitulo: {
    fontSize: 10,
    color: '#666666',
  },
  // Secoes
  secao: {
    marginBottom: 15,
  },
  secaoTitulo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a5f',
    backgroundColor: '#f0f4f8',
    padding: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1e3a5f',
  },
  secaoConteudo: {
    paddingLeft: 10,
  },
  // Linhas de dados
  linha: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    color: '#666666',
    width: 120,
  },
  valor: {
    fontSize: 10,
    color: '#333333',
    flex: 1,
  },
  valorDestaque: {
    fontSize: 11,
    color: '#1e3a5f',
    fontWeight: 'bold',
    flex: 1,
  },
  // Tabela
  tabela: {
    marginTop: 10,
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 8,
  },
  tabelaHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabelaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 8,
  },
  tabelaRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 8,
    backgroundColor: '#f9fafb',
  },
  tabelaCell: {
    fontSize: 9,
    color: '#333333',
  },
  // Colunas da tabela de distribuicao
  colBeneficiario: { width: '35%' },
  colCargo: { width: '20%' },
  colPercentual: { width: '15%', textAlign: 'right' },
  colValor: { width: '30%', textAlign: 'right' },
  // Colunas da tabela de parcelas
  colNumero: { width: '10%' },
  colVencimento: { width: '20%' },
  colValorParcela: { width: '25%', textAlign: 'right' },
  colStatus: { width: '20%' },
  colPagamento: { width: '25%', textAlign: 'right' },
  // Status
  statusContainer: {
    flexDirection: 'row',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f4f8',
    borderRadius: 5,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 3,
  },
  statusValor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  // Badge de status
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
  },
  badgePendente: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgePaga: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgeVencida: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
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
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
  },
  // Separador
  separador: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 10,
  },
});

// Funcoes auxiliares
function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

function formatarData(data: Date): string {
  return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
}

function formatarDataHora(data: Date): string {
  return format(new Date(data), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
}

function formatarPercentual(valor: number): string {
  return `${valor.toFixed(2).replace('.', ',')}%`;
}

function formatarCargo(cargo: string): string {
  const cargos: Record<string, string> = {
    corretor: 'Corretor',
    gerente: 'Gerente',
    diretor: 'Diretor',
    coordenador: 'Coordenador',
    parceiro: 'Parceiro',
  };
  return cargos[cargo] || cargo;
}

function formatarStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pendente: 'Pendente',
    paga: 'Paga',
    vencida: 'Vencida',
    cancelada: 'Cancelada',
    em_andamento: 'Em Andamento',
    concluida: 'Concluida',
    distratada: 'Distratada',
  };
  return statusMap[status] || status;
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'paga':
      return styles.badgePaga;
    case 'vencida':
      return styles.badgeVencida;
    default:
      return styles.badgePendente;
  }
}

interface RelatorioVendaPDFProps {
  venda: VendaCompleta;
  empresa: DadosEmpresa;
}

export function RelatorioVendaPDF({ venda, empresa }: RelatorioVendaPDFProps) {
  const parcelasPagas = venda.comissao.parcelas.filter(p => p.status === 'paga').length;
  const parcelasTotal = venda.comissao.parcelas.length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {empresa.logo ? (
              <Image style={styles.logo} src={empresa.logo} />
            ) : (
              <Text style={styles.empresaNome}>{empresa.nome}</Text>
            )}
            {empresa.logo && <Text style={styles.empresaNome}>{empresa.nome}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.titulo}>RELATORIO DE VENDA</Text>
            <Text style={styles.subtitulo}>
              Gerado em: {formatarDataHora(new Date())}
            </Text>
          </View>
        </View>

        {/* Dados da Venda */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>DADOS DA VENDA</Text>
          <View style={styles.secaoConteudo}>
            <View style={styles.linha}>
              <Text style={styles.label}>Codigo:</Text>
              <Text style={styles.valorDestaque}>{venda.codigo}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.label}>Data:</Text>
              <Text style={styles.valor}>{formatarData(venda.dataVenda)}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.valor}>{formatarStatus(venda.status)}</Text>
            </View>
          </View>
        </View>

        {/* Imovel */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>IMOVEL</Text>
          <View style={styles.secaoConteudo}>
            <View style={styles.linha}>
              <Text style={styles.label}>Empreendimento:</Text>
              <Text style={styles.valorDestaque}>{venda.imovel.empreendimento}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.label}>Unidade:</Text>
              <Text style={styles.valor}>{venda.imovel.unidade}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.label}>Tipo:</Text>
              <Text style={styles.valor}>{venda.imovel.tipo}</Text>
            </View>
            {venda.imovel.area && (
              <View style={styles.linha}>
                <Text style={styles.label}>Area:</Text>
                <Text style={styles.valor}>{venda.imovel.area} m2</Text>
              </View>
            )}
            <View style={styles.linha}>
              <Text style={styles.label}>Valor:</Text>
              <Text style={styles.valorDestaque}>
                {formatarMoeda(venda.imovel.valor)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>CLIENTE</Text>
          <View style={styles.secaoConteudo}>
            <View style={styles.linha}>
              <Text style={styles.label}>Nome:</Text>
              <Text style={styles.valorDestaque}>{venda.cliente.nome}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.label}>CPF:</Text>
              <Text style={styles.valor}>{venda.cliente.cpf}</Text>
            </View>
            {venda.cliente.email && (
              <View style={styles.linha}>
                <Text style={styles.label}>E-mail:</Text>
                <Text style={styles.valor}>{venda.cliente.email}</Text>
            </View>
            )}
            {venda.cliente.telefone && (
              <View style={styles.linha}>
                <Text style={styles.label}>Telefone:</Text>
                <Text style={styles.valor}>{venda.cliente.telefone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Comissao */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>COMISSAO</Text>
          <View style={styles.secaoConteudo}>
            <View style={styles.linha}>
              <Text style={styles.label}>Percentual:</Text>
              <Text style={styles.valor}>
                {formatarPercentual(venda.comissao.percentual)}
              </Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.label}>Valor Total:</Text>
              <Text style={styles.valorDestaque}>
                {formatarMoeda(venda.comissao.valorTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* Distribuicao */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>DISTRIBUICAO</Text>
          <View style={styles.tabela}>
            <View style={styles.tabelaHeader}>
              <Text style={[styles.tabelaHeaderCell, styles.colBeneficiario]}>
                Beneficiario
              </Text>
              <Text style={[styles.tabelaHeaderCell, styles.colCargo]}>
                Cargo
              </Text>
              <Text style={[styles.tabelaHeaderCell, styles.colPercentual]}>
                %
              </Text>
              <Text style={[styles.tabelaHeaderCell, styles.colValor]}>
                Valor
              </Text>
            </View>
            {venda.comissao.distribuicoes.map((dist, index) => (
              <View
                key={dist.beneficiarioId}
                style={index % 2 === 0 ? styles.tabelaRow : styles.tabelaRowAlt}
              >
                <Text style={[styles.tabelaCell, styles.colBeneficiario]}>
                  {dist.beneficiario.nome}
                </Text>
                <Text style={[styles.tabelaCell, styles.colCargo]}>
                  {formatarCargo(dist.beneficiario.cargo)}
                </Text>
                <Text style={[styles.tabelaCell, styles.colPercentual]}>
                  {formatarPercentual(dist.percentual)}
                </Text>
                <Text style={[styles.tabelaCell, styles.colValor]}>
                  {formatarMoeda(dist.valor)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cronograma de Pagamento */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>CRONOGRAMA DE PAGAMENTO</Text>
          <View style={styles.tabela}>
            <View style={styles.tabelaHeader}>
              <Text style={[styles.tabelaHeaderCell, styles.colNumero]}>
                #
              </Text>
              <Text style={[styles.tabelaHeaderCell, styles.colVencimento]}>
                Vencimento
              </Text>
              <Text style={[styles.tabelaHeaderCell, styles.colValorParcela]}>
                Valor
              </Text>
              <Text style={[styles.tabelaHeaderCell, styles.colStatus]}>
                Status
              </Text>
              <Text style={[styles.tabelaHeaderCell, styles.colPagamento]}>
                Pagamento
              </Text>
            </View>
            {venda.comissao.parcelas.map((parcela, index) => (
              <View
                key={parcela.id}
                style={index % 2 === 0 ? styles.tabelaRow : styles.tabelaRowAlt}
              >
                <Text style={[styles.tabelaCell, styles.colNumero]}>
                  {parcela.numero}
                </Text>
                <Text style={[styles.tabelaCell, styles.colVencimento]}>
                  {formatarData(parcela.dataVencimento)}
                </Text>
                <Text style={[styles.tabelaCell, styles.colValorParcela]}>
                  {formatarMoeda(parcela.valor)}
                </Text>
                <View style={styles.colStatus}>
                  <Text
                    style={[styles.badge, getStatusBadgeStyle(parcela.status)]}
                  >
                    {formatarStatus(parcela.status)}
                  </Text>
                </View>
                <Text style={[styles.tabelaCell, styles.colPagamento]}>
                  {parcela.dataPagamento
                    ? formatarData(parcela.dataPagamento)
                    : '-'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Status Resumo */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Status da Venda</Text>
            <Text style={styles.statusValor}>{formatarStatus(venda.status)}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Parcelas Pagas</Text>
            <Text style={styles.statusValor}>
              {parcelasPagas} / {parcelasTotal}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Valor Pago</Text>
            <Text style={styles.statusValor}>
              {formatarMoeda(
                venda.comissao.parcelas
                  .filter(p => p.status === 'paga')
                  .reduce((acc, p) => acc + p.valor, 0)
              )}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {empresa.nome} - CNPJ: {empresa.cnpj}
          </Text>
          <Text style={styles.footerText}>
            Documento gerado automaticamente
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export default RelatorioVendaPDF;
