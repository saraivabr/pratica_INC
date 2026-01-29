#!/usr/bin/env node

/**
 * Script: importar-corretores-excel.js
 * Descrição: Importa corretores do Excel para o banco
 * Data: 28 Jan 2026
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importarCorretores() {
  console.log('📊 Importando corretores do Excel...\n');
  
  const excelPath = path.join(__dirname, '..', 'corretores_gravura.xlsx');
  
  try {
    // Ler Excel
    console.log(`📂 Lendo arquivo: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`✅ Encontrados ${data.length} corretores\n`);
    
    // Conectar ao banco
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let imported = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const row of data) {
        try {
          // Adaptar campos do Excel para o banco
          const email = row.email || row.Email || `corretor${row.id || Date.now()}@pratica.digital`;
          const nome = row.nome || row.Nome || row.name || 'Corretor';
          const telefone = row.telefone || row.Telefone || row.phone || null;
          const cpf = row.cpf || row.CPF || null;
          
          // Inserir corretor como user
          await client.query(`
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
          
          imported++;
          process.stdout.write(`\r   Importados: ${imported} | Ignorados: ${skipped} | Erros: ${errors}`);
          
        } catch (err) {
          if (err.code === '23505') {
            // Duplicado
            skipped++;
          } else {
            errors++;
            console.error(`\n   ❌ Erro na linha:`, row, err.message);
          }
        }
      }
      
      await client.query('COMMIT');
      
      console.log('\n\n✅ Importação concluída!');
      console.log(`   Importados: ${imported}`);
      console.log(`   Ignorados: ${skipped}`);
      console.log(`   Erros: ${errors}`);
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('\n❌ Erro na importação:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
importarCorretores();
