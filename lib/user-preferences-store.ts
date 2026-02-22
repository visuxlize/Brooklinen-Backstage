'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserPreferences {
  displayName: string | null
  avatarUrl: string | null
}

export const useUserPreferencesStore = create<UserPreferences & { updateUser: (fields: Partial<UserPreferences>) => void }>()(
  persist(
    (set) => ({
      displayName: null,
      avatarUrl: null,
      updateUser: (fields) => set((state) => ({ ...state, ...fields })),
    }),
    { name: 'brooklinen-user-preferences' }
  )
)

export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('')
}
