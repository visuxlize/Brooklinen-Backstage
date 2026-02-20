import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getStore, STORE_CONFIG } from '@/lib/stores'
import { RTODashboard } from '@/components/rto/RTODashboard'

interface RtoPageProps {
  searchParams: { store?: string }
}

export default async function RtoPage({ searchParams }: RtoPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'associate') redirect('/rto/submit')

  let storeId: number
  if (user.role === 'ops') {
    storeId = searchParams.store ? parseInt(searchParams.store) : STORE_CONFIG[0].id
  } else {
    storeId = user.storeId!
  }

  const store = getStore(storeId)
  if (!store) redirect('/rto')

  return <RTODashboard store={store} currentUser={{ role: user.role }} />
}
