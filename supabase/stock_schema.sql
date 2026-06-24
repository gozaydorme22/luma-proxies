-- ─── Estoque de proxies (lotes comprados do fornecedor) ──────────────────────
CREATE TABLE IF NOT EXISTS proxy_stock (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier      text        NOT NULL,                          -- nome do fornecedor
  proxy_type    text        NOT NULL,                          -- residential_rotating | residential_sticky | mobile | datacenter
  label         text        NOT NULL,                          -- nome interno ex: "Residencial BR - NetNut Lote 1"
  host          text        NOT NULL,                          -- gate.fornecedor.com
  port          integer     NOT NULL,                          -- 7000
  username      text        NOT NULL,
  password      text        NOT NULL,
  country       text        NOT NULL DEFAULT 'BR',
  total_gb      numeric(12,4) NOT NULL,                        -- GB comprados
  allocated_gb  numeric(12,4) NOT NULL DEFAULT 0,              -- GB já vendidos/alocados
  sale_price_gb numeric(10,4) NOT NULL DEFAULT 6.50,           -- preço de venda por GB (R$)
  cost_price_gb numeric(10,4),                                 -- preço de custo (referência)
  status        text        NOT NULL DEFAULT 'active',         -- active | paused | depleted
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- GB disponível como coluna computada (view helper)
CREATE OR REPLACE VIEW proxy_stock_view AS
SELECT
  *,
  ROUND(total_gb - allocated_gb, 4)                                    AS available_gb,
  ROUND((allocated_gb / NULLIF(total_gb, 0)) * 100, 1)                 AS used_pct
FROM proxy_stock;

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS proxy_stock_updated_at ON proxy_stock;
CREATE TRIGGER proxy_stock_updated_at
  BEFORE UPDATE ON proxy_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE proxy_stock ENABLE ROW LEVEL SECURITY;
-- service role bypassa RLS automaticamente (chave SUPABASE_SECRET_KEY)

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_proxy_stock_type   ON proxy_stock(proxy_type);
CREATE INDEX IF NOT EXISTS idx_proxy_stock_status ON proxy_stock(status);

-- ─── Garantir que allocated_gb nunca ultrapassa total_gb ─────────────────────
ALTER TABLE proxy_stock DROP CONSTRAINT IF EXISTS chk_allocated_lte_total;
ALTER TABLE proxy_stock ADD CONSTRAINT chk_allocated_lte_total
  CHECK (allocated_gb >= 0 AND allocated_gb <= total_gb);
