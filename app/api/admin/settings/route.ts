import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { DEFAULT_PLATFORM_SETTINGS, getPlatformSettings } from '@/lib/platform/settings'

export async function GET() {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    return NextResponse.json(await getPlatformSettings(access.admin))
  } catch {
    return NextResponse.json(DEFAULT_PLATFORM_SETTINGS)
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await request.json() as Partial<typeof DEFAULT_PLATFORM_SETTINGS>
    const email = body.support_email?.trim()
    const phone = body.support_phone?.trim()
    const whatsapp = body.whatsapp_number?.replace(/\D/g, '')
    const smm = Number(body.smm_markup_multiplier)
    const sms = Number(body.sms_markup_multiplier)
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !phone || !whatsapp || !Number.isFinite(smm) || !Number.isFinite(sms) || smm < 1 || sms < 1 || smm > 10 || sms > 10) {
      return NextResponse.json({ error: 'Enter valid contact details and multipliers from 1 to 10.' }, { status: 400 })
    }
    const { error } = await access.admin.from('platform_settings').upsert({
      id: true, support_email: email, support_phone: phone, whatsapp_number: whatsapp,
      smm_markup_multiplier: smm, sms_markup_multiplier: sms, updated_by: access.profile.id, updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Admin settings update failed]', error)
    return NextResponse.json({ error: 'Could not save platform settings. Run the latest database schema first.' }, { status: 500 })
  }
}
