import { NextResponse } from 'next/server'
import liveServices from '@/lib/liveServices.json'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryFilter = searchParams.get('category')
    const searchFilter = searchParams.get('search')?.toLowerCase()

    let services = liveServices as any[]

    if (categoryFilter && categoryFilter !== 'Everything') {
      services = services.filter((s) => s.category.toLowerCase().includes(categoryFilter.toLowerCase()))
    }

    if (searchFilter) {
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchFilter) ||
          s.category.toLowerCase().includes(searchFilter) ||
          String(s.service_id).includes(searchFilter)
      )
    }

    // Extract unique category names
    const categories = Array.from(new Set((liveServices as any[]).map((s) => s.category)))

    return NextResponse.json({
      total: services.length,
      categories_count: categories.length,
      categories,
      services
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch SMM services' }, { status: 500 })
  }
}
