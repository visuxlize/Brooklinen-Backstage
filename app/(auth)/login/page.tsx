import { LoginForm } from '@/components/auth/LoginForm'
import { LoginThemeToggle } from '@/components/auth/LoginThemeToggle'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const noProfile = params.error === 'no-profile'

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center px-4 relative">
      <LoginThemeToggle />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
            Brooklinen
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text)] tracking-tight">Scheduling Platform</h1>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            {noProfile ? 'Account not set up' : 'Sign in to your account'}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-2xl shadow-lg border border-[var(--border)] p-8 dark:shadow-none">
          {noProfile ? (
            <div className="space-y-4 text-center">
              <p className="text-[var(--text)] text-sm opacity-90">
                You’re signed in, but your account isn’t in the app yet. Ask your admin to add you
                in the Team page, or sign out and try again.
              </p>
              <LoginForm signOutOnly />
            </div>
          ) : (
            <LoginForm />
          )}
        </div>
      </div>
    </div>
  )
}
