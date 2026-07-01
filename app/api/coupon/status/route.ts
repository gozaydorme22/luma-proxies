import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// LUMA10 is available to all logged-in users.
// Single-use enforcement requires first_purchase_coupon_used column in clients table.
export async function GET() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ eligible: false })

  return NextResponse.json({ eligible: true })
}
