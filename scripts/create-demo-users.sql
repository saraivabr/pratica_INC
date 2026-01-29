-- ============================================
-- Script para Criar 3 Usuários Demo
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- Data: 17 de Janeiro de 2026
-- ============================================

-- Certifique-se que a imobiliária padrão existe
INSERT INTO imobiliarias (id, nome, cnpj, telefone, email, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Pratica Incorporadora', '12.345.678/0001-90', '(11) 98765-4321', 'contato@pratica.com.br', true)
ON CONFLICT (id) DO UPDATE 
  SET nome = EXCLUDED.nome,
      cnpj = EXCLUDED.cnpj,
      telefone = EXCLUDED.telefone,
      email = EXCLUDED.email;

-- ============================================
-- USUÁRIO DEMO 1: Administrador
-- Layout: Emerald/Green Theme (padrão)
-- ============================================
INSERT INTO users (
  id,
  telefone,
  nome,
  role,
  imobiliaria_id,
  gerente_id,
  avatar_url,
  is_active,
  onboarding_status,
  created_at,
  updated_at,
  last_login
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '5511999990001',
  'Admin Demo',
  'admin',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AdminDemo',
  true,
  'completed',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (telefone) DO UPDATE
  SET nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      imobiliaria_id = EXCLUDED.imobiliaria_id,
      avatar_url = EXCLUDED.avatar_url,
      is_active = EXCLUDED.is_active,
      onboarding_status = EXCLUDED.onboarding_status,
      updated_at = NOW();

-- ============================================
-- USUÁRIO DEMO 2: Gerente
-- Layout: Blue/Cyan Theme
-- ============================================
INSERT INTO users (
  id,
  telefone,
  nome,
  role,
  imobiliaria_id,
  gerente_id,
  avatar_url,
  is_active,
  onboarding_status,
  created_at,
  updated_at,
  last_login
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '5511999990002',
  'Gerente Demo',
  'gerente',
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=GerenteDemo',
  true,
  'completed',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (telefone) DO UPDATE
  SET nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      imobiliaria_id = EXCLUDED.imobiliaria_id,
      avatar_url = EXCLUDED.avatar_url,
      is_active = EXCLUDED.is_active,
      onboarding_status = EXCLUDED.onboarding_status,
      updated_at = NOW();

-- ============================================
-- USUÁRIO DEMO 3: Corretor
-- Layout: Purple/Pink Theme
-- ============================================
INSERT INTO users (
  id,
  telefone,
  nome,
  role,
  imobiliaria_id,
  gerente_id,
  avatar_url,
  is_active,
  onboarding_status,
  created_at,
  updated_at,
  last_login
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '5511999990003',
  'Corretor Demo',
  'corretor',
  '00000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222', -- Vinculado ao Gerente Demo
  'https://api.dicebear.com/7.x/avataaars/svg?seed=CorretorDemo',
  true,
  'completed',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (telefone) DO UPDATE
  SET nome = EXCLUDED.nome,
      role = EXCLUDED.role,
      imobiliaria_id = EXCLUDED.imobiliaria_id,
      gerente_id = EXCLUDED.gerente_id,
      avatar_url = EXCLUDED.avatar_url,
      is_active = EXCLUDED.is_active,
      onboarding_status = EXCLUDED.onboarding_status,
      updated_at = NOW();

-- ============================================
-- Verificar os usuários criados
-- ============================================
SELECT 
  nome,
  telefone,
  role,
  (SELECT nome FROM imobiliarias WHERE id = users.imobiliaria_id) as imobiliaria,
  (SELECT nome FROM users u WHERE u.id = users.gerente_id) as gerente,
  is_active,
  onboarding_status
FROM users
WHERE telefone IN ('5511999990001', '5511999990002', '5511999990003')
ORDER BY role DESC;

-- ============================================
-- INFORMAÇÕES DE LOGIN DOS USUÁRIOS DEMO
-- ============================================
-- 
-- ADMIN DEMO:
-- Telefone: (11) 99999-0001
-- Login: Digite 5511999990001 no campo de telefone
-- Acesso: Dashboard completo, todas as funcionalidades
-- 
-- GERENTE DEMO:
-- Telefone: (11) 99999-0002
-- Login: Digite 5511999990002 no campo de telefone
-- Acesso: Dashboard, gestão de equipe e leads
-- 
-- CORRETOR DEMO:
-- Telefone: (11) 99999-0003
-- Login: Digite 5511999990003 no campo de telefone
-- Acesso: Visualização de imóveis, calculadora e perfil
-- 
-- ============================================
