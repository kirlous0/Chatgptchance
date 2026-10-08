import { assertOwnerApi } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueJob } from '@/lib/jobs'
import { audit } from '@/lib/audit'
import { ok, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function POST(request:Request){try{const user=await assertOwnerApi();const body=await request.json() as {projectId?:string};if(!body.projectId)throw new Error('PROJECT_ID_REQUIRED');const {data,error}=await createAdminClient().from('projects').select('id,github_repository_id').eq('id',body.projectId).single();if(error)throw error;if(!data.github_repository_id)throw new Error('PROJECT_HAS_NO_REPOSITORY');const job=await enqueueJob('ai_project_generation',{projectId:data.id,repositoryId:data.github_repository_id},`ai-manual:${data.id}:${Date.now()}`);await audit('ai.analysis.queued','project',data.id,{jobId:job.id},user.id);return ok(job,202)}catch(e){return routeError(e)}}
