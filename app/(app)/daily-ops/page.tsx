import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DailyOpsPageClient } from './DailyOpsPageClient'

export default async function DailyOpsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'associate') redirect('/schedule')

  return <DailyOpsPageClient />
}
