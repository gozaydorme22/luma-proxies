-- ─── Luma Proxies — Schema Supabase ─────────────────────────────────────────
-- Cole este SQL no SQL Editor do Supabase e execute.
-- ─────────────────────────────────────────────────────────────────────────────

-- Clientes (id = Firebase UID)
create table if not exists clients (
  id          text primary key,
  email       text unique not null,
  name        text,
  whatsapp    text,
  tier        text not null default 'bronze' check (tier in ('bronze','prata','ouro','diamante')),
  blocked     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Produtos / Planos
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('residencial','residencial_fixo','cpa','mobile','ipv4','datacenter')),
  unit        text not null check (unit in ('gb','unidade')),
  price_brl   numeric not null,
  active      boolean not null default true,
  description text,
  created_at  timestamptz not null default now()
);

-- Estoque de Proxies
create table if not exists proxies (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid references products(id) on delete set null,
  ip           text not null,
  port         integer not null,
  username     text not null,
  password     text not null,
  type         text not null check (type in ('residencial','residencial_fixo','cpa','mobile','ipv4','datacenter')),
  status       text not null default 'disponivel' check (status in ('disponivel','vendida','suspensa','reservada')),
  assigned_to  text references clients(id) on delete set null,
  order_id     uuid,
  country      text not null default 'BR',
  city         text,
  threads      integer,
  notes        text,
  sold_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Pacotes de GB (proxies rotativas)
create table if not exists gb_allocations (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null references clients(id) on delete cascade,
  order_id    uuid not null,
  product_id  uuid references products(id) on delete set null,
  proxy_id    uuid references proxies(id) on delete set null,
  total_mb    integer not null default 10240,
  used_mb     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Pedidos
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  client_id        text not null references clients(id) on delete cascade,
  product_id       uuid references products(id) on delete set null,
  quantity         numeric not null,
  total_brl        numeric not null,
  status           text not null default 'aguardando_pagamento'
                     check (status in ('aguardando_pagamento','pago','cancelado','reembolsado')),
  payment_method   text,
  gateway_id       text,
  gateway_payload  jsonb,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Histórico de consumo diário
create table if not exists usage_history (
  id             uuid primary key default gen_random_uuid(),
  allocation_id  uuid not null references gb_allocations(id) on delete cascade,
  date           date not null,
  used_mb        integer not null,
  unique(allocation_id, date)
);

-- ─── Row Level Security (service role bypassa automaticamente) ────────────────
alter table clients       enable row level security;
alter table products      enable row level security;
alter table proxies       enable row level security;
alter table gb_allocations enable row level security;
alter table orders        enable row level security;
alter table usage_history enable row level security;

-- Produtos são públicos (leitura)
create policy "products_public_read" on products for select using (true);
