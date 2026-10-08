import { assertOwnerApi } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueJob } from '@/lib/jobs'
import { audit } from '@/lib/audit'
import { ok, fail, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function GET(){try{await assertOwnerApi();const {data,error}=await createAdminClient().from('project_screenshots').select('*,projects(id,title,slug)').order('created_at',{ascending:false}).limit(120);if(error)throw error;return ok(data??[])}catch(e){return routeError(e)}}
export async function POST(request:Request){try{const user=await assertOwnerApi();const body=await request.json() as {projectId?:string};if(!body.projectId)return fail('projectId is required',422,'VALIDATION_ERROR');const {data:p,error}=await createAdminClient().from('projects').select('id,github_repository_id').eq('id',body.projectId).single();if(error)throw error;if(!p.github_repository_id)throw new Error('PROJECT_HAS_NO_REPOSITORY');const job=await enqueueJob('screenshot_capture',{projectId:p.id,repositoryId:p.github_repository_id},`manual-screenshot:${p.id}:${Date.now()}`);await audit('screenshots.capture.queued','project',p.id,{jobId:job.id},user.id);return ok(job,202)}catch(e){return routeError(e)}}
