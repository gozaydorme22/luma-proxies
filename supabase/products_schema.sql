-- ============================================================
-- LUMA PROXIES — Tabela de produtos + vínculo com proxies
-- Execute no Supabase SQL Editor
-- ============================================================

-- Catálogo de produtos (o que aparece na loja)
CREATE TABLE IF NOT EXISTS products (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text          NOT NULL,                          -- "Proxy Rotativa 5GB"
  proxy_type  text          NOT NULL DEFAULT 'residential_rotating',
  gb_limit    numeric(10,4) NOT NULL,                          -- 1 | 3 | 5 | 10 | 20...
  price       numeric(10,2) NOT NULL,                          -- preço de venda
  cost_price  numeric(10,2),                                   -- custo (opcional)
  description text,
  active      boolean       NOT NULL DEFAULT true,
  sort_order  integer       NOT NULL DEFAULT 0,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

-- Vínculo: cada proxy pertence a um produto
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL;

-- Índice para buscar proxies disponíveis por produto rapidamente
CREATE INDEX IF NOT EXISTS idx_proxies_product_status ON proxies(product_id, status);

-- View para o admin: estoque agrupado por produto
CREATE OR REPLACE VIEW stock_by_product AS
SELECT
  p.id,
  p.name,
  p.proxy_type,
  p.gb_limit,
  p.price,
  p.cost_price,
  p.description,
  p.active,
  p.sort_order,
  COUNT(px.id)                                          AS total_units,
  COUNT(px.id) FILTER (WHERE px.status = 'available')  AS available_units,
  COUNT(px.id) FILTER (WHERE px.status = 'sold')       AS sold_units,
  COUNT(px.id) FILTER (WHERE px.status = 'suspended')  AS suspended_units
FROM products p
LEFT JOIN proxies px ON px.product_id = p.id
GROUP BY p.id
ORDER BY p.sort_order, p.gb_limit;
