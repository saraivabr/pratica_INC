-- ============================================
-- MIGRAÇÃO 014: Sistema de Hierarquias e Features
-- ============================================

-- ============================================
-- Tabela: hierarquias (níveis hierárquicos)
-- ============================================
CREATE TABLE IF NOT EXISTS hierarquias (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  nivel INTEGER NOT NULL, -- menor = mais poder (1=master, 6=assistente)
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por slug
CREATE INDEX IF NOT EXISTS idx_hierarquias_slug ON hierarquias(slug);
CREATE INDEX IF NOT EXISTS idx_hierarquias_nivel ON hierarquias(nivel);

-- Inserir hierarquias padrão
INSERT INTO hierarquias (slug, nome, nivel, descricao) VALUES
  ('master', 'Master', 1, 'Controle total do sistema, incluindo configuração de features e hierarquias'),
  ('diretor', 'Diretor', 2, 'Acesso total à imobiliária, gerencia todos os níveis abaixo'),
  ('gerente', 'Gerente', 3, 'Gerencia equipe de parcerias e corretores, acesso a relatórios'),
  ('parcerias', 'Parcerias', 4, 'Disparador de eventos e visualização de corretores'),
  ('corretor', 'Corretor', 5, 'Acesso a leads, imóveis, WhatsApp e perfil próprio'),
  ('assistente', 'Assistente', 6, 'Apenas visualização, sem permissão de criar ou editar')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Tabela: features (funcionalidades do sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS features (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  rota_base VARCHAR(100), -- rota principal da feature (ex: /admin/eventos)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por slug
CREATE INDEX IF NOT EXISTS idx_features_slug ON features(slug);
CREATE INDEX IF NOT EXISTS idx_features_active ON features(is_active);

-- Inserir features do sistema
INSERT INTO features (slug, nome, descricao, icone, rota_base) VALUES
  ('admin_panel', 'Painel Admin', 'Acesso ao painel administrativo e configurações gerais', 'Settings', '/admin'),
  ('disparador_eventos', 'Disparador de Eventos', 'Criação e gerenciamento de eventos com convites via WhatsApp', 'Calendar', '/admin/eventos'),
  ('academia', 'Academia', 'Módulo de treinamentos e capacitação', 'GraduationCap', '/admin/academia'),
  ('salva_leads', 'Salva Leads', 'Recuperação e salvamento de leads', 'UserPlus', '/admin/salva-leads'),
  ('cvcrm_sync', 'Sync CV CRM', 'Sincronização com o CV CRM', 'RefreshCw', '/admin/sync'),
  ('whatsapp', 'WhatsApp', 'Acesso a mensagens e conversas WhatsApp', 'MessageCircle', '/whatsapp'),
  ('leads', 'Leads', 'Gestão de leads e oportunidades', 'Users', '/leads'),
  ('imoveis', 'Imóveis', 'Catálogo de imóveis e empreendimentos', 'Home', '/imoveis'),
  ('relatorios', 'Relatórios', 'Visualização de relatórios e analytics', 'BarChart', '/relatorios'),
  ('usuarios', 'Gestão de Usuários', 'Gerenciamento de usuários da plataforma', 'UserCog', '/admin/usuarios'),
  ('permissoes', 'Permissões', 'Configuração de hierarquias e permissões', 'Shield', '/admin/permissoes')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Tabela: hierarquia_features (permissões padrão por nível)
-- ============================================
CREATE TABLE IF NOT EXISTS hierarquia_features (
  hierarquia_id INTEGER NOT NULL REFERENCES hierarquias(id) ON DELETE CASCADE,
  feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  PRIMARY KEY (hierarquia_id, feature_id)
);

-- Índices para consultas
CREATE INDEX IF NOT EXISTS idx_hierarquia_features_hierarquia ON hierarquia_features(hierarquia_id);
CREATE INDEX IF NOT EXISTS idx_hierarquia_features_feature ON hierarquia_features(feature_id);

-- Configurar permissões padrão por nível
-- Master: todas as features
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, true
FROM hierarquias h, features f
WHERE h.slug = 'master';

-- Diretor: todas exceto permissoes (só master)
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, CASE WHEN f.slug = 'permissoes' THEN false ELSE true END
FROM hierarquias h, features f
WHERE h.slug = 'diretor';

-- Gerente: admin_panel, eventos, academia, salva_leads, whatsapp, leads, imoveis, relatorios, usuarios
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, CASE
  WHEN f.slug IN ('admin_panel', 'disparador_eventos', 'academia', 'salva_leads', 'whatsapp', 'leads', 'imoveis', 'relatorios', 'usuarios') THEN true
  ELSE false
END
FROM hierarquias h, features f
WHERE h.slug = 'gerente';

-- Parcerias: eventos, whatsapp, leads, imoveis
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, CASE
  WHEN f.slug IN ('disparador_eventos', 'whatsapp', 'leads', 'imoveis') THEN true
  ELSE false
END
FROM hierarquias h, features f
WHERE h.slug = 'parcerias';

-- Corretor: academia, whatsapp, leads, imoveis
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, CASE
  WHEN f.slug IN ('academia', 'whatsapp', 'leads', 'imoveis') THEN true
  ELSE false
END
FROM hierarquias h, features f
WHERE h.slug = 'corretor';

-- Assistente: apenas visualização (leads, imoveis)
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, CASE
  WHEN f.slug IN ('leads', 'imoveis') THEN true
  ELSE false
END
FROM hierarquias h, features f
WHERE h.slug = 'assistente';

-- ============================================
-- Tabela: user_features (override individual por usuário)
-- ============================================
CREATE TABLE IF NOT EXISTS user_features (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, feature_id)
);

-- Índices para consultas
CREATE INDEX IF NOT EXISTS idx_user_features_user ON user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_features_feature ON user_features(feature_id);

-- ============================================
-- Adicionar coluna hierarquia_id na tabela users
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS hierarquia_id INTEGER REFERENCES hierarquias(id) ON DELETE SET NULL;

-- Índice para busca por hierarquia
CREATE INDEX IF NOT EXISTS idx_users_hierarquia ON users(hierarquia_id);

-- ============================================
-- Migrar usuários existentes: role -> hierarquia_id
-- ============================================

-- Primeiro, definir o usuário master (11991143605)
UPDATE users
SET hierarquia_id = (SELECT id FROM hierarquias WHERE slug = 'master')
WHERE telefone LIKE '%11991143605';

-- Migrar admins para diretor (exceto o master já definido)
UPDATE users
SET hierarquia_id = (SELECT id FROM hierarquias WHERE slug = 'diretor')
WHERE role = 'admin' AND hierarquia_id IS NULL;

-- Migrar gerentes
UPDATE users
SET hierarquia_id = (SELECT id FROM hierarquias WHERE slug = 'gerente')
WHERE role = 'gerente' AND hierarquia_id IS NULL;

-- Migrar corretores
UPDATE users
SET hierarquia_id = (SELECT id FROM hierarquias WHERE slug = 'corretor')
WHERE role = 'corretor' AND hierarquia_id IS NULL;

-- Definir corretor como padrão para usuários sem role definido
UPDATE users
SET hierarquia_id = (SELECT id FROM hierarquias WHERE slug = 'corretor')
WHERE hierarquia_id IS NULL;

-- ============================================
-- View para facilitar consultas de permissões
-- ============================================
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT
  u.id AS user_id,
  u.telefone,
  u.nome AS user_nome,
  h.id AS hierarquia_id,
  h.slug AS hierarquia_slug,
  h.nome AS hierarquia_nome,
  h.nivel AS hierarquia_nivel,
  f.id AS feature_id,
  f.slug AS feature_slug,
  f.nome AS feature_nome,
  f.rota_base,
  COALESCE(uf.enabled, hf.enabled, false) AS enabled,
  CASE WHEN uf.enabled IS NOT NULL THEN true ELSE false END AS is_override
FROM users u
JOIN hierarquias h ON h.id = u.hierarquia_id
CROSS JOIN features f
LEFT JOIN hierarquia_features hf ON hf.hierarquia_id = h.id AND hf.feature_id = f.id
LEFT JOIN user_features uf ON uf.user_id = u.id AND uf.feature_id = f.id
WHERE f.is_active = true;

-- ============================================
-- Função para verificar acesso a feature
-- ============================================
CREATE OR REPLACE FUNCTION check_feature_access(p_user_id UUID, p_feature_slug VARCHAR)
RETURNS TABLE (
  allowed BOOLEAN,
  is_override BOOLEAN,
  hierarquia_nome VARCHAR,
  feature_nome VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vp.enabled AS allowed,
    vp.is_override,
    vp.hierarquia_nome::VARCHAR,
    vp.feature_nome::VARCHAR
  FROM v_user_permissions vp
  WHERE vp.user_id = p_user_id
    AND vp.feature_slug = p_feature_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Função para listar features de um usuário
-- ============================================
CREATE OR REPLACE FUNCTION get_user_features(p_user_id UUID)
RETURNS TABLE (
  feature_slug VARCHAR,
  feature_nome VARCHAR,
  feature_icone VARCHAR,
  rota_base VARCHAR,
  enabled BOOLEAN,
  is_override BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.slug::VARCHAR AS feature_slug,
    f.nome::VARCHAR AS feature_nome,
    f.icone::VARCHAR AS feature_icone,
    f.rota_base::VARCHAR,
    COALESCE(uf.enabled, hf.enabled, false) AS enabled,
    CASE WHEN uf.enabled IS NOT NULL THEN true ELSE false END AS is_override
  FROM users u
  JOIN hierarquias h ON h.id = u.hierarquia_id
  CROSS JOIN features f
  LEFT JOIN hierarquia_features hf ON hf.hierarquia_id = h.id AND hf.feature_id = f.id
  LEFT JOIN user_features uf ON uf.user_id = p_user_id AND uf.feature_id = f.id
  WHERE u.id = p_user_id
    AND f.is_active = true
  ORDER BY f.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comentários nas tabelas
-- ============================================
COMMENT ON TABLE hierarquias IS 'Níveis hierárquicos do sistema (master > diretor > gerente > parcerias > corretor > assistente)';
COMMENT ON TABLE features IS 'Funcionalidades/módulos do sistema que podem ser habilitados ou desabilitados';
COMMENT ON TABLE hierarquia_features IS 'Permissões padrão de cada feature por nível hierárquico';
COMMENT ON TABLE user_features IS 'Override individual de permissões por usuário (sobrescreve o padrão do nível)';
COMMENT ON COLUMN users.hierarquia_id IS 'Nível hierárquico do usuário (FK para hierarquias)';
