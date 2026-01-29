#!/bin/bash

# =============================================================================
# Script: copiar-dados-scalingo.sh
# Descrição: Copia dados do Scalingo para o servidor atual
# Data: 28 Jan 2026
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# URLs
SCALINGO_URL="https://pratica.osc-fr1.scalingo.io"
LOCAL_URL="http://localhost:3000"

echo -e "${BOLD}${MAGENTA}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     COPIAR DADOS DO SCALINGO PARA SERVIDOR ATUAL         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}Origem:${NC} $SCALINGO_URL"
echo -e "${CYAN}Destino:${NC} Banco local (VPS)"
echo ""

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL não configurado!${NC}"
  exit 1
fi

# Extrair credenciais
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p' | cut -d'?' -f1)
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\(.*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p')

export PGPASSWORD="$DB_PASS"

echo -e "${YELLOW}1. Verificando conexão com Scalingo...${NC}"
HEALTH=$(curl -s "$SCALINGO_URL/api/health")
if echo "$HEALTH" | grep -q "healthy"; then
  echo -e "${GREEN}✅ Scalingo online e saudável${NC}"
else
  echo -e "${RED}❌ Scalingo não está acessível${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}2. Baixando dados do Scalingo...${NC}"

# Baixar empreendimentos
echo -n "   Empreendimentos... "
curl -s "$SCALINGO_URL/api/empreendimentos" > /tmp/scalingo_empreendimentos.json
TOTAL_EMP=$(cat /tmp/scalingo_empreendimentos.json | jq '.data | length' 2>/dev/null || echo "0")
echo -e "${GREEN}$TOTAL_EMP encontrados${NC}"

# Baixar corretores (se houver endpoint)
echo -n "   Corretores... "
curl -s "$SCALINGO_URL/api/corretores" > /tmp/scalingo_corretores.json 2>/dev/null || echo "[]" > /tmp/scalingo_corretores.json
TOTAL_CORR=$(cat /tmp/scalingo_corretores.json | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo "0")
echo -e "${GREEN}$TOTAL_CORR encontrados${NC}"

# Baixar leads (se houver endpoint)
echo -n "   Leads... "
curl -s "$SCALINGO_URL/api/leads" > /tmp/scalingo_leads.json 2>/dev/null || echo "[]" > /tmp/scalingo_leads.json
TOTAL_LEADS=$(cat /tmp/scalingo_leads.json | jq 'if type == "array" then length else if .data then (.data | length) else 0 end end' 2>/dev/null || echo "0")
echo -e "${GREEN}$TOTAL_LEADS encontrados${NC}"

echo ""
echo -e "${YELLOW}3. Importando para o banco local...${NC}"

# Criar script Node.js para importar
cat > /tmp/importar_scalingo.js << 'ENDOFSCRIPT'
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importar() {
  console.log('📊 Iniciando importação...\n');
  
  const client = await pool.connect();
  
  try {
    // Empreendimentos
    console.log('🏢 Importando empreendimentos...');
    const empreendimentos = JSON.parse(fs.readFileSync('/tmp/scalingo_empreendimentos.json', 'utf8'));
    
    if (empreendimentos.success && empreendimentos.data) {
      await client.query('BEGIN');
      
      let imported = 0;
      for (const emp of empreendimentos.data) {
        try {
          await client.query(`
            INSERT INTO cvcrm_empreendimentos (
              cvcrm_id, 
              nome, 
              endereco_completo, 
              cidade, 
              uf, 
              status,
              descricao,
              cvcrm_data
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (cvcrm_id) DO UPDATE
            SET nome = EXCLUDED.nome,
                endereco_completo = EXCLUDED.endereco_completo,
                descricao = EXCLUDED.descricao,
                cvcrm_data = EXCLUDED.cvcrm_data
          `, [
            emp.id || Math.floor(Math.random() * 1000000),
            emp.nome || emp.name,
            emp.endereco || emp.bairro || '',
            emp.cidade || 'São Paulo',
            emp.uf || 'SP',
            emp.status || 'ativo',
            emp.descricao || '',
            JSON.stringify(emp)
          ]);
          imported++;
        } catch (err) {
          console.error(`Erro ao importar ${emp.nome}:`, err.message);
        }
      }
      
      await client.query('COMMIT');
      console.log(`✅ ${imported} empreendimentos importados\n`);
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importar();
ENDOFSCRIPT

# Executar importação
node /tmp/importar_scalingo.js

echo ""
echo -e "${GREEN}${BOLD}✅ Importação concluída!${NC}"
echo ""
echo -e "${CYAN}Resumo:${NC}"
echo "  • Empreendimentos do Scalingo: $TOTAL_EMP"
echo "  • Corretores do Scalingo: $TOTAL_CORR"
echo "  • Leads do Scalingo: $TOTAL_LEADS"
echo ""

# Limpar arquivos temporários
rm -f /tmp/scalingo_*.json /tmp/importar_scalingo.js

echo -e "${YELLOW}Verifique os dados importados:${NC}"
echo "  PGPASSWORD='$DB_PASS' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c 'SELECT COUNT(*) FROM cvcrm_empreendimentos;'"
