'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface PromotionItem {
  id: string
  name: string
  startDate: string
  endDate: string
  description: string | null
}

interface PromotionsPanelProps {
  initialPromotions: PromotionItem[]
}

export function PromotionsPanel({ initialPromotions }: PromotionsPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const promotions = initialPromotions.slice(0, 3)

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Upcoming Promotions
          </h2>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {promotions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming promotions.</p>
          ) : (
            promotions.map((promo) => (
              <div
                key={promo.id}
                className="rounded-xl border border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/30 p-3"
              >
                <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                  {promo.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {format(parseISO(promo.startDate), 'MMM d')} – {format(parseISO(promo.endDate), 'MMM d, yyyy')}
                </div>
                {promo.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">
                    {promo.description}
                  </p>
                )}
              </div>
            ))
          )}
          {initialPromotions.length > 3 && (
            <Link
              href="/promotions"
              className="block text-center text-sm font-medium text-[var(--brand-navy)] dark:text-blue-300 hover:underline"
            >
              See all
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
