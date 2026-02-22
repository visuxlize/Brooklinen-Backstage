import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { BrooklinenLogo } from '@/components/ui/BrooklinenLogo'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <BrooklinenLogo variant="navy" height={36} className="dark:hidden" />
            <BrooklinenLogo variant="white" height={36} className="hidden dark:block" />
          </div>
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
