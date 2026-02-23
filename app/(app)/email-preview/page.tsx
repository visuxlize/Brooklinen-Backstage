import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isFullControl } from '@/lib/roles'
import { STORE_CONFIG, getStore } from '@/lib/stores'
import { EmailPreviewClient } from '@/components/email-preview/EmailPreviewClient'

export default async function EmailPreviewPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const store = user.storeId != null ? getStore(user.storeId) : null
  const allowedStores = isFullControl({ role: user.role, storeId: user.storeId })
    ? STORE_CONFIG
    : store
      ? [store]
      : []

  const initialStoreId =
    user.storeId ?? (STORE_CONFIG[0]?.id ?? 1)

  if (allowedStores.length === 0) {
    redirect('/schedule')
  }

  return (
    <EmailPreviewClient
      allowedStores={allowedStores}
      initialStoreId={initialStoreId}
    />
  )
}
