import { assertOwnerApi } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function GET(){try{await assertOwnerApi();const {data,error}=await createAdminClient().from('projects').select('*').order('featured',{ascending:false}).order('order_index',{ascending:true});if(error)throw error;return ok(data??[])}catch(e){return routeError(e)}}
