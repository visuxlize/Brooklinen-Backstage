'use client'

import { useState, useRef, useEffect } from 'react'

export interface CleanSelectOption {
  value: string
  label: string
}

interface CleanSelectProps {
  value: string
  onChange: (value: string) => void
  options: CleanSelectOption[]
  placeholder?: string
  alignRight?: boolean
}

export function CleanSelect({
  value,
  onChange,
  options,
  placeholder = '— Select —',
  alignRight = false,
}: CleanSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? null
  const isEmpty = !selectedLabel

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="clean-select-trigger"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 0',
          borderBottom: `1.5px solid ${open ? '#2563eb' : 'transparent'}`,
          transition: 'border-color 0.15s',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          fontWeight: isEmpty ? 400 : 500,
          color: isEmpty ? '#9ca3af' : '#1a2332',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.borderBottomColor = '#d1d5db'
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.borderBottomColor = 'transparent'
        }}
      >
        {selectedLabel ?? placeholder}
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            flexShrink: 0,
            opacity: isEmpty ? 0.35 : 0.55,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.15s',
            color: '#6b7280',
          }}
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: alignRight ? 0 : 'auto',
            left: alignRight ? 'auto' : 0,
            zIndex: 100,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            minWidth: 200,
            overflow: 'hidden',
            padding: '4px 0',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value || 'blank'}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 16px',
                background: opt.value === value ? '#eff6ff' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                color: opt.value === value ? '#1d4ed8' : '#374151',
                fontWeight: opt.value === value ? 600 : 400,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = '#f9fafb'
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) e.currentTarget.style.background = 'transparent'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
