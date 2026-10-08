import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, isOwner } from '@/lib/auth'

export async function getDashboardData(){
  const user=await getCurrentUser();if(!user||!(await isOwner(user.id)))throw new Error('FORBIDDEN')
  const db=createAdminClient()
  const [projects,repos,review,jobs,failed,github,storage]=await Promise.all([
    db.from('projects').select('id',{count:'exact',head:true}),
    db.from('github_repositories').select('id',{count:'exact',head:true}),
    db.from('projects').select('id',{count:'exact',head:true}).eq('status','review'),
    db.from('jobs').select('id',{count:'exact',head:true}).in('status',['queued','processing','retrying']),
    db.from('jobs').select('id',{count:'exact',head:true}).eq('status','failed'),
    db.from('github_connections').select('github_login,updated_at').eq('user_id',user.id).maybeSingle(),
    db.storage.from('portfolio-media').list('',{limit:1}),
  ])
  for(const result of [projects,repos,review,jobs,failed,github,storage]){if(result.error)throw result.error}
  return {counts:{projects:projects.count??0,repositories:repos.count??0,review:review.count??0,activeJobs:jobs.count??0,failedJobs:failed.count??0},integrations:{github:github.data?'configured':'unconfigured',storage:'healthy'}}
}

export async function listJobs(limit=60){
  const db=createAdminClient(); const {data,error}=await db.from('jobs').select('*').order('created_at',{ascending:false}).limit(limit);if(error)throw error;return data ?? []
}
export async function listAuditLogs(limit=80){const {data,error}=await createAdminClient().from('audit_logs').select('*').order('created_at',{ascending:false}).limit(limit);if(error)throw error;return data??[]}
export async function listProjects(){const {data,error}=await createAdminClient().from('projects').select('*').order('featured',{ascending:false}).order('order_index',{ascending:true});if(error)throw error;return data??[]}
export async function listRepositories(){const {data,error}=await createAdminClient().from('github_repositories').select('*').order('pushed_at',{ascending:false,nullsFirst:false});if(error)throw error;return data??[]}
