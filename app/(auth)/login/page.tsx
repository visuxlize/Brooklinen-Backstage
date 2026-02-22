import { LoginForm } from '@/components/auth/LoginForm'
import { LoginThemeToggle } from '@/components/auth/LoginThemeToggle'
import { BrooklinenLogo } from '@/components/ui/BrooklinenLogo'
import { APP_NAME_SHORT } from '@/lib/app-config'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const noProfile = params.error === 'no-profile'

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Brooklinen campaign image at 20% opacity */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: "url('/images/login-bg.jpeg')" }}
        aria-hidden
      />
      <LoginThemeToggle />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrooklinenLogo variant="navy" height={36} className="dark:hidden" />
            <BrooklinenLogo variant="white" height={36} className="hidden dark:block" />
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text)] tracking-tight">{APP_NAME_SHORT}</h1>
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
