-- Migration 025: Roles e Permissões - Suporte a Gerente
-- Fase 1 do sistema de hierarquia

-- 1. Verificar/criar índices (IF NOT EXISTS garante idempotência)
CREATE INDEX IF NOT EXISTS idx_users_gerente ON users(gerente_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_leads_corretor ON leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_leads_corretor_workspace ON leads(corretor_id, workspace_id);

-- 2. Índice composto para query de gerente (buscar leads dos corretores do gerente)
CREATE INDEX IF NOT EXISTS idx_users_gerente_role ON users(gerente_id, role) WHERE gerente_id IS NOT NULL;

-- 3. Garantir que role 'gerente' é válido (sem constraint formal - varchar livre)
-- Apenas documentação: roles válidos são 'admin', 'gerente', 'corretor'

-- 4. Comentários para documentação
COMMENT ON COLUMN users.role IS 'Role do usuário: admin, gerente, corretor';
COMMENT ON COLUMN users.gerente_id IS 'ID do gerente responsável (para corretores)';
COMMENT ON COLUMN leads.corretor_id IS 'ID do corretor responsável pelo lead (UUID -> users.id)';

SELECT 'Migration 025 applied successfully' as status;
