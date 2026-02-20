import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireRole } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ops', 'leader', 'associate']),
  storeId: z.number().int().nullable().optional(),
})

export async function GET() {
  const user = await requireRole(['ops'])
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await db.select().from(users).orderBy(users.createdAt)
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const user = await requireRole(['ops'])
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const validated = createUserSchema.parse(body)

    const supabase = getServiceClient()

    // Create Supabase auth user and send invite
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: validated.email,
      email_confirm: true,
      user_metadata: { name: validated.name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Insert into users table
    await db.insert(users).values({
      id: authData.user.id,
      name: validated.name,
      email: validated.email,
      role: validated.role,
      storeId: validated.role === 'ops' ? null : (validated.storeId ?? null),
    })

    // Send invite email
    await supabase.auth.admin.inviteUserByEmail(validated.email)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Admin user POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const user = await requireRole(['ops'])
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')
  if (!userId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = getServiceClient()

  await db.delete(users).where(eq(users.id, userId))
  await supabase.auth.admin.deleteUser(userId)

  return NextResponse.json({ success: true })
}
