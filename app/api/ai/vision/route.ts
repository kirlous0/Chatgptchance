import { assertOwnerApi } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueJob } from '@/lib/jobs'
import { audit } from '@/lib/audit'
import { ok, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function POST(request:Request){try{const user=await assertOwnerApi();const body=await request.json() as {projectId?:string};if(!body.projectId)throw new Error('PROJECT_ID_REQUIRED');const {data:shots,error:shotsError}=await createAdminClient().from('project_screenshots').select('id').eq('project_id',body.projectId).eq('status','ready');if(shotsError)throw shotsError;const ids=(shots??[]).map((x)=>x.id);if(!ids.length)throw new Error('NO_READY_SCREENSHOTS');const job=await enqueueJob('ai_screenshot_analysis',{projectId:body.projectId,screenshotIds:ids},`vision-manual:${body.projectId}:${ids.join(',')}:${Date.now()}`);await audit('screenshots.vision.queued','project',body.projectId,{jobId:job.id},user.id);return ok(job,202)}catch(e){return routeError(e)}}
