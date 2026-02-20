'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Palmtree, RefreshCw, Thermometer, X, Check } from 'lucide-react'
import { getShiftType, SHIFT_TYPES, parseHours } from '@/lib/shiftUtils'
import { cn } from '@/lib/utils'

const QUICK_SET_ICONS = {
  PTO: Palmtree,
  COMP: RefreshCw,
  SICK: Thermometer,
  OFF: X,
} as const

interface ShiftCellProps {
  value: string | null | undefined
  onChange: (val: string) => void
  readOnly: boolean
  storeColor: string
}

export function ShiftCell({ value, onChange, readOnly, storeColor }: ShiftCellProps) {
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
    onChange(trimmed)
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
    if (isEmpty) return 'bg-slate-50 text-slate-300'
    if (shiftType) return cn(shiftType.bg, shiftType.text, 'border', shiftType.border)
    return 'bg-blue-50 text-blue-800 border border-blue-200'
  }

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
          className="w-full h-full min-h-[40px] px-2 py-1 text-xs text-center rounded-lg focus:outline-none border-2 bg-white"
          style={{ borderColor: storeColor }}
        />
      </div>
    )
  }

  return (
    <div className="relative" ref={cellRef}>
      <div
        className={cn(
          'w-full min-h-[40px] flex items-center justify-center text-xs font-medium rounded-lg px-1 transition-all cursor-default select-none',
          getCellClasses(),
          !readOnly && 'hover:-translate-y-0.5 hover:shadow-sm cursor-pointer'
        )}
        onClick={() => !readOnly && setEditing(true)}
        onContextMenu={handleContextMenu}
      >
        <span className="text-center leading-tight">{isEmpty ? '—' : value}</span>
      </div>

      {/* Quick-set popover */}
      {showPopover && !readOnly && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 w-44">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 px-1">
              Quick Set
            </div>
            <div className="flex flex-col gap-1">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors mt-1"
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
