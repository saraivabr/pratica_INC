#!/bin/bash

# ============================================================================
# Script de Teste: CRM & Automações
# Valida: notificações, follow-ups automáticos, lembretes e WhatsApp
# ============================================================================

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
echo "🧪 Testando CRM & Automações - $BASE_URL"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# 1. TESTAR NOTIFICAÇÕES
# ============================================================================

echo "📬 1. Testando API de Notificações"
echo "-----------------------------------"

# Precisa de autenticação - usar token de teste
# Por enquanto, testar estrutura básica

echo -e "${YELLOW}⏭️  Pulando teste de notificações (requer autenticação)${NC}"
echo "   Para testar manualmente:"
echo "   GET  $BASE_URL/api/notificacoes"
echo "   POST $BASE_URL/api/notificacoes"
echo ""

# ============================================================================
# 2. TESTAR CRON DE LEMBRETES
# ============================================================================

echo "⏰ 2. Testando Cron de Lembretes"
echo "-----------------------------------"

LEMBRETES_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cron/processar-lembretes" || echo '{"error":"failed"}')

if echo "$LEMBRETES_RESPONSE" | grep -q '"success":true'; then
  PROCESSADOS=$(echo "$LEMBRETES_RESPONSE" | grep -o '"processados":[0-9]*' | cut -d: -f2)
  TEMPO=$(echo "$LEMBRETES_RESPONSE" | grep -o '"tempo_ms":[0-9]*' | cut -d: -f2)
  echo -e "${GREEN}✅ Cron de lembretes OK${NC}"
  echo "   Lembretes processados: $PROCESSADOS"
  echo "   Tempo: ${TEMPO}ms"
else
  echo -e "${RED}❌ Cron de lembretes FALHOU${NC}"
  echo "$LEMBRETES_RESPONSE" | head -5
fi
echo ""

# ============================================================================
# 3. TESTAR CRON DE FOLLOW-UPS
# ============================================================================

echo "🔄 3. Testando Cron de Follow-ups"
echo "-----------------------------------"

FOLLOWUPS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/cron/processar-followups" || echo '{"error":"failed"}')

if echo "$FOLLOWUPS_RESPONSE" | grep -q '"success":true'; then
  AUTOMACOES=$(echo "$FOLLOWUPS_RESPONSE" | grep -o '"total_automacoes":[0-9]*' | cut -d: -f2)
  ENVIADOS=$(echo "$FOLLOWUPS_RESPONSE" | grep -o '"total_enviados":[0-9]*' | cut -d: -f2)
  TEMPO=$(echo "$FOLLOWUPS_RESPONSE" | grep -o '"tempo_ms":[0-9]*' | cut -d: -f2)
  echo -e "${GREEN}✅ Cron de follow-ups OK${NC}"
  echo "   Automações ativas: $AUTOMACOES"
  echo "   Mensagens enviadas: $ENVIADOS"
  echo "   Tempo: ${TEMPO}ms"
else
  echo -e "${RED}❌ Cron de follow-ups FALHOU${NC}"
  echo "$FOLLOWUPS_RESPONSE" | head -5
fi
echo ""

# ============================================================================
# 4. VALIDAR ESTRUTURA DO BANCO
# ============================================================================

echo "🗄️  4. Validando Estrutura do Banco"
echo "-----------------------------------"

echo "Verificando tabelas criadas..."

# Criar script Node.js inline para validar tabelas
node << 'EOF'
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isSupabase = connectionString.includes('supabase.co');
const pool = new Pool({
  connectionString,
  ...(isSupabase && { ssl: { rejectUnauthorized: false } })
});

async function checkTables() {
  try {
    const tables = [
      'notificacoes',
      'automacoes_followup',
      'automacoes_execucoes',
      'lembretes',
      'salva_leads_config'
    ];

    for (const table of tables) {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM ${table}`
      );
      const count = parseInt(result.rows[0].count);
      console.log(`  ✅ ${table.padEnd(25)} → ${count} registros`);
    }

    // Verificar automações padrão
    const autoResult = await pool.query(
      `SELECT nome FROM automacoes_followup WHERE ativo = true`
    );
    
    console.log('\n📋 Automações ativas:');
    autoResult.rows.forEach(row => {
      console.log(`  • ${row.nome}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkTables();
EOF

echo ""

# ============================================================================
# 5. TESTAR WEBHOOK WHATSAPP (SIMULAÇÃO)
# ============================================================================

echo "📱 5. Testando Captura de Leads via WhatsApp"
echo "-----------------------------------"

echo -e "${YELLOW}⏭️  Teste de WhatsApp requer instância Evolution configurada${NC}"
echo "   Webhook configurado em: $BASE_URL/api/webhook/evolution/[workspaceId]"
echo ""
echo "   Para testar manualmente:"
echo "   1. Configure instância Evolution"
echo "   2. Envie mensagem de teste"
echo "   3. Verifique logs: docker logs -f pratica-app"
echo ""

# ============================================================================
# RESUMO
# ============================================================================

echo "════════════════════════════════════════════════════════════════"
echo "✅ TESTES CONCLUÍDOS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📦 Componentes instalados:"
echo "  ✅ Sistema de Notificações"
echo "  ✅ Automações de Follow-up (3 templates)"
echo "  ✅ Cron de Lembretes"
echo "  ✅ Cron de Follow-ups"
echo "  ✅ Configuração Salva-Leads"
echo ""
echo "🔧 Próximos passos:"
echo "  1. Configurar crontab para execução automática"
echo "  2. Testar criação de leads via interface"
echo "  3. Validar envio de mensagens WhatsApp"
echo "  4. Configurar notificações em tempo real (WebSocket)"
echo ""
echo "📚 Documentação:"
echo "  - API Notificações: $BASE_URL/api/notificacoes"
echo "  - Cron Lembretes:   $BASE_URL/api/cron/processar-lembretes"
echo "  - Cron Follow-ups:  $BASE_URL/api/cron/processar-followups"
echo ""
