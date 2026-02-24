'use client'

import Link from 'next/link'
import {
  Calendar,
  Users,
  ClipboardList,
  BarChart3,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { CalendarWidget } from './CalendarWidget'
import { PromotionsPanel } from './PromotionsPanel'
import { QuickLinksPanel } from './QuickLinksPanel'

const CARD_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Calendar,
  Users,
  ClipboardList,
  BarChart3,
  FileText,
}

export interface DashboardCard {
  title: string
  description: string
  href: string
  icon: string
  color: string
}

interface DashboardClientProps {
  userName: string
  storeName: string
  cards: DashboardCard[]
  canCustomizeQuickLinks: boolean
  initialPromotions: { id: string; name: string; startDate: string; endDate: string; description: string | null }[]
}

export function DashboardClient({
  userName,
  storeName,
  cards,
  canCustomizeQuickLinks,
  initialPromotions,
}: DashboardClientProps) {
  return (
    <div className="min-h-full">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Backstage · {storeName}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left column: 60% — module cards */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.map((card) => {
                const Icon = CARD_ICONS[card.icon] ?? FileText
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-[0.07] transition-opacity`}
                    />
                    <div className="relative p-5">
                      <div
                        className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white mb-3 shadow-sm`}
                      >
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
                        {card.title}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                        {card.description}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-navy)] dark:text-blue-300 group-hover:gap-2 transition-all">
                        Open
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right column: 40% — calendar, promotions, quick links */}
          <div className="lg:col-span-2 space-y-5">
            <CalendarWidget />
            <PromotionsPanel initialPromotions={initialPromotions} />
            <QuickLinksPanel canEdit={canCustomizeQuickLinks} />
          </div>
        </div>
      </div>
    </div>
  )
}
