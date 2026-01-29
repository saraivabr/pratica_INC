-- Fix workspace orphans - VERSÃO CORRIGIDA
-- Corrige leads e mensagens sem workspace_id

BEGIN;

-- 1. Corrigir leads órfãos via corretor
UPDATE leads l
SET workspace_id = u.workspace_id
FROM users u
WHERE l.workspace_id IS NULL
  AND l.corretor_id = u.id
  AND u.workspace_id IS NOT NULL;

-- 2. Corrigir leads órfãos via tenant padrão (fallback)
UPDATE leads
SET workspace_id = 1
WHERE workspace_id IS NULL;

-- 3. Corrigir mensagens WhatsApp órfãs
UPDATE whatsapp_messages m
SET workspace_id = 1
WHERE workspace_id IS NULL;

-- 4. Verificar resultado
DO $$
DECLARE
    orphan_leads INTEGER;
    orphan_msgs INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_leads FROM leads WHERE workspace_id IS NULL;
    SELECT COUNT(*) INTO orphan_msgs FROM whatsapp_messages WHERE workspace_id IS NULL;
    
    RAISE NOTICE '=== RESULTADO FINAL ===';
    RAISE NOTICE 'Leads órfãos restantes: %', orphan_leads;
    RAISE NOTICE 'Mensagens órfãs restantes: %', orphan_msgs;
    
    IF orphan_leads = 0 AND orphan_msgs = 0 THEN
        RAISE NOTICE '✅ CORREÇÃO CONCLUÍDA COM SUCESSO!';
    ELSE
        RAISE WARNING '⚠️ Ainda restam dados órfãos';
    END IF;
END $$;

COMMIT;

-- Estatísticas pós-correção
SELECT 
    'Leads por workspace' as tabela,
    workspace_id,
    COUNT(*) as total
FROM leads
WHERE workspace_id IS NOT NULL
GROUP BY workspace_id
ORDER BY workspace_id;

SELECT 
    'Mensagens por workspace' as tabela,
    workspace_id,
    COUNT(*) as total
FROM whatsapp_messages
WHERE workspace_id IS NOT NULL
GROUP BY workspace_id
ORDER BY workspace_id;
