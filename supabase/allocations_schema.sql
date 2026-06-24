-- ─── Atualiza gb_allocations para suportar corte automático ─────────────────

DROP TABLE IF EXISTS gb_allocations CASCADE;

CREATE TABLE gb_allocations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     text        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  order_id      uuid,                                        -- FK orders (adicionar depois)
  stock_id      uuid        NOT NULL REFERENCES proxy_stock(id),

  -- credenciais únicas do sub-usuário deste cliente
  sub_username  text        NOT NULL,                        -- ex: masteruser-abc123
  sub_password  text        NOT NULL,
  host          text        NOT NULL,
  port          integer     NOT NULL,

  -- GB
  allocated_gb  numeric(12,4) NOT NULL,                      -- quanto o cliente comprou
  used_gb       numeric(12,4) NOT NULL DEFAULT 0,            -- atualizado pelo cron

  -- controle
  status        text        NOT NULL DEFAULT 'active',       -- active | suspended | expired
  suspended_at  timestamptz,
  suspend_reason text,                                       -- 'quota_exceeded' | 'manual' | 'expired'

  -- referência no fornecedor (para chamar API de suspensão)
  provider_ref  text,                                        -- ID do sub-user no sistema do fornecedor

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- trigger updated_at
DROP TRIGGER IF EXISTS gb_allocations_updated_at ON gb_allocations;
CREATE TRIGGER gb_allocations_updated_at
  BEFORE UPDATE ON gb_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- índices
CREATE INDEX IF NOT EXISTS idx_gb_alloc_client  ON gb_allocations(client_id);
CREATE INDEX IF NOT EXISTS idx_gb_alloc_status  ON gb_allocations(status);
CREATE INDEX IF NOT EXISTS idx_gb_alloc_stock   ON gb_allocations(stock_id);

ALTER TABLE gb_allocations ENABLE ROW LEVEL SECURITY;

-- view com GB restante
CREATE OR REPLACE VIEW gb_allocations_view AS
SELECT
  *,
  ROUND(allocated_gb - used_gb, 4)                                  AS remaining_gb,
  ROUND((used_gb / NULLIF(allocated_gb, 0)) * 100, 1)               AS used_pct
FROM gb_allocations;
