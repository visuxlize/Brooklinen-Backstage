import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { SignupForm } from '@/components/auth/SignupForm'

export default async function SignupPage() {
  const user = await requireRole(['ops'])
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Brooklinen
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
          <p className="text-slate-500 text-sm mt-2">Add a new team member (ops only)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
