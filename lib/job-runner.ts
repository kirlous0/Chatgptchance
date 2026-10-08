import { claimNextJob, completeJob, failJob, type JobRecord } from '@/lib/jobs'
import { runAIScreenshotAnalysis, runAIProjectGeneration, runLiveUrlCheck, runRepositoryAnalysis, runScreenshotCapture } from '@/lib/pipeline'
import { logError, logEvent } from '@/lib/logger'

async function dispatch(job:JobRecord){
  switch(job.type){
    case 'repository_analysis': return runRepositoryAnalysis(job.payload)
    case 'live_url_check': return runLiveUrlCheck(job.payload)
    case 'ai_project_generation': return runAIProjectGeneration(job.payload)
    case 'screenshot_capture': return runScreenshotCapture(job.payload)
    case 'ai_screenshot_analysis': return runAIScreenshotAnalysis(job.payload)
    case 'github_sync': return runRepositoryAnalysis(job.payload)
    default: throw new Error('UNKNOWN_JOB_TYPE')
  }
}

export async function processOneJob(workerName='vercel-cron'){
  const job=await claimNextJob(workerName)
  if(!job) return null
  try{ logEvent('job.started',{jobId:job.id,type:job.type,attempt:job.attempts}); await dispatch(job); await completeJob(job.id); logEvent('job.completed',{jobId:job.id,type:job.type}); return job }
  catch(error){logError('job.error',error,{jobId:job.id,type:job.type}); await failJob(job,error instanceof Error?error.message:String(error)); return job}
}
