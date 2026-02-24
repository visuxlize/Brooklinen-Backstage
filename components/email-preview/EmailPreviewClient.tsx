'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mail, FileText, Loader2, AlertCircle, ChevronLeft, ChevronRight, Download, ImageIcon } from 'lucide-react'
import { getWeekStartByIndex, getTotalWeeks, getWeekIndexForDate } from '@/lib/scheduleWeeks'
import { format, addDays } from 'date-fns'
import html2canvas from 'html2canvas'
import { ScheduleImageTemplate } from '@/components/schedule/ScheduleImageTemplate'
import type { StoreConfig } from '@/lib/stores'

type TemplateType = 'schedule' | 'rto'

const IMAGE_WIDTH = 1920
const IMAGE_HEIGHT = 1080

type SchedulePreviewData = {
  store: StoreConfig
  employees: string[]
  initialData: Record<string, Record<number, string>>
  weekStart: string
  weekStartDate: string
  initialWeekIdx: number
  totalWeeks: number
  initialApprovedRtoRequests: Array<{
    id: string
    employeeName: string
    type: string
    status: string
    startDate: string | null
    endDate: string | null
    requestedDays: string | null
  }>
  initialDailyBudget: number[]
  initialDailyLy: number[]
  initialWeeklyBudget: number | null
  initialWeeklyLy: number | null
  initialWeekMeta: { workload: Record<string, string> | null; promotions: Record<string, string> | null; hoursOverride: Record<string, string> | null } | null
  budgetHoursDaily?: number[]
  trendingHoursDaily?: number[]
  peakWindowByDay?: string[]
  allowableHours?: number
}

interface EmailPreviewClientProps {
  /** Stores the user is allowed to preview. OPS: all; Leader: only their assigned store. */
  allowedStores: readonly StoreConfig[]
  /** Initial store to select (user's store for leaders, or first for OPS). */
  initialStoreId: number
}

