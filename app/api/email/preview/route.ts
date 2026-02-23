import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getScheduleEmailPreviewHtml, getRtoEmailPreviewHtml } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

/**
 * GET /api/email/preview?template=schedule|rto&storeName=...&dateRange=...
 * Returns HTML so you can open in a new tab or embed in an iframe to see how the email will look.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const template = searchParams.get('template') ?? 'schedule'
  const storeName = searchParams.get('storeName') ?? undefined
  const dateRange = searchParams.get('dateRange') ?? undefined

  let html: string
  if (template === 'rto') {
    const status = (searchParams.get('status') as 'approved' | 'denied') ?? 'approved'
    html = getRtoEmailPreviewHtml({
      employeeName: searchParams.get('employeeName') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      requestedDays: searchParams.get('requestedDays') ?? undefined,
      status,
      leaderNote: searchParams.get('leaderNote') ?? undefined,
      storeName: searchParams.get('storeName') ?? undefined,
    })
  } else {
    html = getScheduleEmailPreviewHtml(storeName, dateRange)
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
