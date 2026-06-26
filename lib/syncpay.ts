let _token: string | null = null
let _tokenExp = 0

function base() { return process.env.SYNCPAY_BASE_URL! }

export async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExp - 60_000) return _token

  const res = await fetch(`${base()}/api/partner/v1/auth-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.SYNCPAY_CLIENT_ID!,
      client_secret: process.env.SYNCPAY_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`SyncPay auth ${res.status}: ${await res.text()}`)

  const { access_token, expires_in } = await res.json()
  _token    = access_token as string
  _tokenExp = Date.now() + (expires_in as number) * 1000
  return _token
}

export interface CashInOpts {
  amount:      number   // BRL float, e.g. 18.90
  description: string
  webhookUrl:  string
  client: { name: string; cpf: string; email: string; phone: string }
}

export interface CashInResult {
  pix_code:   string
  identifier: string
}

export async function createPixCashIn(opts: CashInOpts): Promise<CashInResult> {
  const token = await getToken()
  const res = await fetch(`${base()}/api/partner/v1/cash-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      amount:      opts.amount,
      description: opts.description,
      webhook_url: opts.webhookUrl,
      client:      opts.client,
    }),
  })
  if (!res.ok) throw new Error(`SyncPay cash-in ${res.status}: ${await res.text()}`)
  return res.json()
}

export type TxStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'med'

export interface Transaction {
  status:        TxStatus
  amount:        number
  final_amount?: number
}

export async function getTransaction(identifier: string): Promise<Transaction> {
  const token = await getToken()
  const res = await fetch(`${base()}/api/partner/v1/transaction/${identifier}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`SyncPay status ${res.status}: ${await res.text()}`)
  return res.json()
}
