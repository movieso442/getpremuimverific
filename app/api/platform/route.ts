import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_PLATFORM_SETTINGS, getPlatformSettings } from '@/lib/platform/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getPlatformSettings(createAdminClient()))
  } catch {
    // Public pages still render with safe defaults during a database outage.
    return NextResponse.json(DEFAULT_PLATFORM_SETTINGS)
  }
}
