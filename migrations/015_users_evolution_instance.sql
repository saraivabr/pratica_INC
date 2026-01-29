-- Migration: Adicionar campos de instância Evolution por corretor
-- Permite que cada corretor tenha sua própria conexão WhatsApp

ALTER TABLE users ADD COLUMN IF NOT EXISTS evolution_instance_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS evolution_connected BOOLEAN DEFAULT FALSE;

-- Índice para buscar corretores com WhatsApp conectado
CREATE INDEX IF NOT EXISTS idx_users_evolution_connected
ON users (evolution_connected)
WHERE evolution_connected = true;

COMMENT ON COLUMN users.evolution_instance_name IS 'Nome da instância Evolution API do corretor';
COMMENT ON COLUMN users.evolution_connected IS 'Se o WhatsApp do corretor está conectado';
