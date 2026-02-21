import { RTOSubmitForm } from '@/components/rto/RTOSubmitForm'

interface RtoSubmitPageProps {
  searchParams: Promise<{ store?: string }>
}

export default async function RtoSubmitPage({ searchParams }: RtoSubmitPageProps) {
  const params = await searchParams
  const defaultStoreId = params.store ? parseInt(params.store) : undefined

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Brooklinen
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Request Time Off</h1>
          <p className="text-slate-500 text-sm mt-2">
            Submit RTO, PTO, or Partial Time Off. For partial time off, specify the times you need. Your store leader will be notified.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <RTOSubmitForm defaultStoreId={defaultStoreId} />
        </div>
      </div>
    </div>
  )
}
