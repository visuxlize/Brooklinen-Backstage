import { parseHours } from '@/lib/shiftUtils'

interface HoursSummaryProps {
  employees: string[]
  data: Record<string, Record<number, string>>
  storeColor: string
}

const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6]

export function HoursSummary({ employees, data, storeColor }: HoursSummaryProps) {
  const dayTotals = DAY_KEYS.map((day) =>
    employees.reduce((sum, emp) => sum + parseHours(data[emp]?.[day] ?? ''), 0)
  )
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0)

  return (
    <tr className="border-t-2 border-slate-200 bg-slate-50">
      <td className="px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Day Total</span>
      </td>
      {DAY_KEYS.map((day) => (
        <td key={day} className="px-2 py-3 text-center">
          <span className="text-sm font-bold" style={{ color: storeColor }}>
            {dayTotals[day] > 0 ? `${dayTotals[day]}h` : '—'}
          </span>
        </td>
      ))}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-extrabold" style={{ color: storeColor }}>
          {grandTotal}h
        </span>
      </td>
    </tr>
  )
}
