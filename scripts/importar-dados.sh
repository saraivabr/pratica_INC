#!/bin/bash

# =============================================================================
# Script: importar-dados.sh
# Descrição: Menu interativo para importação de dados
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

# Banner
clear
echo -e "${BOLD}${MAGENTA}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           IMPORTAÇÃO DE DADOS - SISTEMA PRÁTICA          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

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

echo -e "${CYAN}Banco de dados:${NC} $DB_NAME @ $DB_HOST:$DB_PORT"
echo ""

# Menu
echo -e "${BOLD}Escolha o tipo de importação:${NC}"
echo ""
echo "  1) CV CRM (Sincronizar via API)"
echo "  2) Backup SQL (restaurar de arquivo .sql)"
echo "  3) CSV/Excel (importar planilhas)"
echo "  4) Dados de Demonstração (popular com exemplos)"
echo "  5) Migração de outro banco"
echo "  6) Sair"
echo ""
echo -n "Opção: "
read opcao

case $opcao in
  1)
    echo ""
    echo -e "${YELLOW}Importação CV CRM${NC}"
    echo "Verificando variáveis de ambiente..."
    
    if [ -z "$CVCRM_BASE_URL" ] || [ -z "$CVCRM_API_KEY" ]; then
      echo -e "${RED}❌ Variáveis CV CRM não configuradas!${NC}"
      echo "Configure CVCRM_BASE_URL e CVCRM_API_KEY no .env.production"
      exit 1
    fi
    
    echo -e "${GREEN}✅ CV CRM configurado${NC}"
    echo ""
    echo "O que deseja sincronizar?"
    echo "  1) Empreendimentos"
    echo "  2) Corretores"
    echo "  3) Leads"
    echo "  4) Tudo"
    echo -n "Opção: "
    read sync_option
    
    case $sync_option in
      1)
        echo "Sincronizando empreendimentos..."
        curl -X POST http://localhost:3000/api/cvcrm/sync/empreendimentos
        ;;
      2)
        echo "Sincronizando corretores..."
        curl -X POST http://localhost:3000/api/cvcrm/sync/corretores
        ;;
      3)
        echo "Sincronizando leads..."
        curl -X POST http://localhost:3000/api/cvcrm/sync/leads
        ;;
      4)
        echo "Sincronizando tudo..."
        curl -X POST http://localhost:3000/api/cvcrm/sync/all
        ;;
    esac
    ;;
    
  2)
    echo ""
    echo -e "${YELLOW}Restaurar Backup SQL${NC}"
    echo -n "Caminho do arquivo .sql: "
    read sql_file
    
    if [ ! -f "$sql_file" ]; then
      echo -e "${RED}❌ Arquivo não encontrado: $sql_file${NC}"
      exit 1
    fi
    
    echo "Restaurando backup..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"
    echo -e "${GREEN}✅ Backup restaurado com sucesso!${NC}"
    ;;
    
  3)
    echo ""
    echo -e "${YELLOW}Importar CSV/Excel${NC}"
    echo "Qual tabela deseja importar?"
    echo -n "Nome da tabela: "
    read table_name
    
    echo -n "Caminho do arquivo CSV: "
    read csv_file
    
    if [ ! -f "$csv_file" ]; then
      echo -e "${RED}❌ Arquivo não encontrado: $csv_file${NC}"
      exit 1
    fi
    
    echo "Importando para $table_name..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\COPY $table_name FROM '$csv_file' WITH (FORMAT csv, HEADER true);"
    echo -e "${GREEN}✅ CSV importado com sucesso!${NC}"
    ;;
    
  4)
    echo ""
    echo -e "${YELLOW}Criando dados de demonstração...${NC}"
    
    # Criar usuários de exemplo
    echo "Criando usuários..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Usuários de exemplo
INSERT INTO users (email, name, role, tenant_id, workspace_id, password_hash, is_active)
VALUES 
  ('corretor1@pratica.digital', 'João Silva', 'corretor', 1, 1, '$2b$10$example', true),
  ('corretor2@pratica.digital', 'Maria Santos', 'corretor', 1, 1, '$2b$10$example', true),
  ('gerente@pratica.digital', 'Carlos Gerente', 'gerente', 1, 1, '$2b$10$example', true)
ON CONFLICT (email) DO NOTHING;
EOF
    
    echo -e "${GREEN}✅ Dados de demonstração criados!${NC}"
    ;;
    
  5)
    echo ""
    echo -e "${YELLOW}Migração de outro banco${NC}"
    echo -n "Host do banco origem: "
    read src_host
    echo -n "Porta: "
    read src_port
    echo -n "Database: "
    read src_db
    echo -n "Usuário: "
    read src_user
    echo -n "Senha: "
    read -s src_pass
    echo ""
    
    echo "Criando dump..."
    PGPASSWORD="$src_pass" pg_dump -h "$src_host" -p "$src_port" -U "$src_user" "$src_db" > /tmp/migration.sql
    
    echo "Importando para banco atual..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/migration.sql
    
    echo "Limpando arquivo temporário..."
    rm /tmp/migration.sql
    
    echo -e "${GREEN}✅ Migração concluída!${NC}"
    ;;
    
  6)
    echo "Saindo..."
    exit 0
    ;;
    
  *)
    echo -e "${RED}Opção inválida!${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}${BOLD}✅ Importação concluída!${NC}"
