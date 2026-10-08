import { NextRequest } from 'next/server'
import { processOneJob } from '@/lib/job-runner'
import { ok, fail, routeError } from '@/lib/api'
export const runtime='nodejs'
export const maxDuration=60
export async function GET(request:NextRequest){const secret=process.env.CRON_SECRET;if(!secret)return fail('Cron secret is not configured',503,'NOT_CONFIGURED');const auth=request.headers.get('authorization');if(auth!==`Bearer ${secret}`)return fail('Unauthorized',401,'UNAUTHORIZED');try{const job=await processOneJob('vercel-cron');return ok({processed:Boolean(job),jobId:job?.id??null})}catch(e){return routeError(e)}}
export async function POST(request:NextRequest){return GET(request)}
