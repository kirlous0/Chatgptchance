import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type OwnerUser = { id: string; email?: string | null }

export async function getCurrentUser(): Promise<OwnerUser | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  return data.user ? { id: data.user.id, email: data.user.email } : null
}

export async function isOwner(userId: string) {
  const db = createAdminClient()
  const { data, error } = await db.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return data?.role === 'owner'
}

export async function requireOwner() {
  const user = await getCurrentUser()
  if (!user || !(await isOwner(user.id))) redirect('/control-center/login')
  return user
}

export async function assertOwnerApi() {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  if (!(await isOwner(user.id))) throw new Error('FORBIDDEN')
  return user
}
