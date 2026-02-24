'use client'

import { useState } from 'react'
import {
  ExternalLink,
  Pencil,
  Check,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react'

function FaviconOrFallback({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  const src = getFaviconUrl(url)
  if (failed || !src) {
    return (
      <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
        <LinkIcon className="w-3 h-3 text-slate-500" />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="w-5 h-5 rounded object-contain"
      onError={() => setFailed(true)}
    />
  )
}
import {
  useUserPreferencesStore,
  DEFAULT_QUICK_LINKS,
  type QuickLinkItem,
} from '@/lib/user-preferences-store'

const KNOWN_ICONS: Record<string, string> = {
  lightspeed: '🟢',
  slack: '💬',
  gdrive: '📁',
  workday: '👤',
}

function getFaviconUrl(url: string): string {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch {
    return ''
  }
}

interface QuickLinksPanelProps {
  canEdit: boolean
}

export function QuickLinksPanel({ canEdit }: QuickLinksPanelProps) {
  const { getQuickLinks, setQuickLinks } = useUserPreferencesStore()
  const [editing, setEditing] = useState(false)
  const [links, setLinks] = useState<QuickLinkItem[]>(() => getQuickLinks())

  const displayLinks = editing ? links : getQuickLinks()

  function handleSave() {
    setQuickLinks(links)
    setEditing(false)
  }

  function handleAdd() {
    setLinks((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        label: 'New link',
        url: 'https://',
      },
    ])
  }

  function handleRemove(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= links.length) return
    const next = [...links]
    const [removed] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, removed)
    setLinks(next)
  }

  function handleChange(id: string, field: 'label' | 'url', value: string) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    )
  }

  function resetToDefaults() {
    setLinks([...DEFAULT_QUICK_LINKS])
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Quick Links
          </h2>
        </div>
        {canEdit && (
          <>
            {editing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-navy)] text-white px-2.5 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: '#0e1f3d' }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLinks(getQuickLinks())
                  setEditing(true)
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Links
              </button>
            )}
          </>
        )}
      </div>
      <div className="p-3">
        <ul className="space-y-1">
          {displayLinks.map((link, index) => (
            <li key={link.id} className="flex items-center gap-2 group">
              {editing && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReorder(index, index - 1)}
                    disabled={index === 0}
                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(index, index + 1)}
                    disabled={index === links.length - 1}
                    className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(link.id)}
                    className="p-0.5 text-slate-400 hover:text-red-600"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {editing ? (
                <div className="flex-1 min-w-0 flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => handleChange(link.id, 'label', e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
                    placeholder="Label"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => handleChange(link.id, 'url', e.target.value)}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
                    placeholder="https://"
                  />
                </div>
              ) : (
                <>
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center text-sm">
                    {link.icon && KNOWN_ICONS[link.icon] ? (
                      KNOWN_ICONS[link.icon]
                    ) : (
                      <FaviconOrFallback url={link.url} />
                    )}
                  </span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-200 hover:text-[var(--brand-navy)] truncate py-2"
                  >
                    {link.label}
                  </a>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </>
              )}
            </li>
          ))}
        </ul>
        {editing && (
          <button
            type="button"
            onClick={handleAdd}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-600 py-2 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <Plus className="w-4 h-4" />
            Add link
          </button>
        )}
      </div>
    </section>
  )
}
