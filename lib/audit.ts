import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logger'

export async function audit(action:string, entityType?:string, entityId?:string, metadata:Record<string,unknown> = {}, actorUserId?:string|null) {
  try {
    const {error}=await createAdminClient().from('audit_logs').insert({action,entity_type:entityType,entity_id:entityId ?? null,metadata,actor_user_id:actorUserId ?? null})
    if(error) throw error
  } catch(error) {
    logError('audit.write_failed',error,{action,entityType,entityId})
  }
}
