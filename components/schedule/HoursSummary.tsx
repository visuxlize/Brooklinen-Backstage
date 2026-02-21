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
    <tr className="bg-[var(--brand-navy)] text-white border-t-0">
      <td className="px-4 py-3 rounded-bl-lg">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Actual Hours</span>
      </td>
      {DAY_KEYS.map((day) => (
        <td key={day} className="px-2 py-3 text-center">
          <span className="text-sm font-bold text-white">
            {dayTotals[day] > 0 ? dayTotals[day] : '—'}
          </span>
        </td>
      ))}
      <td className="px-4 py-3 text-center rounded-br-lg">
        <span className="text-sm font-extrabold text-white">{grandTotal}</span>
      </td>
    </tr>
  )
}
