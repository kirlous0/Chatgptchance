import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hmacSha256, secureCompare, sha256 } from '@/lib/security'
import { enqueueJob } from '@/lib/jobs'
import { getConnectedUserIdByLogin } from '@/lib/github'
import { logEvent } from '@/lib/logger'
import { ok, fail } from '@/lib/api'

export const runtime='nodejs'

type WebhookPayload={action?:string;repository?:{full_name?:string;owner?:{login?:string};id?:number};ref?:string;commits?:Array<{modified?:string[];added?:string[];removed?:string[]}>}

export async function POST(request:NextRequest){
  const secret=process.env.GITHUB_WEBHOOK_SECRET
  if(!secret)return fail('Webhook is not configured',503,'NOT_CONFIGURED')
  const raw=await request.text()
  const signature=request.headers.get('x-hub-signature-256') ?? ''
  const expected=`sha256=${hmacSha256(secret,raw)}`
  if(!secureCompare(expected,signature))return fail('Invalid webhook signature',401,'INVALID_SIGNATURE')
  const delivery=request.headers.get('x-github-delivery')
  const event=request.headers.get('x-github-event') ?? 'unknown'
  if(!delivery)return fail('Missing delivery id',400,'MISSING_DELIVERY')
  let payload:WebhookPayload
  try{payload=JSON.parse(raw) as WebhookPayload}catch{return fail('Invalid JSON body',400,'INVALID_JSON')}

  const db=createAdminClient()
  const {data:existing}=await db.from('webhook_events').select('id').eq('delivery_id',delivery).maybeSingle()
  if(existing)return ok({duplicate:true})
  const {error:insertError}=await db.from('webhook_events').insert({delivery_id:delivery,event_name:event,action:payload.action??null,repository_full_name:payload.repository?.full_name??null,payload_hash:sha256(raw),accepted:true})
  if(insertError)return fail('Could not persist webhook event',500,'WEBHOOK_PERSIST_FAILED')

  if(event==='push'&&payload.repository?.full_name){
    const fullName=payload.repository.full_name
    const login=payload.repository.owner?.login ?? fullName.split('/')[0]
    const userId=await getConnectedUserIdByLogin(login)
    if(userId){
      const paths=(payload.commits??[]).flatMap((c)=>[...(c.modified??[]),...(c.added??[]),...(c.removed??[])])
      const hasAnalysisChange=paths.some((p)=>/^(README\.md|package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json)$/i.test(p)||/(^|\/)(next\.config|vite\.config|vercel\.json)/i.test(p))
      const hasVisualChange=paths.some((p)=>/(^|\/)(app|src|pages|components|public)(\/|$)/i.test(p)||/\.(css|scss|sass|tsx?|jsx?|html|png|jpe?g|webp|svg|gif)$/i.test(p))
      const {data:repo}=await db.from('github_repositories').select('id,latest_commit_sha').eq('full_name',fullName).maybeSingle()
      if(repo){
        if(hasAnalysisChange)await enqueueJob('repository_analysis',{repositoryId:repo.id,userId},`webhook-analysis:${repo.id}:${delivery}`)
        else if(hasVisualChange){
          const {data:project}=await db.from('projects').select('id').eq('github_repository_id',repo.id).maybeSingle()
          if(project)await enqueueJob('screenshot_capture',{projectId:project.id,repositoryId:repo.id},`webhook-screen:${project.id}:${delivery}`)
        }
      }
    }
  }
  logEvent('github.webhook.accepted',{delivery,event})
  return ok({accepted:true})
}
