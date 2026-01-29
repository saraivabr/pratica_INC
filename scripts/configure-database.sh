#!/bin/bash
set -e

echo "🔐 Configurando PostgreSQL..."

# Criar usuário e banco de dados
sudo -u postgres psql <<EOF
-- Criar usuário pratica
CREATE USER pratica WITH PASSWORD 'pratica_secure_2026!';

-- Criar banco de dados
CREATE DATABASE pratica OWNER pratica;

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE pratica TO pratica;

-- Conectar ao banco e conceder privilégios no schema
\c pratica
GRANT ALL ON SCHEMA public TO pratica;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pratica;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pratica;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pratica;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pratica;

-- Instalar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\q
EOF

echo "✅ Banco de dados configurado!"
echo ""
echo "Detalhes da conexão:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: pratica"
echo "  User: pratica"
echo "  Password: pratica_secure_2026!"
