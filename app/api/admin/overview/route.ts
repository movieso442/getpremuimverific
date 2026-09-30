import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

const completed = (value: { status?: string }) => value.status === 'completed'
const sum = (items: Array<{ amount?: number | string }>) => items.reduce((total, item) => total + Number(item.amount || 0), 0)

export async function GET() {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })

    const [profilesResult, transactionsResult, smmResult, smsResult, accountsResult, entriesResult] = await Promise.all([
      access.admin.from('profiles').select('id, email, full_name, phone_number, balance_xaf, role, created_at').order('created_at', { ascending: false }).limit(500),
      access.admin.from('wallet_transactions').select('id, profile_id, amount, type, payment_method, reference, status, description, created_at').order('created_at', { ascending: false }).limit(500),
      access.admin.from('smm_orders').select('id, profile_id, service_name, category, quantity, charge_xaf, start_count, remains, status, api_order_id, created_at').order('created_at', { ascending: false }).limit(500),
      access.admin.from('sms_orders').select('id, profile_id, service_name, country_name, price_xaf, status, created_at').order('created_at', { ascending: false }).limit(500),
      access.admin.from('account_orders').select('id, profile_id, item_title, category, price_xaf, status, created_at').order('created_at', { ascending: false }).limit(500),
      access.admin.from('financial_entries').select('id, kind, amount_xaf, description, reference, created_at').order('created_at', { ascending: false }).limit(250),
    ])

    if (profilesResult.error || transactionsResult.error || smmResult.error || smsResult.error || accountsResult.error) {
      throw profilesResult.error || transactionsResult.error || smmResult.error || smsResult.error || accountsResult.error
    }

    const transactions = transactionsResult.data || []
    const completedDeposits = transactions.filter((row) => row.type === 'deposit' && completed(row))
    const customerSales = transactions.filter((row) => ['smm_order', 'sms_purchase', 'account_purchase'].includes(row.type) && completed(row))
    const refunds = transactions.filter((row) => row.type === 'refund' && completed(row))
    const expenses = entriesResult.error ? [] : (entriesResult.data || [])
    const totalExpenses = expenses.reduce((total, item) => total + Number(item.amount_xaf || 0), 0)

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      schema_notice: entriesResult.error ? 'Run the latest Supabase schema SQL to enable expense and profit tracking.' : null,
      metrics: {
        cash_received_xaf: sum(completedDeposits),
        service_sales_xaf: sum(customerSales),
        refunds_xaf: sum(refunds),
        expenses_xaf: totalExpenses,
        recorded_profit_xaf: sum(customerSales) - totalExpenses,
        wallet_liability_xaf: (profilesResult.data || []).reduce((total, profile) => total + Number(profile.balance_xaf || 0), 0),
        pending_payments_xaf: sum(transactions.filter((row) => row.type === 'deposit' && row.status === 'pending')),
        pending_payments_count: transactions.filter((row) => row.type === 'deposit' && row.status === 'pending').length,
        active_smm_orders: (smmResult.data || []).filter((row) => ['pending', 'processing', 'in_progress'].includes(row.status)).length,
        customers: (profilesResult.data || []).length,
      },
      profiles: profilesResult.data || [],
      transactions,
      smm_orders: smmResult.data || [],
      sms_orders: smsResult.data || [],
      account_orders: accountsResult.data || [],
      expenses,
    })
  } catch (error: unknown) {
    console.error('[Admin overview failed]', error)
    return NextResponse.json({ error: 'Could not load the administrator dashboard.' }, { status: 500 })
  }
}
