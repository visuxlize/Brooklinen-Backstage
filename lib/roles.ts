/**
 * Role hierarchy and permissions.
 * - OPS (HQ): complete control, all stores
 * - Area Manager: complete control, works from a store
 * - Store Leader: complete control of their store and team only
 * - Lead: view only Schedule, Daily Ops, submit RTO
 * - Associate: view only Schedule, Daily Ops, submit RTO
 */

export const ROLES = ['ops', 'area_manager', 'store_leader', 'lead', 'associate'] as const
export type Role = (typeof ROLES)[number]

/** Legacy 'leader' in DB is treated as store_leader */
export function normalizeRole(role: string): Role {
  if (role === 'leader') return 'store_leader'
  if (ROLES.includes(role as Role)) return role as Role
  return 'associate'
}

export const ROLE_LABELS: Record<Role, string> = {
  ops: 'OPS (HQ)',
  area_manager: 'Area Manager',
  store_leader: 'Store Leader',
  lead: 'Lead',
  associate: 'Associate',
}

export type CurrentUserLike = { role: string; storeId: number | null }

/** Full control over all stores (ops, area_manager) */
export function isFullControl(user: CurrentUserLike): boolean {
  const r = normalizeRole(user.role)
  return r === 'ops' || r === 'area_manager'
}

/** Full control over one store only (store_leader) */
export function isStoreLeader(user: CurrentUserLike): boolean {
  return normalizeRole(user.role) === 'store_leader'
}

/** View-only: Schedule, Daily Ops, Submit RTO (lead, associate) */
export function isViewOnly(user: CurrentUserLike): boolean {
  const r = normalizeRole(user.role)
  return r === 'lead' || r === 'associate'
}

/** Can edit schedule / daily ops (full control or store leader for their store) */
export function canEditSchedule(user: CurrentUserLike, storeId: number): boolean {
  if (isFullControl(user)) return true
  if (isStoreLeader(user) && user.storeId === storeId) return true
  return false
}

/** Can access Admin panel. Ops/Area Manager: all; Store Leader: their store only */
export function canAccessAdmin(user: CurrentUserLike): boolean {
  const r = normalizeRole(user.role)
  return r === 'ops' || r === 'area_manager' || r === 'store_leader'
}

/** Admin sees all users (ops, area_manager); store leader sees only their store */
export function adminSeesAllStores(user: CurrentUserLike): boolean {
  return isFullControl(user)
}

/** Store IDs this user can access (for dropdowns, daily ops, etc.) */
export function allowedStoreIds(user: CurrentUserLike, allStoreIds: number[]): number[] {
  if (isFullControl(user)) return allStoreIds
  if (user.storeId != null && (isStoreLeader(user) || isViewOnly(user))) {
    return allStoreIds.includes(user.storeId) ? [user.storeId] : []
  }
  return []
}
