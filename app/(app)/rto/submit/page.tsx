import { RTOSubmitForm } from '@/components/rto/RTOSubmitForm'

interface RtoSubmitPageProps {
  searchParams: { store?: string }
}

export default function RtoSubmitPage({ searchParams }: RtoSubmitPageProps) {
  const defaultStoreId = searchParams.store ? parseInt(searchParams.store) : undefined

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Brooklinen
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Request Time Off</h1>
          <p className="text-slate-500 text-sm mt-2">
            Submit your RTO, PTO, COMP, or Sick day request. Your store leader will be notified.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <RTOSubmitForm defaultStoreId={defaultStoreId} />
        </div>
      </div>
    </div>
  )
}
