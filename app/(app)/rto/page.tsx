import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getStore, STORE_CONFIG } from '@/lib/stores'
import { isFullControl } from '@/lib/roles'
import { RTODashboard } from '@/components/rto/RTODashboard'

interface RtoPageProps {
  searchParams: Promise<{ store?: string }>
}

export default async function RtoPage({ searchParams }: RtoPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'associate') redirect(`/rto/submit?store=${user.storeId ?? ''}`)

  const params = await searchParams
  let storeId: number
  if (isFullControl({ role: user.role, storeId: user.storeId })) {
    storeId = params.store ? parseInt(params.store) : STORE_CONFIG[0].id
  } else {
    storeId = user.storeId!
  }

  const store = getStore(storeId)
  if (!store) redirect('/rto')

  return <RTODashboard store={store} currentUser={{ role: user.role }} />
}
