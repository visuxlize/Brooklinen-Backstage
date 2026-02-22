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
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setDisplayNameInput(displayName ?? currentUser.name)
  }, [currentUser.name, displayName])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const effectiveName = displayName?.trim() || currentUser.name

  function handleSaveName() {
    const v = displayNameInput.trim()
    updateUser({ displayName: v || null })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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
      setPasswordError('Must be at least 8 characters')
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
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto py-10 px-8 max-md:py-6 max-md:px-4">
      <div className="mb-9">
        <h1 className="text-[1.75rem] font-bold text-[#0e1f3d] dark:text-slate-100 m-0 mb-1.5">
          My Settings
        </h1>
        <p className="text-[0.95rem] text-[#6b7280] dark:text-slate-400 m-0">
          Manage your profile and account preferences
        </p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6 items-start max-md:grid-cols-1">
        {/* LEFT — Profile hero card */}
        <div className="bg-[#0e1f3d] rounded-2xl p-9 py-8 flex flex-col items-center gap-2 text-center sticky top-6">
          <button
            type="button"
            onClick={handleAvatarClick}
            className="relative w-[88px] h-[88px] rounded-full overflow-hidden flex items-center justify-center cursor-pointer bg-[#1e3a6e] border-[3px] border-white/15 hover:border-white/50 transition-[border-color]"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{getInitials(effectiveName)}</span>
            )}
            <span className="absolute inset-0 bg-black/50 text-white text-[0.72rem] font-semibold flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
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
          <p className="text-[0.68rem] text-[#6b7a94] text-center mt-1">JPG, PNG or WebP — max 2MB</p>
          <div className="text-white text-[1.15rem] font-bold mt-2">{effectiveName}</div>
          <div className="text-[#8a9ab8] text-[0.82rem] font-medium uppercase tracking-[0.07em]">
            {currentUser.roleLabel}
          </div>
          <div className="flex items-center gap-1.5 text-[#a0b0c8] text-[0.85rem] mt-1">
            <span
              className="w-[7px] h-[7px] rounded-full bg-[#3b82f6] flex-shrink-0"
              aria-hidden
            />
            {currentUser.storeName}
          </div>
        </div>

        {/* RIGHT — Profile + Security cards */}
        <div className="flex flex-col gap-5">
          <div className="bg-white dark:bg-slate-800/50 border border-[#e9ecf0] dark:border-slate-600 rounded-[14px] p-7">
            <h2 className="text-base font-bold text-[#0e1f3d] dark:text-slate-100 m-0 mb-5 pb-3.5 border-b border-[#f0f2f5] dark:border-slate-600">
              Profile
            </h2>

            <div className="mb-6">
              <label className="block text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase mb-1.5">
                Display Name
              </label>
              <div className="flex gap-2.5 items-center">
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 h-[42px] border-[1.5px] border-[#e2e6eb] dark:border-slate-600 rounded-[10px] px-3.5 text-[0.95rem] font-[inherit] text-[#1a2332] dark:text-slate-200 bg-white dark:bg-slate-800 outline-none transition-[border-color] focus:border-[#2563eb]"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className={`h-[42px] px-4 rounded-[10px] text-[0.875rem] font-semibold cursor-pointer transition-colors whitespace-nowrap border-0 ${
                    saved
                      ? 'bg-[#16a34a] text-white'
                      : 'bg-[#0e1f3d] dark:bg-slate-700 text-white hover:bg-[#1a3560] dark:hover:bg-slate-600'
                  }`}
                >
                  {saved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 gap-x-6">
              <div className="flex flex-col gap-1">
                <span className="text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase">
                  Store
                </span>
                <span className="text-[0.95rem] text-[#374151] dark:text-slate-200 font-medium">
                  {currentUser.storeName}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase">
                  Role
                </span>
                <span className="text-[0.95rem] text-[#374151] dark:text-slate-200 font-medium">
                  {currentUser.roleLabel}
                </span>
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase">
                  Email
                </span>
                <span className="text-[0.95rem] text-[#374151] dark:text-slate-200 font-medium">
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-[#e9ecf0] dark:border-slate-600 rounded-[14px] p-7">
            <h2 className="text-base font-bold text-[#0e1f3d] dark:text-slate-100 m-0 mb-5 pb-3.5 border-b border-[#f0f2f5] dark:border-slate-600">
              Security
            </h2>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full h-[42px] border-[1.5px] border-[#e2e6eb] dark:border-slate-600 rounded-[10px] px-3.5 text-[0.95rem] font-[inherit] text-[#1a2332] dark:text-slate-200 bg-white dark:bg-slate-800 outline-none box-border transition-[border-color] focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-[42px] border-[1.5px] border-[#e2e6eb] dark:border-slate-600 rounded-[10px] px-3.5 text-[0.95rem] font-[inherit] text-[#1a2332] dark:text-slate-200 bg-white dark:bg-slate-800 outline-none box-border transition-[border-color] focus:border-[#2563eb]"
                />
              </div>
              {passwordError && (
                <p className="text-[#e53935] dark:text-red-400 text-[0.82rem] m-0">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-[#16a34a] dark:text-green-400 text-[0.82rem] m-0">
                  Password updated successfully
                </p>
              )}
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="self-start h-[42px] px-5 rounded-[10px] text-[0.875rem] font-semibold text-white bg-[#0e1f3d] dark:bg-slate-700 border-0 cursor-pointer transition-colors hover:bg-[#1a3560] dark:hover:bg-slate-600 disabled:opacity-60"
              >
                {savingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
