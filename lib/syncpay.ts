let _token: string | null = null
let _tokenExp = 0

function base(): string {
  const url = process.env.SYNCPAY_BASE_URL
  if (!url) throw new Error('SYNCPAY_BASE_URL not set')
  return url.replace(/\/+$/, '')
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExp - 60_000) return _token

  const res = await fetch(`${base()}/api/partner/v1/auth-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.SYNCPAY_CLIENT_ID,
      client_secret: process.env.SYNCPAY_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SyncPay auth ${res.status}: ${text.slice(0, 300)}`)
  }

  const json = await res.json() as { access_token: string; expires_in: number }
  _token    = json.access_token
  _tokenExp = Date.now() + json.expires_in * 1_000
  return _token
}

// ─── Cash-In ─────────────────────────────────────────────────────────────────

export interface CashInOpts {
  amount:      number   // BRL, e.g. 18.90
  description: string
  webhookUrl:  string
  client: {
    name:  string
    email: string
    phone: string   // 10-11 digits, no mask — omit if empty
  }
}

export interface CashInResult {
  message:    string
  pix_code:   string
  identifier: string
}

export async function createPixCashIn(opts: CashInOpts): Promise<CashInResult> {
  const token = await getToken()

  const clientPayload: Record<string, string> = {
    name:  opts.client.name,
    email: opts.client.email,
  }
  if (opts.client.phone) clientPayload.phone = opts.client.phone

  const res = await fetch(`${base()}/api/partner/v1/cash-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount:      opts.amount,
      description: opts.description,
      webhook_url: opts.webhookUrl,
      client:      clientPayload,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SyncPay cash-in ${res.status}: ${text.slice(0, 300)}`)
  }

  return res.json() as Promise<CashInResult>
}

// ─── Transaction status ───────────────────────────────────────────────────────

export type TxStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'med'

export interface Transaction {
  reference_id:      string
  currency:          string
  amount:            number
  final_amount?:     number
  status:            TxStatus
  description:       string | null
  transaction_date:  string
}

export async function getTransaction(identifier: string): Promise<Transaction> {
  const token = await getToken()

  const res = await fetch(`${base()}/api/partner/v1/transaction/${identifier}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SyncPay transaction ${res.status}: ${text.slice(0, 300)}`)
  }

  const json = await res.json() as { data: Transaction }
  return json.data
}
