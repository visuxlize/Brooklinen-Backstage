import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getStore, STORE_CONFIG } from '@/lib/stores'
import { isFullControl } from '@/lib/roles'
import { AvailabilityDashboard } from '@/components/availability/AvailabilityDashboard'

interface AvailabilityPageProps {
  searchParams: Promise<{ store?: string }>
}

export default async function AvailabilityPage({ searchParams }: AvailabilityPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'associate') redirect('/schedule')

  const params = await searchParams
  let storeId: number
  if (isFullControl({ role: user.role, storeId: user.storeId })) {
    storeId = params.store ? parseInt(params.store) : STORE_CONFIG[0].id
  } else {
    storeId = user.storeId!
  }

  const store = getStore(storeId)
  if (!store) redirect('/availability')

  return <AvailabilityDashboard store={store} />
}
