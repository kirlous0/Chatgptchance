import { assertOwnerApi } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelJob } from '@/lib/jobs'
import { audit } from '@/lib/audit'
import { ok, fail, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await assertOwnerApi();const {id}=await params;const body=await request.json().catch(()=>({})) as {action?:string};const db=createAdminClient();const {data:job,error}=await db.from('jobs').select('*').eq('id',id).single();if(error)throw error;if(body.action==='cancel'){await cancelJob(id);await audit('job.cancelled','job',id,{},user.id);return ok({cancelled:true})}if(body.action==='retry'){if(!['failed','retrying','queued'].includes(job.status))return fail('Only failed, retrying or queued jobs can be retried.',409,'INVALID_JOB_STATE');const {data:next,error:retryError}=await db.from('jobs').update({status:'retrying',attempts:0,available_at:new Date().toISOString(),locked_until:null,last_error:null,completed_at:null,started_at:null,updated_at:new Date().toISOString()}).eq('id',id).select('id,type,payload,status,attempts,max_attempts').single();if(retryError)throw retryError;await audit('job.retry.queued','job',id,{jobId:id},user.id);return ok(next,202)}throw new Error('UNKNOWN_JOB_ACTION')}catch(e){return routeError(e)}}
