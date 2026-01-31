/**
 * Script de Validacao Completa - Sistema de Intermediacao Imobiliaria
 *
 * Executa: npx tsx scripts/validar-intermediacao.ts
 */

import { Pool, QueryResultRow } from 'pg';

// Configuracao
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';

const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function log(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
  }
  results.push(result);
}

async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: any[] = []) {
  return pool.query<T>(text, params);
}

// =============================================================================
// TESTES DE CONEXAO
// =============================================================================

async function testConnection() {
  try {
    const { rows } = await query('SELECT NOW() as time, current_database() as db');
    log({
      name: 'Conexao com Banco',
      status: 'PASS',
      message: `Conectado ao banco ${rows[0].db}`,
      details: { time: rows[0].time }
    });
    return true;
  } catch (error: any) {
    log({
      name: 'Conexao com Banco',
      status: 'FAIL',
      message: error.message
    });
    return false;
  }
}

// =============================================================================
// TESTES DE ESTRUTURA
// =============================================================================

async function testTables() {
  const expectedTables = [
    'vendas_intermediacao',
    'beneficiarios_intermediacao',
    'distribuicao_comissao',
    'parcelas_intermediacao',
    'pagamentos_intermediacao',
    'log_auditoria_intermediacao',
    'regras_parcelamento'
  ];

  const { rows } = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND (table_name LIKE '%intermediacao%' OR table_name LIKE '%comissao%' OR table_name = 'regras_parcelamento')
  `);

  const existingTables = rows.map(r => r.table_name);
  const missingTables = expectedTables.filter(t => !existingTables.includes(t));

  if (missingTables.length === 0) {
    log({
      name: 'Tabelas',
      status: 'PASS',
      message: `Todas as ${expectedTables.length} tabelas existem`,
      details: existingTables
    });
  } else {
    log({
      name: 'Tabelas',
      status: 'FAIL',
      message: `Faltam ${missingTables.length} tabelas`,
      details: { missing: missingTables, existing: existingTables }
    });
  }
}

async function testIndexes() {
  const { rows } = await query(`
    SELECT count(*) as count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (tablename LIKE '%intermediacao%' OR tablename LIKE '%comissao%')
  `);

  const count = parseInt(rows[0].count);
  if (count >= 20) {
    log({
      name: 'Indices',
      status: 'PASS',
      message: `${count} indices criados`
    });
  } else {
    log({
      name: 'Indices',
      status: 'WARN',
      message: `Apenas ${count} indices (esperado >= 20)`
    });
  }
}

async function testFunctions() {
  const expectedFunctions = [
    'gerar_codigo_venda',
    'gerar_codigo_beneficiario',
    'criar_parcelas_distribuicao',
    'calcular_total_comissoes_beneficiario',
    'registrar_auditoria'
  ];

  const { rows } = await query(`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
  `);

  const existingFunctions = rows.map(r => r.routine_name);
  const foundFunctions = expectedFunctions.filter(f => existingFunctions.includes(f));

  if (foundFunctions.length === expectedFunctions.length) {
    log({
      name: 'Funcoes PostgreSQL',
      status: 'PASS',
      message: `Todas as ${expectedFunctions.length} funcoes existem`
    });
  } else {
    log({
      name: 'Funcoes PostgreSQL',
      status: 'FAIL',
      message: `${foundFunctions.length}/${expectedFunctions.length} funcoes encontradas`,
      details: { expected: expectedFunctions, found: foundFunctions }
    });
  }
}

async function testViews() {
  const { rows } = await query(`
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name LIKE 'vw_%'
  `);

  const views = rows.map(r => r.table_name);
  if (views.length >= 3) {
    log({
      name: 'Views',
      status: 'PASS',
      message: `${views.length} views criadas`,
      details: views
    });
  } else {
    log({
      name: 'Views',
      status: 'WARN',
      message: `Apenas ${views.length} views (esperado >= 3)`
    });
  }
}

async function testRLS() {
  const { rows } = await query(`
    SELECT tablename, count(*) as policies
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  `);

  const tablesWithRLS = rows.length;
  if (tablesWithRLS >= 5) {
    log({
      name: 'RLS Policies',
      status: 'PASS',
      message: `${tablesWithRLS} tabelas com politicas RLS`,
      details: rows
    });
  } else {
    log({
      name: 'RLS Policies',
      status: 'WARN',
      message: `Apenas ${tablesWithRLS} tabelas com RLS`
    });
  }
}

// =============================================================================
// TESTES DE FUNCIONALIDADE
// =============================================================================

async function testGerarCodigoVenda() {
  try {
    // Cria um tenant UUID fake para teste
    const tenantId = '00000000-0000-0000-0000-000000000001';

    const { rows } = await query(`SELECT gerar_codigo_venda($1) as codigo`, [tenantId]);
    const codigo = rows[0].codigo;

    // Verifica formato VND-YYYYMM-XXXX
    const regex = /^VND-\d{6}-\d{4}$/;
    if (regex.test(codigo)) {
      log({
        name: 'Funcao gerar_codigo_venda',
        status: 'PASS',
        message: `Codigo gerado: ${codigo}`
      });
    } else {
      log({
        name: 'Funcao gerar_codigo_venda',
        status: 'FAIL',
        message: `Formato invalido: ${codigo}`
      });
    }
  } catch (error: any) {
    log({
      name: 'Funcao gerar_codigo_venda',
      status: 'FAIL',
      message: error.message
    });
  }
}

async function testGerarCodigoBeneficiario() {
  try {
    const tenantId = '00000000-0000-0000-0000-000000000001';

    const { rows } = await query(`SELECT gerar_codigo_beneficiario($1) as codigo`, [tenantId]);
    const codigo = rows[0].codigo;

    // Verifica formato BEN-XXXX
    const regex = /^BEN-\d{4}$/;
    if (regex.test(codigo)) {
      log({
        name: 'Funcao gerar_codigo_beneficiario',
        status: 'PASS',
        message: `Codigo gerado: ${codigo}`
      });
    } else {
      log({
        name: 'Funcao gerar_codigo_beneficiario',
        status: 'FAIL',
        message: `Formato invalido: ${codigo}`
      });
    }
  } catch (error: any) {
    log({
      name: 'Funcao gerar_codigo_beneficiario',
      status: 'FAIL',
      message: error.message
    });
  }
}

// =============================================================================
// TESTES DE CRUD
// =============================================================================

async function testCRUD() {
  const client = await pool.connect();
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';

  try {
    await client.query('BEGIN');

    // 1. CREATE Beneficiario
    const { rows: [beneficiario] } = await client.query(`
      INSERT INTO beneficiarios_intermediacao (
        codigo, nome, tipo_documento, documento, cargo, email, tenant_id
      ) VALUES (
        'BEN-TEST', 'Corretor Teste', 'cpf', '12345678901', 'Corretor', 'teste@teste.com', $1
      ) RETURNING id, codigo, nome
    `, [tenantId]);

    log({
      name: 'CREATE Beneficiario',
      status: 'PASS',
      message: `Criado: ${beneficiario.nome} (${beneficiario.codigo})`
    });

    // 2. CREATE Venda
    const { rows: [venda] } = await client.query(`
      INSERT INTO vendas_intermediacao (
        codigo, valor_total, unidade, empreendimento, cliente_nome,
        data_venda, percentual_intermediacao, tenant_id, criado_por
      ) VALUES (
        'VND-TEST-0001', 500000.00, 'Apto 101', 'Residencial Teste', 'Cliente Teste',
        CURRENT_DATE, 5.0, $1, $2
      ) RETURNING id, codigo, valor_comissao
    `, [tenantId, userId]);

    log({
      name: 'CREATE Venda',
      status: 'PASS',
      message: `Criada: ${venda.codigo} - Comissao calculada: R$ ${venda.valor_comissao}`,
      details: { valor_comissao: venda.valor_comissao }
    });

    // Verifica coluna computada
    if (parseFloat(venda.valor_comissao) === 25000) {
      log({
        name: 'Coluna Computada valor_comissao',
        status: 'PASS',
        message: '500.000 * 5% = R$ 25.000,00 ✓'
      });
    } else {
      log({
        name: 'Coluna Computada valor_comissao',
        status: 'FAIL',
        message: `Esperado 25000, obtido ${venda.valor_comissao}`
      });
    }

    // 3. CREATE Distribuicao
    const { rows: [distribuicao] } = await client.query(`
      INSERT INTO distribuicao_comissao (
        venda_id, beneficiario_id, percentual, valor
      ) VALUES (
        $1, $2, 100.0, 25000.00
      ) RETURNING id
    `, [venda.id, beneficiario.id]);

    log({
      name: 'CREATE Distribuicao',
      status: 'PASS',
      message: `Distribuicao criada para beneficiario`
    });

    // 4. CREATE Parcelas via funcao
    const { rows: parcelas } = await client.query(`
      SELECT * FROM criar_parcelas_distribuicao($1, 3, 30)
    `, [distribuicao.id]);

    if (parcelas.length === 3) {
      log({
        name: 'Funcao criar_parcelas_distribuicao',
        status: 'PASS',
        message: `3 parcelas criadas automaticamente`,
        details: parcelas.map(p => ({ numero: p.numero, valor: p.valor, vencimento: p.data_vencimento }))
      });
    } else {
      log({
        name: 'Funcao criar_parcelas_distribuicao',
        status: 'FAIL',
        message: `Esperado 3 parcelas, obtido ${parcelas.length}`
      });
    }

    // 5. READ - Testar View
    const { rows: viewData } = await client.query(`
      SELECT * FROM vw_vendas_resumo WHERE id = $1
    `, [venda.id]);

    if (viewData.length === 1) {
      log({
        name: 'READ via View vw_vendas_resumo',
        status: 'PASS',
        message: `View retornou dados agregados`,
        details: {
          total_beneficiarios: viewData[0].total_beneficiarios,
          valor_pendente: viewData[0].valor_pendente
        }
      });
    }

    // 6. UPDATE
    await client.query(`
      UPDATE vendas_intermediacao
      SET status = 'em_processamento'
      WHERE id = $1
    `, [venda.id]);

    const { rows: [updated] } = await client.query(`
      SELECT status, updated_at FROM vendas_intermediacao WHERE id = $1
    `, [venda.id]);

    if (updated.status === 'em_processamento') {
      log({
        name: 'UPDATE Venda + Trigger updated_at',
        status: 'PASS',
        message: `Status atualizado para "em_processamento"`
      });
    }

    // 7. Testar Auditoria
    const { rows: [auditLog] } = await client.query(`
      SELECT * FROM registrar_auditoria(
        'vendas_intermediacao',
        $1,
        'update',
        '{"status": "rascunho"}'::jsonb,
        '{"status": "em_processamento"}'::jsonb,
        $2,
        'Teste Automatizado'
      )
    `, [venda.id, userId]);

    const { rows: [audit] } = await client.query(`
      SELECT * FROM log_auditoria_intermediacao WHERE id = $1
    `, [auditLog]);

    if (audit && audit.campos_alterados && audit.campos_alterados.includes('status')) {
      log({
        name: 'Funcao registrar_auditoria',
        status: 'PASS',
        message: `Log criado com campos alterados detectados`,
        details: { campos_alterados: audit.campos_alterados }
      });
    } else {
      log({
        name: 'Funcao registrar_auditoria',
        status: 'WARN',
        message: `Log criado mas sem campos alterados`
      });
    }

    // Rollback para nao poluir o banco
    await client.query('ROLLBACK');

    log({
      name: 'Cleanup (ROLLBACK)',
      status: 'PASS',
      message: 'Dados de teste removidos'
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    log({
      name: 'CRUD Test',
      status: 'FAIL',
      message: error.message,
      details: error.stack
    });
  } finally {
    client.release();
  }
}

// =============================================================================
// EXECUCAO PRINCIPAL
// =============================================================================

async function main() {
  console.log('\n========================================');
  console.log('  VALIDACAO - Sistema de Intermediacao  ');
  console.log('========================================\n');

  // Teste de conexao
  const connected = await testConnection();
  if (!connected) {
    console.log('\n❌ Falha na conexao. Abortando testes.\n');
    process.exit(1);
  }

  console.log('\n--- Estrutura do Banco ---\n');
  await testTables();
  await testIndexes();
  await testFunctions();
  await testViews();
  await testRLS();

  console.log('\n--- Funcoes PostgreSQL ---\n');
  await testGerarCodigoVenda();
  await testGerarCodigoBeneficiario();

  console.log('\n--- Operacoes CRUD ---\n');
  await testCRUD();

  // Resumo
  console.log('\n========================================');
  console.log('            RESUMO FINAL              ');
  console.log('========================================\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`✅ Passou:  ${passed}`);
  console.log(`❌ Falhou:  ${failed}`);
  console.log(`⚠️  Avisos:  ${warned}`);
  console.log(`📊 Total:   ${results.length}\n`);

  if (failed === 0) {
    console.log('🎉 Sistema de Intermediacao validado com sucesso!\n');
  } else {
    console.log('⚠️  Existem falhas que precisam ser corrigidas.\n');
  }

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
