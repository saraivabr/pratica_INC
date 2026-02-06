-- Migration 050: Recepcionista Leads
-- Tabela para cadastro de leads pela recepcionista

CREATE TABLE IF NOT EXISTS recepcionista_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(50) NOT NULL,
  corretor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  corretor_nome VARCHAR(255),
  tipo_visita VARCHAR(20) NOT NULL DEFAULT 'primeira_vez'
    CHECK (tipo_visita IN ('primeira_vez', 'indicacao', 'retorno')),
  fonte VARCHAR(30) NOT NULL DEFAULT 'presencial'
    CHECK (fonte IN ('presencial', 'telefone', 'whatsapp', 'instagram', 'facebook', 'site', 'indicacao', 'outros')),
  observacoes TEXT,
  registrado_por UUID REFERENCES users(id) ON DELETE SET NULL,
  registrado_por_nome VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recepcionista_leads_workspace ON recepcionista_leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recepcionista_leads_workspace_date ON recepcionista_leads(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recepcionista_leads_corretor ON recepcionista_leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_recepcionista_leads_fonte ON recepcionista_leads(fonte);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_recepcionista_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recepcionista_leads_updated_at ON recepcionista_leads;
CREATE TRIGGER trg_recepcionista_leads_updated_at
  BEFORE UPDATE ON recepcionista_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_recepcionista_leads_updated_at();
