export type ProxyStatus = 'disponivel' | 'vendida' | 'suspensa' | 'reservada'
export type ProxyType   = 'residencial' | 'residencial_fixo' | 'cpa' | 'mobile' | 'ipv4' | 'datacenter'
export type OrderStatus = 'aguardando_pagamento' | 'pago' | 'cancelado' | 'reembolsado'
export type ProductUnit = 'gb' | 'unidade'

export interface Database {
  public: {
    Tables: {
      /* ─── Clientes ─── */
      clients: {
        Row: {
          id: string           // = Firebase UID
          email: string
          name: string | null
          whatsapp: string | null
          tier: 'bronze' | 'prata' | 'ouro' | 'diamante'
          created_at: string
          blocked: boolean
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          whatsapp?: string | null
          tier?: 'bronze' | 'prata' | 'ouro' | 'diamante'
          blocked?: boolean
        }
        Update: {
          email?: string
          name?: string | null
          whatsapp?: string | null
          tier?: 'bronze' | 'prata' | 'ouro' | 'diamante'
          blocked?: boolean
        }
      }

      /* ─── Produtos / Planos ─── */
      products: {
        Row: {
          id: string
          name: string
          type: ProxyType
          unit: ProductUnit        // 'gb' ou 'unidade'
          price_brl: number        // preço por GB ou por unidade
          active: boolean
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }

      /* ─── Estoque de Proxies ─── */
      proxies: {
        Row: {
          id: string
          product_id: string | null
          ip: string
          port: number
          username: string
          password: string
          type: ProxyType
          status: ProxyStatus
          assigned_to: string | null   // client id
          order_id: string | null
          country: string              // 'BR', 'US' etc
          city: string | null
          threads: number | null
          notes: string | null
          sold_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['proxies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['proxies']['Insert']>
      }

      /* ─── Pacotes de GB (produto sem IP fixo) ─── */
      gb_allocations: {
        Row: {
          id: string
          client_id: string
          order_id: string
          product_id: string
          proxy_id: string | null
          total_mb: number
          used_mb: number        // atualizado via sync com API do fornecedor
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['gb_allocations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['gb_allocations']['Insert']>
      }

      /* ─── Pedidos ─── */
      orders: {
        Row: {
          id: string
          client_id: string
          product_id: string
          quantity: number           // GBs ou unidades
          total_brl: number
          status: OrderStatus
          payment_method: string | null
          gateway_id: string | null  // ID da cobrança no gateway
          gateway_payload: unknown   // JSON raw do gateway
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }

      /* ─── Histórico de consumo (sync com API fornecedor) ─── */
      usage_history: {
        Row: {
          id: string
          allocation_id: string
          date: string           // 'YYYY-MM-DD'
          used_mb: number
        }
        Insert: Omit<Database['public']['Tables']['usage_history']['Row'], 'id'>
        Update: never
      }
    }
  }
}
