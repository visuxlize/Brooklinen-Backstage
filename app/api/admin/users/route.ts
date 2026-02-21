import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
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
  password: z.string().min(6),
  role: z.enum(['ops', 'leader', 'associate']),
  storeId: z.number().int().nullable().optional(),
})

const patchUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ops', 'leader', 'associate']).optional(),
  storeId: z.number().int().nullable().optional(),
})

// GET /api/admin/users?storeId=101  — ops gets all, leader gets their store
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const storeIdParam = searchParams.get('storeId')

  let query = db.select().from(users).$dynamic()

  if (user.role === 'leader') {
    // Leaders only see their store
    if (!user.storeId) return NextResponse.json({ data: [] })
    query = query.where(eq(users.storeId, user.storeId))
  } else if (storeIdParam) {
    // Ops can optionally filter by store
    query = query.where(eq(users.storeId, parseInt(storeIdParam)))
  }

  const data = await query.orderBy(users.createdAt)
  return NextResponse.json({ data })
}

// POST /api/admin/users — create a new user
export async function POST(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const validated = createUserSchema.parse(body)

    // Leaders can only add users to their own store
    if (currentUser.role === 'leader') {
      if (validated.role === 'ops') {
        return NextResponse.json({ error: 'Leaders cannot create ops users' }, { status: 403 })
      }
      if (validated.storeId !== currentUser.storeId) {
        return NextResponse.json({ error: 'Forbidden: can only add users to your store' }, { status: 403 })
      }
    }

    const supabase = getServiceClient()

    // Create Supabase auth user with password (no invite email)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
      user_metadata: { name: validated.name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Insert into users table
    const [newUser] = await db
      .insert(users)
      .values({
        id: authData.user.id,
        name: validated.name,
        email: validated.email,
        role: validated.role,
        storeId: validated.role === 'ops' ? null : (validated.storeId ?? null),
      })
      .returning()

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Admin user POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users?id=uuid — edit a user
export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')
  if (!userId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const body = await request.json()
    const validated = patchUserSchema.parse(body)

    // Fetch existing user to enforce scope
    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Leaders can only edit users in their own store, and cannot promote to ops or leader
    if (currentUser.role === 'leader') {
      if (existing.storeId !== currentUser.storeId) {
        return NextResponse.json({ error: 'Forbidden: not your store' }, { status: 403 })
      }
      if (validated.role && validated.role !== 'associate') {
        return NextResponse.json({ error: 'Leaders can only assign associate role' }, { status: 403 })
      }
      if (validated.storeId && validated.storeId !== currentUser.storeId) {
        return NextResponse.json({ error: 'Forbidden: cannot move users between stores' }, { status: 403 })
      }
    }

    const updateData: Partial<typeof users.$inferInsert> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.email !== undefined) updateData.email = validated.email
    if (validated.role !== undefined) updateData.role = validated.role
    if ('storeId' in validated) updateData.storeId = validated.role === 'ops' ? null : validated.storeId

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()

    // If email changed, update in Supabase auth too
    if (validated.email && validated.email !== existing.email) {
      const supabase = getServiceClient()
      await supabase.auth.admin.updateUserById(userId, { email: validated.email })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Admin user PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users?id=uuid
export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('id')
  if (!userId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Fetch to enforce scope
  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (currentUser.role === 'leader' && existing.storeId !== currentUser.storeId) {
    return NextResponse.json({ error: 'Forbidden: not your store' }, { status: 403 })
  }

  // Prevent deleting yourself
  if (userId === currentUser.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const supabase = getServiceClient()
  await db.delete(users).where(eq(users.id, userId))
  await supabase.auth.admin.deleteUser(userId)

  return NextResponse.json({ success: true })
}
