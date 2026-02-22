import Link from 'next/link'
import { SignupForm } from '@/components/auth/SignupForm'
import { BrooklinenLogo } from '@/components/ui/BrooklinenLogo'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <BrooklinenLogo variant="navy" height={36} className="dark:hidden" />
            <BrooklinenLogo variant="white" height={36} className="hidden dark:block" />
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Get started with your free account
          </p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
