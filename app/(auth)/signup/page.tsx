import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { SignupForm } from '@/components/auth/SignupForm'
import { BrooklinenLogo } from '@/components/ui/BrooklinenLogo'

export default async function SignupPage() {
  const user = await requireRole(['ops'])
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrooklinenLogo variant="navy" height={32} className="dark:hidden" />
            <BrooklinenLogo variant="white" height={32} className="hidden dark:block" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Create Account</h1>
          <p className="text-slate-500 text-sm mt-2">Add a new team member (ops only)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
