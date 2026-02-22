import { RTOSubmitForm } from '@/components/rto/RTOSubmitForm'
import { ShareRtoLink } from '@/components/rto/ShareRtoLink'
import { BrooklinenLogo } from '@/components/ui/BrooklinenLogo'

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
          <div className="flex justify-center sm:justify-start mb-4">
            <BrooklinenLogo variant="navy" height={32} className="dark:hidden" />
            <BrooklinenLogo variant="white" height={32} className="hidden dark:block" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Request Time Off</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Submit RTO, PTO, or Partial Time Off. For partial time off, specify the times you need. Your store leader will be notified.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-6">
          <RTOSubmitForm defaultStoreId={defaultStoreId} />
          <ShareRtoLink />
        </div>
      </div>
    </div>
  )
}
