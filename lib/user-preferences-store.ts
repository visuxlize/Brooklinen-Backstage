'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QuickLinkItem {
  id: string
  label: string
  url: string
  icon?: string // optional icon key for known services
}

export const DEFAULT_QUICK_LINKS: QuickLinkItem[] = [
  { id: 'lightspeed', label: 'Lightspeed', url: 'https://cloud.lightspeed.com', icon: 'lightspeed' },
  { id: 'slack', label: 'Slack', url: 'https://slack.com', icon: 'slack' },
  { id: 'gdrive', label: 'Google Drive', url: 'https://drive.google.com', icon: 'gdrive' },
  { id: 'workday', label: 'Workday', url: 'https://www.workday.com', icon: 'workday' },
]

export interface UserPreferences {
  displayName: string | null
  avatarUrl: string | null
  quickLinks: QuickLinkItem[] | null // null = use defaults
}

export const useUserPreferencesStore = create<
  UserPreferences & {
    updateUser: (fields: Partial<UserPreferences>) => void
    setQuickLinks: (links: QuickLinkItem[]) => void
    getQuickLinks: () => QuickLinkItem[]
  }
>()(
  persist(
    (set, get) => ({
      displayName: null,
      avatarUrl: null,
      quickLinks: null,
      updateUser: (fields) => set((state) => ({ ...state, ...fields })),
      setQuickLinks: (links) => set({ quickLinks: links }),
      getQuickLinks: () => get().quickLinks ?? DEFAULT_QUICK_LINKS,
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
