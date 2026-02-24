'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO } from 'date-fns'

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  isPromo: boolean
}

export function CalendarWidget() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventDates, setEventDates] = useState<Set<string>>(new Set())
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const [statusRes, eventsRes] = await Promise.all([
          fetch('/api/calendar/status'),
          fetch('/api/calendar/events'),
        ])
        if (cancelled) return
        const status = statusRes.ok ? await statusRes.json() : { connected: false }
        setConnected(status.connected === true)
        if (eventsRes.ok) {
          const data = await eventsRes.json()
          const evs = data.events ?? []
          setEvents(evs)
          const dates = new Set<string>()
          evs.forEach((e: CalendarEvent) => {
            try {
              dates.add(parseISO(e.start).toISOString().slice(0, 10))
            } catch {
              // ignore
            }
          })
          setEventDates(dates)
        }
      } catch {
        if (!cancelled) setConnected(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leadingEmpty = monthStart.getDay()
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString()
    return events
      .filter((e) => e.start >= now)
      .slice(0, 7)
      .map((e) => ({
        ...e,
        date: parseISO(e.start),
        timeStr: format(parseISO(e.start), 'h:mm a'),
      }))
  }, [events])

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Calendar</h2>
        </div>
        <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
      </section>
    )
  }

  if (connected === false) {
    return (
      <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarIcon className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Google Calendar</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Connect your Google Calendar to see upcoming events and promotions on the dashboard.
        </p>
        <a
          href="/api/calendar/auth"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#0e1f3d' }}
        >
          Connect Google Calendar
        </a>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Calendar</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 min-w-[7rem] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {weekDays.map((d) => (
            <div key={d} className="text-[10px] font-medium text-slate-500 dark:text-slate-400 py-1">
              {d}
            </div>
          ))}
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`e-${i}`} />
          ))}
          {days.map((day) => {
            const key = day.toISOString().slice(0, 10)
            const hasEvent = eventDates.has(key)
            const isTodayCell = isToday(day)
            return (
              <div
                key={key}
                className={`min-h-[28px] flex flex-col items-center justify-center rounded-lg text-xs ${
                  !isSameMonth(day, currentMonth)
                    ? 'text-slate-300 dark:text-slate-600'
                    : isTodayCell
                      ? 'font-semibold text-white'
                      : 'text-slate-700 dark:text-slate-300'
                }`}
                style={isTodayCell ? { backgroundColor: '#0e1f3d' } : undefined}
              >
                {format(day, 'd')}
                {hasEvent && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" />}
              </div>
            )
          })}
        </div>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-700 p-4">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Upcoming events
        </h3>
        <ul className="space-y-2">
          {upcomingEvents.length === 0 ? (
            <li className="text-sm text-slate-500 dark:text-slate-400">No upcoming events</li>
          ) : (
            upcomingEvents.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2 text-sm">
                <span className="text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                  {format(ev.date, 'MMM d')} · {ev.timeStr}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-slate-800 dark:text-slate-200">{ev.summary}</span>
                  {ev.isPromo && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 text-[10px] font-medium">
                      <Tag className="w-3 h-3" />
                      Promo
                    </span>
                  )}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  )
}
