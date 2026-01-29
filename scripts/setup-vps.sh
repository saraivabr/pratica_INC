#!/bin/bash
set -e

echo "🚀 Configurando servidor VPS para Prátic

a..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq

# Instalar dependências básicas
echo "📦 Instalando dependências básicas..."
apt-get install -y curl wget git build-essential

# Instalar Node.js 22.x via NodeSource
echo "📦 Instalando Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Instalar pnpm via npm
echo "📦 Instalando pnpm..."
npm install -g pnpm

# Instalar PostgreSQL 16
echo "📦 Instalando PostgreSQL 16..."
apt-get install -y postgresql postgresql-contrib

# Instalar Nginx
echo "📦 Instalando Nginx..."
apt-get install -y nginx

# Instalar PM2 para gerenciar processos Node.js
echo "📦 Instalando PM2..."
npm install -g pm2

# Verificar instalações
echo ""
echo "✅ Versões instaladas:"
node --version
npm --version
pnpm --version
psql --version
nginx -v
pm2 --version

echo ""
echo "✅ Setup básico concluído!"