export function EmailPreviewClient({ allowedStores, initialStoreId }: EmailPreviewClientProps) {
  const [template, setTemplate] = useState<TemplateType>('schedule')
  const [storeId, setStoreId] = useState<number>(initialStoreId)
  const [weekIndex, setWeekIndex] = useState(() => getWeekIndexForDate(new Date()))
  const [scheduleData, setScheduleData] = useState<SchedulePreviewData | null>(null)
  const [scheduleDataLoading, setScheduleDataLoading] = useState(false)
  const [scheduleDataError, setScheduleDataError] = useState<string | null>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generatingImage, setGeneratingImage] = useState(false)
  const captureContainerRef = useRef<HTMLDivElement>(null)

  const [rtoStatus, setRtoStatus] = useState<'approved' | 'denied'>('approved')
  const [html, setHtml] = useState<string>('')
  const [rtoLoading, setRtoLoading] = useState(true)
  const [rtoError, setRtoError] = useState<string | null>(null)

  const totalWeeks = getTotalWeeks()
  const weekStart = getWeekStartByIndex(weekIndex)
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d')}, ${format(weekStart, 'yyyy')}`

  const rtoPreviewUrl = `/api/email/preview?template=rto&status=${rtoStatus}`

  // If initialStoreId or allowedStores change (e.g. after nav), keep storeId in sync
  useEffect(() => {
    const valid = allowedStores.some((s) => s.id === storeId)
    if (!valid && allowedStores.length > 0) {
      setStoreId(allowedStores[0].id)
    }
  }, [allowedStores, storeId])

  useEffect(() => {
    if (template !== 'schedule') return
    let cancelled = false
    setScheduleDataLoading(true)
    setScheduleDataError(null)
    setGeneratedImageUrl(null)
    fetch(`/api/schedule/preview-data?storeId=${storeId}&weekIndex=${weekIndex}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Please sign in' : `Failed to load schedule (${res.status})`)
        return res.json()
      })
      .then((data: SchedulePreviewData) => {
        if (!cancelled) {
          setScheduleData(data)
          setScheduleDataError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setScheduleDataError(err instanceof Error ? err.message : 'Could not load schedule')
          setScheduleData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setScheduleDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [template, storeId, weekIndex])

  useEffect(() => {
    if (template !== 'rto') return
    let cancelled = false
    setRtoLoading(true)
    setRtoError(null)
    fetch(rtoPreviewUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Please sign in' : `Preview failed (${res.status})`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) {
          setHtml(text)
          setRtoError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRtoError(err instanceof Error ? err.message : 'Could not load preview')
          setHtml('')
        }
      })
      .finally(() => {
        if (!cancelled) setRtoLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [template, rtoPreviewUrl])

  const handleGenerateImage = useCallback(async () => {
    const container = captureContainerRef.current
    if (!container || !scheduleData) return
    const templateEl = container.firstElementChild as HTMLElement
    if (!templateEl) return
    setGeneratingImage(true)
    setGeneratedImageUrl(null)
    try {
      const canvas = await html2canvas(templateEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        windowWidth: IMAGE_WIDTH,
        windowHeight: templateEl.scrollHeight,
        logging: false,
        imageTimeout: 0,
      } as Parameters<typeof html2canvas>[1])

      const cw = canvas.width
      const ch = canvas.height
      const scale = Math.min(IMAGE_WIDTH / cw, IMAGE_HEIGHT / ch)
      const out = document.createElement('canvas')
      out.width = IMAGE_WIDTH
      out.height = IMAGE_HEIGHT
      const ctx = out.getContext('2d')
      if (!ctx) {
        setGeneratingImage(false)
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT)
      const drawW = cw * scale
      const drawH = ch * scale
      const x = (IMAGE_WIDTH - drawW) / 2
      const y = (IMAGE_HEIGHT - drawH) / 2
      ctx.drawImage(canvas, 0, 0, cw, ch, x, y, drawW, drawH)
      const dataUrl = out.toDataURL('image/png')
      setGeneratedImageUrl(dataUrl)
    } finally {
      setGeneratingImage(false)
    }
  }, [scheduleData])

  const handleDownloadImage = useCallback(() => {
    if (!generatedImageUrl || !scheduleData) return
    const safeStore = scheduleData.store.name.toLowerCase().replace(/\s+/g, '-')
    const safeWeek = weekLabel.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
    const link = document.createElement('a')
    link.download = `schedule-${safeStore}-${safeWeek}.png`
    link.href = generatedImageUrl
    link.click()
  }, [generatedImageUrl, scheduleData, weekLabel])

  const canChooseStore = allowedStores.length > 1
  const selectedStore = allowedStores.find((s) => s.id === storeId)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Email templates</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Schedule: generate the exact image to save and send. RTO: preview the approval/denial email.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-3 sm:w-64 shrink-0">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Template</label>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setTemplate('schedule')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                template === 'schedule'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => setTemplate('rto')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                template === 'rto'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              RTO
            </button>
          </div>

          {template === 'schedule' && (
            <>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Store</label>
              {canChooseStore ? (
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                >
                  {allowedStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm">
                  {selectedStore?.name ?? '—'}
                </div>
              )}
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Week</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                  disabled={weekIndex <= 0}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-200 truncate" title={weekLabel}>
                  {weekLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekIndex((i) => Math.min(totalWeeks - 1, i + 1))}
                  disabled={weekIndex >= totalWeeks - 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {scheduleData && (
                <>
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-50"
                  >
                    {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    {generatingImage ? 'Generating…' : 'Generate image'}
                  </button>
                  {generatedImageUrl && (
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Download className="w-4 h-4" />
                      Download image
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {template === 'rto' && (
            <>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={rtoStatus}
                onChange={(e) => setRtoStatus(e.target.value as 'approved' | 'denied')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
              <a
                href={rtoPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open preview in new tab
              </a>
            </>
          )}
        </div>

        <div className="flex-1 min-h-[420px] rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 overflow-auto flex flex-col">
          {template === 'schedule' && (
            <>
              {scheduleDataLoading && (
                <div className="flex items-center justify-center flex-1 min-h-[320px] text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              {scheduleDataError && !scheduleDataLoading && (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[320px] gap-2 text-slate-600 dark:text-slate-400">
                  <AlertCircle className="w-10 h-10 text-amber-500" />
                  <p className="text-sm font-medium">{scheduleDataError}</p>
                </div>
              )}
              {scheduleData && !scheduleDataLoading && (
                <div className="flex flex-col flex-1 min-h-0 p-2">
                  {/* Hidden template for html2canvas capture (off-screen, fixed 1920px width) */}
                  <div
                    ref={captureContainerRef}
                    aria-hidden
                    className="fixed left-[-9999px] top-0 z-[-1]"
                    style={{ width: IMAGE_WIDTH }}
                  >
                    <ScheduleImageTemplate
                      width={IMAGE_WIDTH}
                      store={scheduleData.store}
                      employees={scheduleData.employees}
                      initialData={scheduleData.initialData}
                      weekStartDate={new Date(scheduleData.weekStartDate)}
                      dailyBudget={scheduleData.initialDailyBudget}
                      dailyLy={scheduleData.initialDailyLy}
                      weeklyBudget={scheduleData.initialWeeklyBudget ?? 0}
                      weeklyLy={scheduleData.initialWeeklyLy ?? 0}
                      workload={scheduleData.initialWeekMeta?.workload ?? null}
                      promotions={scheduleData.initialWeekMeta?.promotions ?? null}
                      budgetHoursDaily={scheduleData.budgetHoursDaily ?? []}
                      trendingHoursDaily={scheduleData.trendingHoursDaily ?? []}
                      peakWindowByDay={scheduleData.peakWindowByDay ?? ['—', '—', '—', '—', '—', '—', '—']}
                      allowableHours={scheduleData.allowableHours ?? 0}
                      initialApprovedRtoRequests={scheduleData.initialApprovedRtoRequests}
                    />
                  </div>
                  {generatedImageUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={generatedImageUrl}
                        alt="Schedule preview"
                        className="max-w-full h-auto rounded-lg border border-slate-200 dark:border-slate-600"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Use &quot;Download image&quot; to save this exact layout and send it (e.g. in email).
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Schedule for {scheduleData.store.name} — {weekLabel}. Click &quot;Generate image&quot; to create the image.
                      </p>
                      <div className="flex-1 min-h-[280px] overflow-auto border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 flex items-start justify-center p-2">
                        <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left' }}>
                          <ScheduleImageTemplate
                            width={IMAGE_WIDTH}
                            store={scheduleData.store}
                            employees={scheduleData.employees}
                            initialData={scheduleData.initialData}
                            weekStartDate={new Date(scheduleData.weekStartDate)}
                            dailyBudget={scheduleData.initialDailyBudget}
                            dailyLy={scheduleData.initialDailyLy}
                            weeklyBudget={scheduleData.initialWeeklyBudget ?? 0}
                            weeklyLy={scheduleData.initialWeeklyLy ?? 0}
                            workload={scheduleData.initialWeekMeta?.workload ?? null}
                            promotions={scheduleData.initialWeekMeta?.promotions ?? null}
                            budgetHoursDaily={scheduleData.budgetHoursDaily ?? []}
                            trendingHoursDaily={scheduleData.trendingHoursDaily ?? []}
                            peakWindowByDay={scheduleData.peakWindowByDay ?? ['—', '—', '—', '—', '—', '—', '—']}
                            allowableHours={scheduleData.allowableHours ?? 0}
                            initialApprovedRtoRequests={scheduleData.initialApprovedRtoRequests}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {template === 'rto' && (
            <>
              {rtoLoading && (
                <div className="flex items-center justify-center flex-1 min-h-[320px] text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              {rtoError && !rtoLoading && (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[320px] gap-2 text-slate-600 dark:text-slate-400">
                  <AlertCircle className="w-10 h-10 text-amber-500" />
                  <p className="text-sm font-medium">{rtoError}</p>
                </div>
              )}
              {!rtoLoading && !rtoError && html && (
                <div
                  className="flex-1 min-h-[320px] bg-[#f8fafc] p-6"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
