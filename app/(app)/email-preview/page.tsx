'use client'

import { useState, useEffect } from 'react'
import { Mail, FileText, Loader2, AlertCircle } from 'lucide-react'

type TemplateType = 'schedule' | 'rto'

export default function EmailPreviewPage() {
  const [template, setTemplate] = useState<TemplateType>('schedule')
  const [storeName, setStoreName] = useState('Williamsburg')
  const [dateRange, setDateRange] = useState('Feb 22 – Feb 28, 2026')
  const [status, setStatus] = useState<'approved' | 'denied'>('approved')
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const previewUrl =
    template === 'schedule'
      ? `/api/email/preview?template=schedule&storeName=${encodeURIComponent(storeName)}&dateRange=${encodeURIComponent(dateRange)}`
      : `/api/email/preview?template=rto&status=${status}`

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(previewUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 401 ? 'Please sign in' : `Preview failed (${res.status})`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) {
          setHtml(text)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load preview')
          setHtml('')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewUrl])

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Email templates</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Preview how Resend emails will look. Use these when sending schedule or RTO notifications.
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Store name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                placeholder="Store name"
              />
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date range</label>
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                placeholder="Feb 22 – Feb 28, 2026"
              />
            </>
          )}

          {template === 'rto' && (
            <>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'approved' | 'denied')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </>
          )}

          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open preview in new tab
          </a>
        </div>

        <div className="flex-1 min-h-[420px] rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center min-h-[320px] text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center min-h-[320px] gap-2 text-slate-600 dark:text-slate-400">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
          {!loading && !error && html && (
            <div
              className="min-h-[320px] bg-[#f8fafc] p-6"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
