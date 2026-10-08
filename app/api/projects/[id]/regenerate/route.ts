import { assertOwnerApi } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueJob } from '@/lib/jobs'
import { audit } from '@/lib/audit'
import { ok, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){try{const user=await assertOwnerApi();const {id}=await params;const {data,error}=await createAdminClient().from('projects').select('id,github_repository_id').eq('id',id).single();if(error)throw error;if(!data.github_repository_id)throw new Error('PROJECT_HAS_NO_REPOSITORY');const job=await enqueueJob('ai_project_generation',{projectId:id,repositoryId:data.github_repository_id},`manual-ai:${id}:${Date.now()}`);await audit('ai.project.regeneration.queued','project',id,{jobId:job.id},user.id);return ok(job,202)}catch(e){return routeError(e)}}
