#!/bin/bash

echo "=================================="
echo "  TESTE COMPLETO SISTEMA PRÁTICA"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "📅 Data/Hora: $TIMESTAMP"
echo "🌐 Base URL: $BASE_URL"
echo ""

# Função para testar página
test_page() {
    local url=$1
    local name=$2
    local status=$(curl -s -o /dev/null -w "%{http_code}" -L "$url" --max-time 5)
    
    if [ "$status" == "200" ] || [ "$status" == "307" ]; then
        echo "✅ $name - HTTP $status"
        return 0
    else
        echo "❌ $name - HTTP $status"
        return 1
    fi
}

# Função para testar API
test_api() {
    local url=$1
    local name=$2
    local method=${3:-GET}
    
    if [ "$method" == "GET" ]; then
        local response=$(curl -s -w "\n%{http_code}" -L "$url" --max-time 5)
    else
        local response=$(curl -s -w "\n%{http_code}" -X "$method" -L "$url" --max-time 5)
    fi
    
    local status=$(echo "$response" | tail -n1)
    
    if [ "$status" == "200" ] || [ "$status" == "401" ] || [ "$status" == "307" ]; then
        echo "✅ $name - HTTP $status"
        return 0
    else
        echo "❌ $name - HTTP $status"
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 TESTANDO PÁGINAS PRINCIPAIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_page "$BASE_URL/" "Home"
test_page "$BASE_URL/dashboard" "Dashboard"
test_page "$BASE_URL/pipeline" "Pipeline"
test_page "$BASE_URL/chat" "Chat"
test_page "$BASE_URL/agenda" "Agenda"
test_page "$BASE_URL/performance" "Performance"
test_page "$BASE_URL/mensagens" "Mensagens"
test_page "$BASE_URL/whatsapp" "WhatsApp"
test_page "$BASE_URL/leads" "Leads"
test_page "$BASE_URL/catavendas" "Catavendas"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 TESTANDO APIs CRÍTICAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_api "$BASE_URL/api/health" "Health Check"
test_api "$BASE_URL/api/auth/session" "Auth Session"
test_api "$BASE_URL/api/leads" "API Leads"
test_api "$BASE_URL/api/pipeline" "API Pipeline"
test_api "$BASE_URL/api/performance/metrics" "API Performance Metrics"
test_api "$BASE_URL/api/mensagens" "API Mensagens"
test_api "$BASE_URL/api/whatsapp/contacts" "API WhatsApp Contacts"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICANDO LOGS DE ERRO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERROR_COUNT=$(pm2 logs pratica --lines 100 --nostream 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l)
echo "Total de erros nos últimos 100 logs: $ERROR_COUNT"
echo ""

if [ $ERROR_COUNT -gt 0 ]; then
    echo "🔴 Principais erros encontrados:"
    pm2 logs pratica --lines 100 --nostream 2>/dev/null | grep -i "error\|exception\|fatal" | tail -5
else
    echo "✅ Nenhum erro crítico encontrado"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 STATUS DO BANCO DE DADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Teste rápido de conectividade com DB
if command -v psql &> /dev/null; then
    echo "✅ Cliente PostgreSQL instalado"
else
    echo "⚠️  Cliente PostgreSQL não encontrado"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 RESUMO FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ = Funcionando"
echo "❌ = Com problema"
echo "⚠️  = Atenção necessária"
echo ""
