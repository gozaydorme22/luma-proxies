-- ============================================================
-- LUMA PROXIES — Schema principal (modelo pré-geradas)
-- Execute no Supabase SQL Editor
-- ============================================================

-- Remove tabelas antigas se existirem
DROP TABLE IF EXISTS gb_allocations CASCADE;
DROP TABLE IF EXISTS proxy_stock    CASCADE;
DROP TABLE IF EXISTS usage_history  CASCADE;
DROP TABLE IF EXISTS proxies        CASCADE;

-- Tabela principal: cada linha = uma proxy pré-gerada com credenciais únicas
CREATE TABLE proxies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text        NOT NULL,                          -- ex: "Proxy 10GB Residencial BR"
  proxy_type  text        NOT NULL DEFAULT 'residential_rotating',
                                                             -- residential_rotating | residential_sticky | mobile | cpa | datacenter
  country     text        NOT NULL DEFAULT 'BR',
  host        text        NOT NULL,
  port        integer     NOT NULL,
  username    text        NOT NULL,
  password    text        NOT NULL,
  gb_limit    numeric(10,4) NOT NULL,                        -- cota em GB (1, 3, 5, 10, 20...)
  used_gb     numeric(10,4) NOT NULL DEFAULT 0,             -- atualizado via API do fornecedor
  price       numeric(10,2) NOT NULL,                        -- preço de venda ao cliente
  cost_price  numeric(10,2),                                 -- custo de compra (opcional)
  status      text        NOT NULL DEFAULT 'available',      -- available | sold | suspended
  assigned_to text        REFERENCES clients(id) ON DELETE SET NULL,
  sold_at     timestamptz,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_proxies_status      ON proxies(status);
CREATE INDEX idx_proxies_assigned_to ON proxies(assigned_to);
CREATE INDEX idx_proxies_proxy_type  ON proxies(proxy_type);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_proxies_updated_at ON proxies;
CREATE TRIGGER trg_proxies_updated_at
  BEFORE UPDATE ON proxies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- View útil para o admin
CREATE OR REPLACE VIEW proxies_view AS
SELECT
  *,
  ROUND(gb_limit - used_gb, 4)                        AS remaining_gb,
  ROUND((used_gb / NULLIF(gb_limit, 0)) * 100, 1)    AS used_pct
FROM proxies;
