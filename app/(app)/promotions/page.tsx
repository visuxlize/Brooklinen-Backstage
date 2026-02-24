import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { promotions } from '@/lib/db/schema'
import { gte, asc } from 'drizzle-orm'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ArrowLeft } from 'lucide-react'

export default async function PromotionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const list = await db
    .select()
    .from(promotions)
    .where(gte(promotions.startDate, today))
    .orderBy(asc(promotions.startDate))

  return (
    <div className="min-h-full">
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Upcoming Promotions
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          All scheduled promotions.
        </p>
        {list.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">No upcoming promotions.</p>
        ) : (
          <div className="space-y-4">
            {list.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {p.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {format(parseISO(p.startDate), 'MMM d, yyyy')} – {format(parseISO(p.endDate), 'MMM d, yyyy')}
                </p>
                {p.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                    {p.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
