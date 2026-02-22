'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Palmtree, RefreshCw, Thermometer, X, Copy, ClipboardPaste, Lock } from 'lucide-react'
import { getShiftType, SHIFT_TYPES, normalizeShiftDisplay } from '@/lib/shiftUtils'
import { cn } from '@/lib/utils'

const QUICK_SET_ICONS = {
  PTO: Palmtree,
  COMP: RefreshCw,
  SICK: Thermometer,
  OFF: X,
} as const

export type CopySource = { employeeName: string; dayOfWeek: number } | null

interface ShiftCellProps {
  value: string | null | undefined
  onChange: (val: string) => void
  readOnly: boolean
  storeColor: string
  /** When set, Quick Set shows Copy/Paste. Used for schedule grid cells only. */
  copySource?: CopySource
  onSetCopySource?: (employeeName: string, dayOfWeek: number) => void
  onPaste?: (employeeName: string, dayOfWeek: number) => void
  employeeName?: string
  dayOfWeek?: number
  /** True when cell shows PTO from an approved request (yellow pill style). */
  isPtoFromRequest?: boolean
  /** True when cell is locked by approved RTO/PTO (show lock icon, undo in RTO tab to edit). */
  isLockedByRto?: boolean
}

export function ShiftCell({
  value,
  onChange,
  readOnly,
  storeColor,
  copySource,
  onSetCopySource,
  onPaste,
  employeeName,
  dayOfWeek,
  isPtoFromRequest = false,
  isLockedByRto = false,
}: ShiftCellProps) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(value ?? '')
  const [showPopover, setShowPopover] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    setInputVal(value ?? '')
  }, [value])

  const commit = useCallback(() => {
    const trimmed = inputVal.trim()
    const normalized = normalizeShiftDisplay(trimmed) || trimmed
    onChange(normalized)
    setEditing(false)
  }, [inputVal, onChange])

  const discard = useCallback(() => {
    setInputVal(value ?? '')
    setEditing(false)
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      discard()
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()
    setShowPopover(true)
  }

  function handleQuickSet(key: string) {
    onChange(key)
    setInputVal(key)
    setShowPopover(false)
  }

  function handleClear() {
    onChange('')
    setInputVal('')
    setShowPopover(false)
  }

  const shiftType = getShiftType(value)
  const isEmpty = !value || value.trim() === ''
  const isRegularShift = !isEmpty && !shiftType

  function getCellClasses() {
    if (isEmpty) return 'bg-slate-50 dark:bg-slate-700/60 text-slate-300 dark:text-slate-400'
    if (isPtoFromRequest || (value?.trim().toUpperCase() === 'PTO' && shiftType))
      return 'rounded-lg font-bold'
    if (shiftType) return cn(shiftType.bg, shiftType.text, 'border', shiftType.border, 'dark:border-slate-600')
    return 'bg-blue-50 dark:bg-slate-700/80 text-blue-800 dark:text-slate-200 border border-blue-200 dark:border-slate-600'
  }

  const ptoPillStyle =
    isPtoFromRequest || (value?.trim().toUpperCase() === 'PTO' && shiftType)
      ? { background: '#fff8e1', border: '1px solid #ffe082', color: '#f59e0b' }
      : undefined

  if (editing && !readOnly) {
    return (
      <div className="relative w-full h-full min-h-[40px]">
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder="10AM–6PM"
          className="w-full h-full min-h-[40px] px-2 py-1 text-xs text-center rounded-lg focus:outline-none border-2 bg-white dark:bg-slate-700 dark:text-slate-100 dark:border-slate-500 dark:placeholder-slate-400"
          style={{ borderColor: storeColor }}
        />
      </div>
    )
  }

  return (
    <div className="relative" ref={cellRef}>
      <div
        className={cn(
          'w-full min-h-[40px] flex items-center justify-center text-xs font-medium px-1 transition-all cursor-default select-none',
          getCellClasses(),
          !readOnly && 'hover:-translate-y-0.5 hover:shadow-sm cursor-pointer',
          isLockedByRto && readOnly && 'cursor-not-allowed opacity-90'
        )}
        style={ptoPillStyle}
        onClick={() => !readOnly && setEditing(true)}
        onContextMenu={handleContextMenu}
        title={isLockedByRto && readOnly ? 'Approved time off — undo in RTO tab to edit' : undefined}
      >
        <span className="text-center leading-tight flex items-center gap-1">
          {isEmpty ? '—' : value}
          {isLockedByRto && readOnly && (
            <Lock className="w-3 h-3 flex-shrink-0 opacity-60" aria-hidden />
          )}
        </span>
      </div>

      {/* Quick-set popover */}
      {showPopover && !readOnly && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-600 p-3 w-44">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-2 px-1">
              Quick Set
            </div>
            <div className="flex flex-col gap-1">
              {typeof employeeName === 'string' && typeof dayOfWeek === 'number' && onSetCopySource && onPaste && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onSetCopySource(employeeName, dayOfWeek)
                      setShowPopover(false)
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Set as copy
                  </button>
                  <button
                    type="button"
                    disabled={!copySource || (copySource.employeeName === employeeName && copySource.dayOfWeek === dayOfWeek)}
                    onClick={() => {
                      if (copySource && (copySource.employeeName !== employeeName || copySource.dayOfWeek !== dayOfWeek)) {
                        onPaste(employeeName, dayOfWeek)
                        setShowPopover(false)
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Paste
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-600 my-1" />
                </>
              )}
              {(Object.keys(QUICK_SET_ICONS) as Array<keyof typeof QUICK_SET_ICONS>).map((key) => {
                const type = SHIFT_TYPES[key]
                const Icon = QUICK_SET_ICONS[key]
                return (
                  <button
                    key={key}
                    onClick={() => handleQuickSet(key)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:opacity-80',
                      type.bg,
                      type.text,
                      type.border
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3 h-3" />
                      {type.label}
                    </span>
                    <span className="text-xs opacity-60">
                      {type.hours > 0 ? `${type.hours}h` : '—'}
                    </span>
                  </button>
                )
              })}
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mt-1"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
