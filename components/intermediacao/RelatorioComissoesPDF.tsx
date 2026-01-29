'use client';

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Beneficiario, ComissaoDetalhada, Totais, DadosEmpresa } from './types';

// Estilos para extrato de comissoes
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
    width: 100,
    height: 35,
    objectFit: 'contain',
  },
  empresaNome: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 5,
  },
  subtitulo: {
    fontSize: 9,
    color: '#666666',
  },
  // Info do beneficiario
  beneficiarioContainer: {
    backgroundColor: '#f0f4f8',
    padding: 15,
    marginBottom: 20,
    borderRadius: 5,
  },
  beneficiarioNome: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 8,
  },
  beneficiarioInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  beneficiarioItem: {
    width: '50%',
    marginBottom: 5,
  },
  beneficiarioLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 2,
  },
  beneficiarioValor: {
    fontSize: 10,
    color: '#333333',
  },
  // Periodo
  periodoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
  },
  periodoItem: {
    alignItems: 'center',
  },
  periodoLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 3,
  },
  periodoValor: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  // Resumo
  resumoContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  resumoCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 5,
    borderLeftWidth: 3,
  },
  resumoCardVendas: {
    borderLeftColor: '#3b82f6',
  },
  resumoCardComissoes: {
    borderLeftColor: '#10b981',
  },
  resumoCardPago: {
    borderLeftColor: '#22c55e',
  },
  resumoCardPendente: {
    borderLeftColor: '#f59e0b',
  },
  resumoLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 4,
  },
  resumoValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  resumoSubvalor: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
  // Tabela de extrato
  tabelaTitulo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabela: {
    marginBottom: 15,
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 8,
  },
  tabelaHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabelaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 8,
    minHeight: 35,
  },
  tabelaRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 8,
    minHeight: 35,
    backgroundColor: '#f9fafb',
  },
  tabelaCell: {
    fontSize: 8,
    color: '#333333',
  },
  tabelaCellBold: {
    fontSize: 8,
    color: '#333333',
    fontWeight: 'bold',
  },
  // Colunas extrato
  colData: { width: '12%' },
  colCodigo: { width: '15%' },
  colEmpreendimento: { width: '25%' },
  colValorVenda: { width: '16%', textAlign: 'right' },
  colPercentual: { width: '8%', textAlign: 'right' },
  colComissao: { width: '14%', textAlign: 'right' },
  colStatus: { width: '10%', textAlign: 'center' },
  // Subtotal
  subtotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
    padding: 8,
    borderTopWidth: 2,
    borderTopColor: '#1e3a5f',
  },
  subtotalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e3a5f',
    width: '60%',
  },
  subtotalValor: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e3a5f',
    width: '40%',
    textAlign: 'right',
  },
  // Parcelas pendentes
  parcelasTitulo: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginTop: 15,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  parcelasHeader: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    padding: 6,
  },
  parcelasHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  parcelaRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 6,
  },
  // Colunas parcelas
  pColVencimento: { width: '18%' },
  pColCodigo: { width: '18%' },
  pColParcela: { width: '12%' },
  pColEmpreendimento: { width: '27%' },
  pColValor: { width: '15%', textAlign: 'right' },
  pColStatus: { width: '10%', textAlign: 'center' },
  // Badges
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 7,
    textAlign: 'center',
  },
  badgePago: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgePendente: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeVencido: {
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
  pageNumber: {
    fontSize: 8,
    color: '#999999',
  },
  // Aviso
  aviso: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  avisoText: {
    fontSize: 8,
    color: '#92400e',
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

interface RelatorioComissoesPDFProps {
  beneficiario: Beneficiario;
  periodo: { inicio: Date; fim: Date };
  comissoes: ComissaoDetalhada[];
  totais: Totais;
  empresa?: DadosEmpresa;
}

export function RelatorioComissoesPDF({
  beneficiario,
  periodo,
  comissoes,
  totais,
  empresa,
}: RelatorioComissoesPDFProps) {
  // Coletar todas as parcelas pendentes/vencidas
  const parcelasPendentes = comissoes.flatMap(c =>
    c.parcelas
      .filter(p => p.status === 'pendente' || p.status === 'vencida')
      .map(p => ({
        ...p,
        vendaCodigo: c.venda.codigo,
        empreendimento: c.venda.empreendimento,
        numeroParcela: p.numero,
        totalParcelas: c.parcelasTotal,
      }))
  ).sort((a, b) =>
    new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {empresa?.logo ? (
              <Image style={styles.logo} src={empresa.logo} />
            ) : empresa?.nome ? (
              <Text style={styles.empresaNome}>{empresa.nome}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.titulo}>EXTRATO DE COMISSOES</Text>
            <Text style={styles.subtitulo}>
              Emitido em: {format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </Text>
          </View>
        </View>

        {/* Info do Beneficiario */}
        <View style={styles.beneficiarioContainer}>
          <Text style={styles.beneficiarioNome}>{beneficiario.nome}</Text>
          <View style={styles.beneficiarioInfo}>
            <View style={styles.beneficiarioItem}>
              <Text style={styles.beneficiarioLabel}>Cargo</Text>
              <Text style={styles.beneficiarioValor}>
                {formatarCargo(beneficiario.cargo)}
              </Text>
            </View>
            {beneficiario.cpf && (
              <View style={styles.beneficiarioItem}>
                <Text style={styles.beneficiarioLabel}>CPF</Text>
                <Text style={styles.beneficiarioValor}>{beneficiario.cpf}</Text>
              </View>
            )}
            {beneficiario.email && (
              <View style={styles.beneficiarioItem}>
                <Text style={styles.beneficiarioLabel}>E-mail</Text>
                <Text style={styles.beneficiarioValor}>{beneficiario.email}</Text>
              </View>
            )}
            {beneficiario.telefone && (
              <View style={styles.beneficiarioItem}>
                <Text style={styles.beneficiarioLabel}>Telefone</Text>
                <Text style={styles.beneficiarioValor}>{beneficiario.telefone}</Text>
              </View>
            )}
            {beneficiario.pix && (
              <View style={styles.beneficiarioItem}>
                <Text style={styles.beneficiarioLabel}>Chave PIX</Text>
                <Text style={styles.beneficiarioValor}>{beneficiario.pix}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Periodo */}
        <View style={styles.periodoContainer}>
          <View style={styles.periodoItem}>
            <Text style={styles.periodoLabel}>Periodo de</Text>
            <Text style={styles.periodoValor}>{formatarData(periodo.inicio)}</Text>
          </View>
          <View style={styles.periodoItem}>
            <Text style={styles.periodoLabel}>Periodo ate</Text>
            <Text style={styles.periodoValor}>{formatarData(periodo.fim)}</Text>
          </View>
          <View style={styles.periodoItem}>
            <Text style={styles.periodoLabel}>Total de Vendas</Text>
            <Text style={styles.periodoValor}>{totais.quantidadeVendas}</Text>
          </View>
        </View>

        {/* Resumo */}
        <View style={styles.resumoContainer}>
          <View style={[styles.resumoCard, styles.resumoCardVendas]}>
            <Text style={styles.resumoLabel}>Total em Vendas</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(totais.totalVendas)}</Text>
            <Text style={styles.resumoSubvalor}>
              {totais.quantidadeVendas} venda(s)
            </Text>
          </View>
          <View style={[styles.resumoCard, styles.resumoCardComissoes]}>
            <Text style={styles.resumoLabel}>Total em Comissoes</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(totais.totalComissoes)}</Text>
            <Text style={styles.resumoSubvalor}>
              {totais.quantidadeParcelas} parcela(s)
            </Text>
          </View>
          <View style={[styles.resumoCard, styles.resumoCardPago]}>
            <Text style={styles.resumoLabel}>Valor Pago</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(totais.totalPago)}</Text>
            <Text style={styles.resumoSubvalor}>
              {totais.parcelasPagas} parcela(s)
            </Text>
          </View>
          <View style={[styles.resumoCard, styles.resumoCardPendente]}>
            <Text style={styles.resumoLabel}>Valor Pendente</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(totais.totalPendente)}</Text>
            <Text style={styles.resumoSubvalor}>
              {totais.parcelasPendentes + totais.parcelasVencidas} parcela(s)
            </Text>
          </View>
        </View>

        {/* Tabela de Extrato */}
        <Text style={styles.tabelaTitulo}>Detalhamento das Comissoes</Text>
        <View style={styles.tabela}>
          <View style={styles.tabelaHeader}>
            <Text style={[styles.tabelaHeaderCell, styles.colData]}>Data</Text>
            <Text style={[styles.tabelaHeaderCell, styles.colCodigo]}>Codigo</Text>
            <Text style={[styles.tabelaHeaderCell, styles.colEmpreendimento]}>
              Empreendimento/Unidade
            </Text>
            <Text style={[styles.tabelaHeaderCell, styles.colValorVenda]}>
              Valor Venda
            </Text>
            <Text style={[styles.tabelaHeaderCell, styles.colPercentual]}>%</Text>
            <Text style={[styles.tabelaHeaderCell, styles.colComissao]}>
              Comissao
            </Text>
            <Text style={[styles.tabelaHeaderCell, styles.colStatus]}>
              Parcelas
            </Text>
          </View>
          {comissoes.map((comissao, index) => (
            <View
              key={comissao.id}
              style={index % 2 === 0 ? styles.tabelaRow : styles.tabelaRowAlt}
            >
              <Text style={[styles.tabelaCell, styles.colData]}>
                {formatarData(comissao.venda.dataVenda)}
              </Text>
              <Text style={[styles.tabelaCellBold, styles.colCodigo]}>
                {comissao.venda.codigo}
              </Text>
              <View style={styles.colEmpreendimento}>
                <Text style={styles.tabelaCellBold}>
                  {comissao.venda.empreendimento}
                </Text>
                <Text style={[styles.tabelaCell, { color: '#666666', marginTop: 2 }]}>
                  {comissao.venda.unidade}
                </Text>
              </View>
              <Text style={[styles.tabelaCell, styles.colValorVenda]}>
                {formatarMoeda(comissao.venda.valorVenda)}
              </Text>
              <Text style={[styles.tabelaCell, styles.colPercentual]}>
                {formatarPercentual(comissao.percentual)}
              </Text>
              <Text style={[styles.tabelaCellBold, styles.colComissao]}>
                {formatarMoeda(comissao.valor)}
              </Text>
              <Text style={[styles.tabelaCell, styles.colStatus]}>
                {comissao.parcelasPagas}/{comissao.parcelasTotal}
              </Text>
            </View>
          ))}
          {/* Subtotal */}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>TOTAL DO PERIODO</Text>
            <Text style={styles.subtotalValor}>
              {formatarMoeda(totais.totalComissoes)}
            </Text>
          </View>
        </View>

        {/* Parcelas Pendentes */}
        {parcelasPendentes.length > 0 && (
          <>
            <Text style={styles.parcelasTitulo}>
              Parcelas Pendentes ({parcelasPendentes.length})
            </Text>
            <View style={styles.tabela}>
              <View style={styles.parcelasHeader}>
                <Text style={[styles.parcelasHeaderCell, styles.pColVencimento]}>
                  Vencimento
                </Text>
                <Text style={[styles.parcelasHeaderCell, styles.pColCodigo]}>
                  Codigo
                </Text>
                <Text style={[styles.parcelasHeaderCell, styles.pColParcela]}>
                  Parcela
                </Text>
                <Text style={[styles.parcelasHeaderCell, styles.pColEmpreendimento]}>
                  Empreendimento
                </Text>
                <Text style={[styles.parcelasHeaderCell, styles.pColValor]}>
                  Valor
                </Text>
                <Text style={[styles.parcelasHeaderCell, styles.pColStatus]}>
                  Status
                </Text>
              </View>
              {parcelasPendentes.slice(0, 15).map((parcela, index) => {
                const isVencida = parcela.status === 'vencida' ||
                  new Date(parcela.dataVencimento) < new Date();
                return (
                  <View
                    key={`${parcela.vendaCodigo}-${parcela.id}`}
                    style={styles.parcelaRow}
                  >
                    <Text style={[styles.tabelaCell, styles.pColVencimento]}>
                      {formatarData(parcela.dataVencimento)}
                    </Text>
                    <Text style={[styles.tabelaCell, styles.pColCodigo]}>
                      {parcela.vendaCodigo}
                    </Text>
                    <Text style={[styles.tabelaCell, styles.pColParcela]}>
                      {parcela.numeroParcela}/{parcela.totalParcelas}
                    </Text>
                    <Text style={[styles.tabelaCell, styles.pColEmpreendimento]}>
                      {parcela.empreendimento}
                    </Text>
                    <Text style={[styles.tabelaCellBold, styles.pColValor]}>
                      {formatarMoeda(parcela.valor)}
                    </Text>
                    <View style={styles.pColStatus}>
                      <Text
                        style={[
                          styles.badge,
                          isVencida ? styles.badgeVencido : styles.badgePendente,
                        ]}
                      >
                        {isVencida ? 'Vencida' : 'Pendente'}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {parcelasPendentes.length > 15 && (
                <View style={styles.aviso}>
                  <Text style={styles.avisoText}>
                    Exibindo 15 de {parcelasPendentes.length} parcelas pendentes.
                    Consulte o sistema para a lista completa.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {empresa?.nome || 'Sistema de Intermediacao'} - Extrato de Comissoes
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export default RelatorioComissoesPDF;
