import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getStore, STORE_CONFIG } from '@/lib/stores'
import { isFullControl } from '@/lib/roles'
import { ROLE_LABELS, normalizeRole } from '@/lib/roles'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const storeId = user.storeId
  const store = storeId != null ? getStore(storeId) : null
  const storeName = store?.name ?? (isFullControl({ role: user.role, storeId }) ? 'All stores' : '—')

  return (
    <SettingsPanel
      currentUser={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeName,
        roleLabel: ROLE_LABELS[normalizeRole(user.role)] ?? user.role,
      }}
    />
  )
}
