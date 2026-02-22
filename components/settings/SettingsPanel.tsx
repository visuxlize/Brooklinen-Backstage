'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserPreferencesStore, getInitials } from '@/lib/user-preferences-store'

interface SettingsPanelProps {
  currentUser: {
    id: string
    name: string
    email: string
    role: string
    storeName: string
    roleLabel: string
  }
}

export function SettingsPanel({ currentUser }: SettingsPanelProps) {
  const { displayName, avatarUrl, updateUser } = useUserPreferencesStore()
  const [displayNameInput, setDisplayNameInput] = useState(displayName ?? currentUser.name)
  useEffect(() => {
    setDisplayNameInput(displayName ?? currentUser.name)
  }, [currentUser.name, displayName])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const effectiveName = displayName?.trim() || currentUser.name

  function handleDisplayNameBlur() {
    const v = displayNameInput.trim()
    if (v !== (displayName ?? currentUser.name)) {
      updateUser({ displayName: v || null })
    }
  }

  function handleAvatarClick() {
    avatarInputRef.current?.click()
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (dataUrl) updateUser({ avatarUrl: dataUrl })
    }
    reader.readAsDataURL(file)
  }

  async function handleChangePassword() {
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPasswordError(error.message ?? 'Failed to update password')
        return
      }
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">My Settings</h1>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
          Profile
        </h2>

        <div className="flex flex-col items-center gap-2 mb-6">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity group"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{getInitials(effectiveName)}</span>
            )}
            <span className="absolute inset-0 bg-black/45 text-white text-xs font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              Change
            </span>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarFile}
          />
          <p className="text-[0.72rem] text-slate-500 dark:text-slate-400">JPG, PNG or WebP — max 2MB</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              onBlur={handleDisplayNameBlur}
              placeholder="Your name"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
              Store
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-200">{currentUser.storeName}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
              Role
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-200">{currentUser.roleLabel}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
              Email
            </label>
            <p className="text-sm text-slate-700 dark:text-slate-200">{currentUser.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-600 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
          Security
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
            />
          </div>
          {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-green-600 dark:text-green-400">Password updated!</p>}
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--brand-navy)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  )
}
