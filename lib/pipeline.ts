import { createAdminClient } from '@/lib/supabase/admin'
import { getConnectedUserIdByLogin, getGithubRepo, getGithubReadme, getGithubPackageJson, getGithubTree, getGithubFile, getLatestCommitSha, type GithubRepo } from '@/lib/github'
import { analyzeRepository, type Evidence } from '@/lib/analysis/repository'
import { enqueueJob } from '@/lib/jobs'
import { getAIProvider, isAIConfigured } from '@/lib/ai/providers'
import { validateAIProject, validateAIVision } from '@/lib/ai/validate'
import { safeFetch } from '@/lib/ssrf'
import { sha256 } from '@/lib/security'
import { audit } from '@/lib/audit'
import { logError, logEvent } from '@/lib/logger'

function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80) || `project-${Date.now()}`}

async function getRepoRow(repositoryId:string){
  const db=createAdminClient(); const {data,error}=await db.from('github_repositories').select('*').eq('id',repositoryId).single(); if(error)throw error; return data as GithubRepo & {id:string;github_id:number;owner_login:string;full_name:string;default_branch:string;latest_commit_sha:string|null}
}

async function findProjectByRepo(repositoryId:string){const {data,error}=await createAdminClient().from('projects').select('*').eq('github_repository_id',repositoryId).maybeSingle();if(error)throw error;return data}

async function ensureProjectDraft(repoRow:Awaited<ReturnType<typeof getRepoRow>>, repo:GithubRepo, analysis:ReturnType<typeof analyzeRepository>) {
  const db=createAdminClient(); let project=await findProjectByRepo(repoRow.id)
  if(!project){
    const {data,error}=await db.from('projects').insert({github_repository_id:repoRow.id,slug:slugify(repoRow.name),title:repoRow.name,short_description:repoRow.description,long_description:repoRow.description,category:null,year:repoRow.pushed_at?new Date(repoRow.pushed_at).getFullYear():null,project_type:'Web project',presentation_type:'LARGE_EDITORIAL',status:analysis.qualification==='publish_candidate'?'review':'draft',featured:false,order_index:0,github_url:repoRow.html_url,quality_score:analysis.score,confidence_score:Math.round((analysis.score/100)*100),title_source:'system',description_source:'system',presentation_type_source:'system',featured_source:'system'}).select('*').single(); if(error)throw error; project=data
  } else {
    const {data,error}=await db.from('projects').update({quality_score:analysis.score,github_url:repoRow.html_url,updated_at:new Date().toISOString()}).eq('id',project.id).select('*').single();if(error)throw error;project=data
  }
  return project
}

function evidenceRows(projectId:string,evidence:Evidence[]) { return evidence.map((e)=>({project_id:projectId,evidence_key:e.key,source_kind:e.sourceKind,source_locator:e.locator,excerpt:e.excerpt ?? null,content_hash:e.excerpt?sha256(e.excerpt):null,confidence:e.confidence,trusted:e.trusted})) }

