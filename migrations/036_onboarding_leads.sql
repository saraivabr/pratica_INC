-- Migration 036: Create onboarding_leads table
-- This table tracks onboarding progress for new users registering via WhatsApp (Sofia)

CREATE TABLE IF NOT EXISTS onboarding_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    imobiliaria_name VARCHAR(255),
    imobiliaria_id UUID,
    gerente_name VARCHAR(255),
    gerente_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'collecting', -- collecting, ready, created
    step VARCHAR(30) NOT NULL DEFAULT 'name', -- name, confirm_name, imobiliaria, confirm_imobiliaria, gerente, done
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT onboarding_leads_status_check CHECK (status IN ('collecting', 'ready', 'created')),
    CONSTRAINT onboarding_leads_step_check CHECK (step IN ('name', 'confirm_name', 'imobiliaria', 'confirm_imobiliaria', 'gerente', 'done'))
);

-- Index for phone lookup
CREATE INDEX IF NOT EXISTS idx_onboarding_leads_phone ON onboarding_leads(phone);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_onboarding_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_leads_updated_at ON onboarding_leads;
CREATE TRIGGER trigger_onboarding_leads_updated_at
    BEFORE UPDATE ON onboarding_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_leads_updated_at();

COMMENT ON TABLE onboarding_leads IS 'Tracks onboarding progress for new users registering via WhatsApp';
COMMENT ON COLUMN onboarding_leads.status IS 'collecting = gathering info, ready = can create user, created = user was created';
COMMENT ON COLUMN onboarding_leads.step IS 'Current step in the onboarding flow';
