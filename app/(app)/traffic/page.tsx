import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getStore, STORE_CONFIG } from '@/lib/stores'
import { TrafficPanel } from '@/components/traffic/TrafficPanel'

interface TrafficPageProps {
  searchParams: { store?: string }
}

export default async function TrafficPage({ searchParams }: TrafficPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'associate') redirect('/schedule')

  let storeId: number
  if (user.role === 'ops') {
    storeId = searchParams.store ? parseInt(searchParams.store) : STORE_CONFIG[0].id
  } else {
    storeId = user.storeId!
  }

  const store = getStore(storeId)
  if (!store) redirect('/traffic')

  return <TrafficPanel store={store} />
}
