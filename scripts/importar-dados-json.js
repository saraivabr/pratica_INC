#!/usr/bin/env node

/**
 * Script: importar-dados-json.js
 * Descrição: Importa dados dos JSONs para o banco
 * Data: 28 Jan 2026
 */

const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importarEmpreendimentos() {
  console.log('🏢 Importando empreendimentos...\n');
  
  const buildingsPath = path.join(__dirname, '..', 'data', 'buildings_map.json');
  
  if (!fs.existsSync(buildingsPath)) {
    console.log('⚠️  Arquivo buildings_map.json não encontrado');
    return 0;
  }
  
  const buildings = JSON.parse(fs.readFileSync(buildingsPath, 'utf8'));
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let imported = 0;
    
    for (const building of buildings) {
      try {
        await client.query(`
          INSERT INTO cvcrm_empreendimentos (
            id,
            nome,
            endereco,
            cidade,
            estado,
            ativo
          )
          VALUES ($1, $2, $3, $4, $5, true)
          ON CONFLICT (id) DO UPDATE
          SET nome = EXCLUDED.nome,
              endereco = EXCLUDED.endereco
        `, [
          building.id,
          building.nome || building.name,
          building.endereco || building.address,
          building.cidade || 'São Paulo',
          building.estado || 'SP'
        ]);
        
        imported++;
      } catch (err) {
        console.error(`Erro ao importar empreendimento ${building.id}:`, err.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ ${imported} empreendimentos importados\n`);
    return imported;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function importarCorretoresJSON() {
  console.log('👥 Importando corretores do JSON...\n');
  
  const corretoresPath = path.join(__dirname, '..', 'data', 'corretores_api_final.json');
  
  if (!fs.existsSync(corretoresPath)) {
    console.log('⚠️  Arquivo corretores_api_final.json não encontrado');
    return 0;
  }
  
  let corretores;
  try {
    corretores = JSON.parse(fs.readFileSync(corretoresPath, 'utf8'));
  } catch (err) {
    console.log('⚠️  Erro ao ler JSON de corretores:', err.message);
    return 0;
  }
  
  // Se for array direto
  if (!Array.isArray(corretores)) {
    // Pode estar em uma propriedade
    corretores = corretores.data || corretores.corretores || [];
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let imported = 0;
    let skipped = 0;
    
    for (const corretor of corretores.slice(0, 100)) { // Limitar a 100 primeiros
      try {
        const email = corretor.email || `corretor${corretor.id || imported}@pratica.digital`;
        const nome = corretor.nome || corretor.name || 'Corretor';
        const telefone = corretor.telefone || corretor.phone || null;
        const cpf = corretor.cpf || null;
        
        const result = await client.query(`
          INSERT INTO users (
            email, 
            name,
            nome, 
            telefone, 
            cpf, 
            role, 
            tenant_id, 
            workspace_id, 
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, 'corretor', 1, 1, true)
          ON CONFLICT (email) DO NOTHING
          RETURNING id
        `, [email, nome, nome, telefone, cpf]);
        
        if (result.rowCount > 0) {
          imported++;
          process.stdout.write(`\r   Importados: ${imported} | Ignorados: ${skipped}`);
        } else {
          skipped++;
        }
        
      } catch (err) {
        console.error(`\nErro ao importar corretor:`, err.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ ${imported} corretores importados\n`);
    return imported;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function importarLeadsExemplo() {
  console.log('📝 Criando leads de exemplo...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const leadsExemplo = [
      { nome: 'João Silva', telefone: '+5511999999991', email: 'joao@example.com' },
      { nome: 'Maria Santos', telefone: '+5511999999992', email: 'maria@example.com' },
      { nome: 'Pedro Oliveira', telefone: '+5511999999993', email: 'pedro@example.com' },
      { nome: 'Ana Costa', telefone: '+5511999999994', email: 'ana@example.com' },
      { nome: 'Carlos Lima', telefone: '+5511999999995', email: 'carlos@example.com' }
    ];
    
    let imported = 0;
    
    for (const lead of leadsExemplo) {
      try {
        await client.query(`
          INSERT INTO leads (
            name,
            phone,
            email,
            temperature,
            score
          )
          VALUES ($1, $2, $3, 'warm', 50)
        `, [lead.nome, lead.telefone, lead.email]);
        
        imported++;
      } catch (err) {
        console.error(`Erro ao criar lead ${lead.nome}:`, err.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ ${imported} leads de exemplo criados\n`);
    return imported;
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║      IMPORTAÇÃO DE DADOS - SISTEMA PRÁTICA              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    const totalEmpreendimentos = await importarEmpreendimentos();
    const totalCorretores = await importarCorretoresJSON();
    const totalLeads = await importarLeadsExemplo();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RESUMO DA IMPORTAÇÃO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Empreendimentos: ${totalEmpreendimentos}`);
    console.log(`Corretores: ${totalCorretores}`);
    console.log(`Leads: ${totalLeads}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ Importação concluída com sucesso!');
    
  } catch (err) {
    console.error('\n❌ Erro na importação:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
main();
