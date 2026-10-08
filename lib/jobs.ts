import { createAdminClient } from '@/lib/supabase/admin'
import { sha256 } from '@/lib/security'
import { logEvent } from '@/lib/logger'

export type JobType = 'repository_analysis'|'live_url_check'|'ai_project_generation'|'screenshot_capture'|'ai_screenshot_analysis'|'github_sync'
export type JobRecord = { id:string; type:JobType; payload:Record<string,unknown>; status:string; attempts:number; max_attempts:number }

export async function enqueueJob(type: JobType, payload: Record<string, unknown>, stableKey: string) {
  const db=createAdminClient()
  const idempotencyKey=sha256(`${type}:${stableKey}`)
  const { data, error }=await db.from('jobs').upsert({type,payload,idempotency_key:idempotencyKey,status:'queued',available_at:new Date().toISOString()}, {onConflict:'idempotency_key',ignoreDuplicates:true}).select('id,type,payload,status,attempts,max_attempts').maybeSingle()
  if(error) throw error
  if(data) logEvent('job.enqueued',{jobId:data.id,type})
  if(!data){
    const existing=await db.from('jobs').select('id,type,payload,status,attempts,max_attempts').eq('idempotency_key',idempotencyKey).single()
    if(existing.error) throw existing.error
    return existing.data as JobRecord
  }
  return data as JobRecord
}

export async function claimNextJob(workerName='vercel-cron'): Promise<JobRecord|null> {
  const db=createAdminClient()
  const {data,error}=await db.rpc('claim_next_job',{worker_name:workerName,lease_seconds:120})
  if(error) throw error
  return data as JobRecord | null
}

export async function completeJob(id:string){const {error}=await createAdminClient().from('jobs').update({status:'completed',completed_at:new Date().toISOString(),locked_until:null,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error}

export async function failJob(job:JobRecord,errorMessage:string){
  const db=createAdminClient(); const exhausted=job.attempts>=job.max_attempts
  const delaySeconds=Math.min(300,2**Math.max(0,job.attempts-1)*5)
  const next=new Date(Date.now()+delaySeconds*1000).toISOString()
  const {error}=await db.from('jobs').update({status:exhausted?'failed':'retrying',available_at:next,locked_until:null,last_error:errorMessage.slice(0,1000),updated_at:new Date().toISOString()}).eq('id',job.id)
  if(error)throw error
  logEvent('job.failed',{jobId:job.id,type:job.type,exhausted,error:errorMessage.slice(0,160)})
}

export async function cancelJob(id:string){const {error}=await createAdminClient().from('jobs').update({status:'cancelled',locked_until:null,updated_at:new Date().toISOString()}).eq('id',id).in('status',['queued','retrying']);if(error)throw error}
