-- Migration 013: Corrigir relacoes tenant/imobiliarias/users
-- Data: 2026-01-27
-- Problema: findUserTenant falha porque imobiliarias nao tem tenant_id

-- ============================================================================
-- 1. ADICIONAR tenant_id NA TABELA imobiliarias
-- ============================================================================

ALTER TABLE imobiliarias
ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_imobiliarias_tenant
ON imobiliarias(tenant_id) WHERE tenant_id IS NOT NULL;

COMMENT ON COLUMN imobiliarias.tenant_id IS 'Referencia ao tenant (empresa) no sistema multi-tenant';

-- ============================================================================
-- 2. ADICIONAR tenant_id NA TABELA users (acesso direto)
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant
ON users(tenant_id) WHERE tenant_id IS NOT NULL;

COMMENT ON COLUMN users.tenant_id IS 'Referencia direta ao tenant do usuario (cache para performance)';

-- ============================================================================
-- 3. CRIAR TENANTS PARA IMOBILIARIAS EXISTENTES
-- ============================================================================

-- Criar tenant para cada imobiliaria que ainda nao tem
INSERT INTO tenants (slug, name, cvcrm_config, plan, status)
SELECT
    'imob-' || REPLACE(i.id::TEXT, '-', '') as slug,
    COALESCE(i.nome, 'Imobiliaria ' || i.id::TEXT) as name,
    '{}'::jsonb as cvcrm_config,
    'free' as plan,
    'active' as status
FROM imobiliarias i
WHERE i.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.slug = 'imob-' || REPLACE(i.id::TEXT, '-', '')
  );

-- Vincular imobiliarias aos tenants recem criados
UPDATE imobiliarias i
SET tenant_id = t.id
FROM tenants t
WHERE t.slug = 'imob-' || REPLACE(i.id::TEXT, '-', '')
  AND i.tenant_id IS NULL;

-- ============================================================================
-- 4. PROPAGAR tenant_id PARA USERS
-- ============================================================================

-- Atualizar users com tenant_id baseado na sua imobiliaria
UPDATE users u
SET tenant_id = i.tenant_id
FROM imobiliarias i
WHERE u.imobiliaria_id = i.id
  AND u.tenant_id IS NULL
  AND i.tenant_id IS NOT NULL;

-- ============================================================================
-- 5. LOG DE VERIFICACAO
-- ============================================================================

DO $$
DECLARE
    imob_count INTEGER;
    user_count INTEGER;
    tenant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO imob_count FROM imobiliarias WHERE tenant_id IS NOT NULL;
    SELECT COUNT(*) INTO user_count FROM users WHERE tenant_id IS NOT NULL;
    SELECT COUNT(*) INTO tenant_count FROM tenants;

    RAISE NOTICE 'Migration 013 concluida:';
    RAISE NOTICE '  - Imobiliarias com tenant: %', imob_count;
    RAISE NOTICE '  - Users com tenant: %', user_count;
    RAISE NOTICE '  - Total de tenants: %', tenant_count;
END $$;
