#!/bin/bash

# ============================================
# CV CRM Sync Setup Script
# Prepares database and validates infrastructure
# ============================================

set -e  # Exit on error

echo "🚀 CV CRM Sync Setup"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ Error: .env file not found${NC}"
  echo "Please create a .env file with required CV CRM tokens"
  exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check database connection
echo ""
echo "📊 Checking database connection..."
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL not set in .env${NC}"
  exit 1
fi

# Try to connect to database
psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Database connection successful${NC}"
else
  echo -e "${RED}❌ Cannot connect to database${NC}"
  echo "Please check your DATABASE_URL"
  exit 1
fi

# Check if migrations need to run
echo ""
echo "🗄️  Checking database schema..."

# Check if sync_logs table exists
TABLE_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sync_logs');")

if [ "$TABLE_EXISTS" = "t" ]; then
  echo -e "${YELLOW}⚠️  Sync tables already exist${NC}"
  read -p "Do you want to re-run migrations? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping migrations..."
  else
    echo "Running migrations..."
    psql "$DATABASE_URL" < migrations/002_cvcrm_sync_complete.sql
    echo -e "${GREEN}✅ Migrations completed${NC}"
  fi
else
  echo "Running migrations for the first time..."
  psql "$DATABASE_URL" < migrations/002_cvcrm_sync_complete.sql
  echo -e "${GREEN}✅ Migrations completed${NC}"
fi

# Count created tables
TABLE_COUNT=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'cvcrm_%' OR table_name IN ('sync_logs', 'sync_cursors');")

echo ""
echo "📋 Database Stats:"
echo "   - CV CRM tables: $TABLE_COUNT"

# Check required environment variables
echo ""
echo "🔑 Checking CV CRM tokens..."

REQUIRED_TOKENS=(
  "CVCRM_BASE_URL"
  "CVCRM_EMAIL"
  "CVCRM_TOKEN_LEAD"
  "CVCRM_TOKEN_PESSOA"
  "CVCRM_TOKEN_RESERVA"
  "CVCRM_TOKEN_ATENDIMENTO"
  "CVCRM_TOKEN_ASSISTENCIA"
  "CVCRM_TOKEN_COMISSAO"
  "CVCRM_TOKEN_CORRETOR"
  "CVCRM_TOKEN_IMOBILIARIA"
  "CVCRM_TOKEN_EMPREENDIMENTO"
)

MISSING_TOKENS=0
for TOKEN in "${REQUIRED_TOKENS[@]}"; do
  if [ -z "${!TOKEN}" ]; then
    echo -e "${RED}   ❌ Missing: $TOKEN${NC}"
    MISSING_TOKENS=$((MISSING_TOKENS + 1))
  else
    echo -e "${GREEN}   ✅ Found: $TOKEN${NC}"
  fi
done

if [ $MISSING_TOKENS -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Warning: $MISSING_TOKENS tokens are missing${NC}"
  echo "Some sync agents will not work without their tokens"
else
  echo ""
  echo -e "${GREEN}✅ All required tokens configured${NC}"
fi

# Check if TypeScript files compile
echo ""
echo "📝 Checking TypeScript compilation..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
  echo -e "${RED}❌ TypeScript compilation failed${NC}"
  echo "Run 'npm run build' to see errors"
  exit 1
fi

# Summary
echo ""
echo "============================================"
echo "✨ Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Implement sync agents in lib/sync/agents/"
echo "  2. Test individual agents"
echo "  3. Run full sync"
echo ""
echo "To test the leads-core agent:"
echo "  node -e \"require('./lib/sync/agents/01-leads-core').leadsCoreAgent.sync(true)\""
echo ""
echo "To view sync logs:"
echo "  psql \$DATABASE_URL -c 'SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10;'"
echo ""
echo "For more info, see:"
echo "  - CVCRM_INTEGRATION_STATUS.md"
echo "  - lib/sync/agents/README.md"
echo ""
