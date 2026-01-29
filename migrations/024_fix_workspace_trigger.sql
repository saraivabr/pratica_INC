-- Migration 024: Fix workspace auto-creation trigger
-- Bug: BEFORE INSERT trigger fails because user doesn't exist yet when inserting workspace (FK constraint)
-- Fix: Change to AFTER INSERT trigger + UPDATE to set workspace_id

-- Step 1: Recreate function for AFTER INSERT context
CREATE OR REPLACE FUNCTION auto_create_workspace()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id INTEGER;
BEGIN
  -- Se workspace_id já foi definido, não fazer nada
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Criar workspace pessoal (agora o user já existe no banco)
  INSERT INTO workspaces (owner_id, name, slug, type)
  VALUES (
    NEW.id,
    NEW.nome || ' - Workspace',
    'user-' || NEW.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
    'personal'
  )
  RETURNING id INTO new_workspace_id;

  -- Atualizar o usuário com o workspace_id (AFTER INSERT não permite modificar NEW)
  UPDATE users SET workspace_id = new_workspace_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Recreate trigger as AFTER INSERT
DROP TRIGGER IF EXISTS trigger_auto_create_workspace ON users;
CREATE TRIGGER trigger_auto_create_workspace
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_workspace();

-- Step 3: Backfill - create workspaces for existing users without one
INSERT INTO workspaces (owner_id, name, slug, type)
SELECT id, nome || ' - Workspace', 'user-' || id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())), 'personal'
FROM users
WHERE workspace_id IS NULL
  AND id NOT IN (SELECT owner_id FROM workspaces WHERE owner_id IS NOT NULL);

-- Step 4: Associate created workspaces to their users
UPDATE users u
SET workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = u.id AND u.workspace_id IS NULL;
