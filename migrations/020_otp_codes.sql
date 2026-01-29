-- =============================================================================
-- Migration: 020_otp_codes.sql
-- Descrição: Criar tabela para OTPs (login por telefone)
-- Data: 28 Jan 2026
-- =============================================================================

-- Tabela de códigos OTP para autenticação por telefone
CREATE TABLE IF NOT EXISTS otp_codes (
  id SERIAL PRIMARY KEY,
  telefone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_otp_telefone ON otp_codes(telefone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_used ON otp_codes(used);

-- Comentários
COMMENT ON TABLE otp_codes IS 'Códigos OTP para autenticação por telefone';
COMMENT ON COLUMN otp_codes.telefone IS 'Telefone com formato internacional (+55...)';
COMMENT ON COLUMN otp_codes.code IS 'Código de 6 dígitos';
COMMENT ON COLUMN otp_codes.expires_at IS 'Data/hora de expiração (geralmente 5-10 minutos)';
COMMENT ON COLUMN otp_codes.used IS 'Se o código já foi utilizado';