export async function runRepositoryAnalysis(payload:Record<string,unknown>) {
  const repositoryId=String(payload.repositoryId); const userId=String(payload.userId); const repoRow=await getRepoRow(repositoryId)
  const repo=await getGithubRepo(userId,repoRow.owner_login,repoRow.name)
  const readme=await getGithubReadme(userId,repo.owner.login,repo.name)
  const packageJson=await getGithubPackageJson(userId,repo.owner.login,repo.name)
  const tree=await getGithubTree(userId,repo.owner.login,repo.name,repo.default_branch)
  const interesting=tree.tree.filter(x=>x.type==='blob' && /\.(tsx?|jsx?|css|md|json)$/.test(x.path) && !/(^|\/)(node_modules|\.next|dist|build)(\/|$)/.test(x.path)).slice(0,35)
  const samples:Array<{path:string;content:string}>=[]
  for(const item of interesting.slice(0,18)){
    try{samples.push({path:item.path,content:(await getGithubFile(userId,repo.owner.login,repo.name,item.path,repo.default_branch)).slice(0,12000)})}catch{/* individual files are best-effort evidence */}
  }
  const latestCommitSha=await getLatestCommitSha(userId,repo.owner.login,repo.name,repo.default_branch)
  const analysis=analyzeRepository(repo,readme,packageJson,tree.tree,samples)
  const project=await ensureProjectDraft(repoRow,repo,analysis)
  const db=createAdminClient()
  {const {error}=await db.from('github_repositories').update({name:repo.name,owner_login:repo.owner.login,full_name:repo.full_name,default_branch:repo.default_branch,html_url:repo.html_url,homepage:repo.homepage,description:repo.description,language:repo.language,topics:repo.topics ?? [],stargazers_count:repo.stargazers_count,forks_count:repo.forks_count,open_issues_count:repo.open_issues_count,pushed_at:repo.pushed_at,archived:repo.archived,is_template:repo.is_template ?? false,private:repo.private,latest_commit_sha:latestCommitSha ?? repoRow.latest_commit_sha,imported_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',repoRow.id);if(error)throw error}
  {const {error}=await db.from('repository_analysis').upsert({repository_id:repoRow.id,commit_sha:latestCommitSha ?? repoRow.latest_commit_sha ?? repo.pushed_at ?? 'unknown',quality_score:analysis.score,qualification:analysis.qualification,detected_technologies:analysis.technologies,detected_features:analysis.features,evidence:analysis.evidence,deployment_candidates:analysis.deploymentCandidates,source_structure:analysis.sourceStructure,warnings:analysis.warnings,analyzed_at:new Date().toISOString()},{onConflict:'repository_id,commit_sha'});if(error)throw error}
  {const {error}=await db.from('project_evidence').upsert(evidenceRows(project.id,analysis.evidence),{onConflict:'project_id,evidence_key'});if(error)throw error}
  for(const tech of analysis.technologies){const {error}=await db.from('project_technologies').upsert({project_id:project.id,name:tech.name,source:'detected',confidence:tech.confidence,sort_order:analysis.technologies.findIndex((x)=>x.name===tech.name)},{onConflict:'project_id,name'});if(error)throw error}
  for(const feature of analysis.features){const {data:ev,error:evError}=await db.from('project_evidence').select('id').eq('project_id',project.id).eq('evidence_key',feature.evidenceKey).maybeSingle();if(evError)throw evError;const {error}=await db.from('project_features').upsert({project_id:project.id,name:feature.name,source:'detected',confidence:feature.confidence,evidence_id:ev?.id ?? null,sort_order:analysis.features.findIndex((x)=>x.name===feature.name)},{onConflict:'project_id,name'});if(error)throw error}
  await enqueueJob('live_url_check',{projectId:project.id,repositoryId:repoRow.id},`live:${repoRow.id}:${latestCommitSha ?? repoRow.latest_commit_sha ?? repo.pushed_at ?? 'unknown'}`)
  if(await isAIConfigured()) await enqueueJob('ai_project_generation',{projectId:project.id,repositoryId:repoRow.id},`ai:${project.id}:${latestCommitSha ?? repoRow.latest_commit_sha ?? repo.pushed_at ?? 'unknown'}`)
  await audit('repository.analyzed','github_repository',repoRow.id,{qualityScore:analysis.score,qualification:analysis.qualification,projectId:project.id},userId)
  logEvent('repository.analyzed',{repositoryId:repoRow.id,projectId:project.id,qualityScore:analysis.score})
}

export async function runLiveUrlCheck(payload:Record<string,unknown>) {
  const projectId=String(payload.projectId); const repositoryId=String(payload.repositoryId); const repoRow=await getRepoRow(repositoryId)
  const {data:analysis}=await createAdminClient().from('repository_analysis').select('deployment_candidates').eq('repository_id',repositoryId).order('analyzed_at',{ascending:false}).limit(1).maybeSingle()
  const candidates=[repoRow.homepage,...((analysis?.deployment_candidates ?? []) as unknown[])].filter((x):x is string=>typeof x==='string' && x.length>0)
  let selected:string|null=null; let source='unknown'; let message='No reachable deployment candidate was found.'
  for(const candidate of [...new Set(candidates)]){
    try{
      const {response,safeUrl}=await safeFetch(candidate,{headers:{Accept:'text/html,application/xhtml+xml'}},{timeoutMs:7000,maxBytes:64*1024,maxRedirects:2})
      if(response.status>=200 && response.status<400){selected=safeUrl.toString();source=candidate===repoRow.homepage?'github_homepage':'readme_or_metadata';message=`HTTP ${response.status}`;break}
    }catch(error){message=error instanceof Error?error.message:String(error)}
  }
  const db=createAdminClient(); {const {error}=await db.from('projects').update({live_url:selected,live_url_source:selected?source:null,live_url_status:selected?'reachable':'unreachable',updated_at:new Date().toISOString()}).eq('id',projectId);if(error)throw error}
  if(selected) await enqueueJob('screenshot_capture',{projectId,repositoryId},`screenshots:${projectId}:${selected}:${repoRow.latest_commit_sha ?? 'current'}`)
  await audit('live-url.checked','project',projectId,{selected,message})
}

async function hasOverride(projectId:string, field:string){const {data,error}=await createAdminClient().from('project_overrides').select('id').eq('project_id',projectId).eq('field_name',field).maybeSingle();if(error)throw error;return Boolean(data)}

export async function runAIProjectGeneration(payload:Record<string,unknown>) {
  const projectId=String(payload.projectId); let repositoryId=payload.repositoryId ? String(payload.repositoryId) : null; const db=createAdminClient()
  const {data:project,error:pe}=await db.from('projects').select('*').eq('id',projectId).single();if(pe)throw pe
  repositoryId ??= project.github_repository_id
  if(!repositoryId) throw new Error('PROJECT_HAS_NO_REPOSITORY')
  const repoRow=await getRepoRow(repositoryId)
  const {data:analysis,error:ae}=await db.from('repository_analysis').select('*').eq('repository_id',repositoryId).order('analyzed_at',{ascending:false}).limit(1).single();if(ae)throw ae
  const {data:evidence,error:ee}=await db.from('project_evidence').select('id,evidence_key,source_kind,source_locator,excerpt,confidence').eq('project_id',projectId);if(ee)throw ee
  const provider=await getAIProvider(); const rawEvidence=JSON.stringify((evidence ?? []).map((e)=>({id:e.id,key:e.evidence_key,source:e.source_kind,locator:e.source_locator,excerpt:e.excerpt,confidence:e.confidence})))
  const result=await provider.generateProject({repository:JSON.stringify({name:repoRow.name,fullName:repoRow.full_name,description:repoRow.description,homepage:repoRow.homepage,defaultBranch:repoRow.default_branch,language:repoRow.language,topics:repoRow.topics}),analysis:JSON.stringify(analysis),evidence:rawEvidence})
  const validated=validateAIProject(result.output,new Set((evidence ?? []).map((e)=>e.id)))
  const quality=Math.min(validated.qualityScore,Number(analysis.quality_score ?? 0));
  const updates:Record<string,unknown>={quality_score:quality,confidence_score:Math.round(validated.confidence*100),updated_at:new Date().toISOString()}
  if(!(await hasOverride(projectId,'title'))) {updates.title=validated.title;updates.title_source='ai'}
  if(!(await hasOverride(projectId,'short_description'))) {updates.short_description=validated.shortDescription;updates.description_source='ai'}
  if(!(await hasOverride(projectId,'long_description'))) {updates.long_description=validated.longDescription;updates.description_source='ai'}
  if(!(await hasOverride(projectId,'category'))) {updates.category=validated.category}
  if(!(await hasOverride(projectId,'year'))) {updates.year=validated.year}
  if(!(await hasOverride(projectId,'project_type'))) {updates.project_type=validated.projectType}
  if(!(await hasOverride(projectId,'presentation_type'))) {updates.presentation_type=validated.presentationType;updates.presentation_type_source='ai'}
  if(!(await hasOverride(projectId,'featured'))) {updates.featured=validated.featured;updates.featured_source='ai'}
  {const {error}=await db.from('projects').update(updates).eq('id',projectId);if(error)throw error}
  if(!(await hasOverride(projectId,'technologies'))){
    const {data:detected}=await db.from('project_technologies').select('name,confidence,sort_order').eq('project_id',projectId).eq('source','detected').order('sort_order',{ascending:true})
    {const {error}=await db.from('project_technologies').delete().eq('project_id',projectId);if(error)throw error}
    for(const [i,t] of (detected ?? []).entries()){const {error}=await db.from('project_technologies').insert({project_id:projectId,name:t.name,source:'detected',confidence:t.confidence,sort_order:i});if(error)throw error}
  }
  if(!(await hasOverride(projectId,'features'))){
    const {data:detected}=await db.from('project_features').select('name,confidence,evidence_id,sort_order').eq('project_id',projectId).eq('source','detected').order('sort_order',{ascending:true})
    {const {error}=await db.from('project_features').delete().eq('project_id',projectId);if(error)throw error}
    for(const [i,f] of (detected ?? []).entries()){const {error}=await db.from('project_features').insert({project_id:projectId,name:f.name,source:'detected',confidence:f.confidence,evidence_id:f.evidence_id,sort_order:i});if(error)throw error}
  }
  {const {error}=await db.from('ai_generations').insert({project_id:projectId,provider:provider.name,model:provider.model,input_fingerprint:sha256(JSON.stringify({analysisId:analysis.id,evidenceIds:(evidence??[]).map((e)=>e.id)})),output:validated,accepted:true,latency_ms:result.latencyMs,token_usage:result.tokenUsage ?? null});if(error)throw error}
  await audit('ai.project.generated','project',projectId,{provider:provider.name,model:provider.model,confidence:validated.confidence},null)
}

export async function runScreenshotCapture(payload:Record<string,unknown>) {
  const projectId=String(payload.projectId)
  const repositoryId=String(payload.repositoryId)
  const db=createAdminClient()
  const {data:project,error:projectError}=await db.from('projects').select('id,live_url,github_repository_id').eq('id',projectId).single()
  if(projectError)throw projectError
  if(!project.live_url)return
  const repoRow=await getRepoRow(repositoryId)
  const worker=process.env.SCREENSHOT_WORKER_URL
  const workerSecret=process.env.SCREENSHOT_WORKER_SECRET
  if(!worker||!workerSecret)throw new Error('SCREENSHOT_WORKER_NOT_CONFIGURED')
  const viewports=[{width:1440,height:900,label:'desktop'},{width:390,height:844,label:'mobile'}]
  const runViewport=async(viewport:{width:number;height:number;label:string})=>{
    const fingerprint=sha256(JSON.stringify({repoSha:repoRow.latest_commit_sha,demo:project.live_url,route:'/',viewport:{width:viewport.width,height:viewport.height}}))
    const {data:existing,error:lookupError}=await db.from('project_screenshots').select('*').eq('fingerprint',fingerprint).maybeSingle()
    if(lookupError)throw lookupError
    if(existing?.status==='ready')return existing.id as string
    const {data:shot,error:shotError}=await db.from('project_screenshots').upsert({project_id:projectId,fingerprint,viewport_width:viewport.width,viewport_height:viewport.height,route:'/',url:project.live_url,status:'capturing',metadata:{label:viewport.label}},{onConflict:'fingerprint'}).select('*').single()
    if(shotError)throw shotError
    if(!shot)throw new Error('SCREENSHOT_ROW_CREATE_FAILED')
    try{
      const response=await fetch(`${worker.replace(/\/$/,'')}/v1/screenshot`,{method:'POST',headers:{'Content-Type':'application/json','x-worker-secret':workerSecret},body:JSON.stringify({url:project.live_url,route:'/',viewport:{width:viewport.width,height:viewport.height}}),signal:AbortSignal.timeout(55000)})
      const data=await response.json() as {ok?:boolean;imageBase64?:string;mimeType?:string;qualityScore?:number;metadata?:Record<string,unknown>;error?:string}
      if(!response.ok||!data.ok||!data.imageBase64)throw new Error(data.error ?? `WORKER_HTTP_${response.status}`)
      const buffer=Buffer.from(data.imageBase64,'base64')
      if(buffer.length<1000)throw new Error('WORKER_IMAGE_TOO_SMALL')
      const storagePath=`screenshots/${projectId}/${fingerprint}.png`
      const upload=await db.storage.from('portfolio-media').upload(storagePath,buffer,{contentType:data.mimeType ?? 'image/png',upsert:true,cacheControl:'31536000'})
      if(upload.error)throw upload.error
      const accepted=(data.qualityScore ?? 0)>=70
      const {error:updateError}=await db.from('project_screenshots').update({status:accepted?'ready':'rejected',quality_score:data.qualityScore ?? null,storage_path:storagePath,failure_reason:accepted?null:'Screenshot quality gate rejected capture',metadata:data.metadata ?? {},captured_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',shot.id)
      if(updateError)throw updateError
      return accepted?shot.id:null
    }catch(error){
      const failure=error instanceof Error?error.message:String(error)
      const {error:updateError}=await db.from('project_screenshots').update({status:'failed',failure_reason:failure.slice(0,500),updated_at:new Date().toISOString()}).eq('id',shot.id)
      if(updateError)throw updateError
      return null
    }
  }
  const results=await Promise.all(viewports.map(runViewport))
  const readyIds=results.filter((id):id is string=>Boolean(id))
  if(readyIds.length&&await isAIConfigured())await enqueueJob('ai_screenshot_analysis',{projectId,screenshotIds:readyIds},`vision:${projectId}:${readyIds.join(',')}`)
  const {data:best,error:bestError}=await db.from('project_screenshots').select('id,quality_score').eq('project_id',projectId).eq('status','ready').order('quality_score',{ascending:false}).limit(1).maybeSingle()
  if(bestError)throw bestError
  if(best){const {error}=await db.from('projects').update({hero_screenshot_id:best.id,updated_at:new Date().toISOString()}).eq('id',projectId);if(error)throw error}
  await audit('screenshots.captured','project',projectId,{count:readyIds.length})
}

export async function runAIScreenshotAnalysis(payload:Record<string,unknown>) {
  const projectId=String(payload.projectId); const ids=Array.isArray(payload.screenshotIds)?payload.screenshotIds.map(String):[]; const db=createAdminClient()
  const {data:shots,error}=await db.from('project_screenshots').select('id,storage_path,viewport_width,viewport_height,quality_score').eq('project_id',projectId).eq('status','ready').in('id',ids).limit(6); if(error)throw error
  if(!shots?.length)return
  const validShots:typeof shots=[]
  const imagePayload=[] as Array<{mimeType:string;base64:string}>
  for(const shot of shots){
    if(!shot.storage_path)continue
    const {data,error:downloadError}=await db.storage.from('portfolio-media').download(shot.storage_path)
    if(downloadError||!data)continue
    validShots.push(shot)
    imagePayload.push({mimeType:'image/png',base64:Buffer.from(await data.arrayBuffer()).toString('base64')})
  }
  if(!imagePayload.length)return
  const provider=await getAIProvider(); const prompt=`Rank the supplied screenshots for use as a premium developer portfolio hero/gallery. Screenshot IDs correspond exactly to image order: ${validShots.map((s)=>s.id).join(', ')}. Score visual quality, composition, typography, relevance and visible completeness. Do not infer product facts.`
  const result=await provider.analyzeImage({prompt,images:imagePayload})
  const vision=validateAIVision(result.output,new Set(validShots.map((s)=>s.id)))
  for(const rank of vision.rankings){const {error:updateError}=await db.from('project_screenshots').update({quality_score:rank.score,metadata:{visionReason:rank.reason,visionRecommended:rank.recommended},updated_at:new Date().toISOString()}).eq('id',rank.screenshotId);if(updateError)throw updateError}
  const best=[...vision.rankings].sort((a,b)=>b.score-a.score)[0]
  if(best){const {error:updateError}=await db.from('projects').update({hero_screenshot_id:best.screenshotId,updated_at:new Date().toISOString()}).eq('id',projectId);if(updateError)throw updateError}
  await audit('screenshots.ranked','project',projectId,{provider:provider.name,count:vision.rankings.length})
}
