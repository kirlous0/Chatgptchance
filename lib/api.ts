import { NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

export function ok<T>(data:T,status=200){return NextResponse.json({ok:true,data}, {status})}
export function fail(message:string,status=400,code='BAD_REQUEST'){return NextResponse.json({ok:false,error:{code,message}}, {status})}
export function isRouteError(error:unknown){return error instanceof Error && (error.message==='UNAUTHORIZED'||error.message==='FORBIDDEN')}

const SAFE_ERRORS:Record<string,{message:string;status:number;code:string}> = {
  NOT_CONFIGURED:{message:'This integration is not configured yet.',status:503,code:'NOT_CONFIGURED'},
  PROJECT_ID_REQUIRED:{message:'A project ID is required.',status:422,code:'VALIDATION_ERROR'},
  PROJECT_HAS_NO_REPOSITORY:{message:'This project is not connected to a repository.',status:409,code:'PROJECT_HAS_NO_REPOSITORY'},
  SCREENSHOT_WORKER_NOT_CONFIGURED:{message:'The screenshot worker is not configured.',status:503,code:'NOT_CONFIGURED'},
  NO_READY_SCREENSHOTS:{message:'No ready screenshots are available for visual analysis.',status:409,code:'NO_READY_SCREENSHOTS'},
  GEMINI_API_KEY_NOT_CONFIGURED:{message:'The selected AI provider is not configured.',status:503,code:'AI_NOT_CONFIGURED'},
  OPENROUTER_API_KEY_NOT_CONFIGURED:{message:'The selected AI provider is not configured.',status:503,code:'AI_NOT_CONFIGURED'},
  UNKNOWN_JOB_ACTION:{message:'Unsupported job action.',status:422,code:'VALIDATION_ERROR'},
  UNKNOWN_JOB_TYPE:{message:'This job type is not supported by the worker.',status:422,code:'INVALID_JOB_TYPE'},
  GITHUB_OAUTH_STATE_FAILED:{message:'GitHub connection could not be initialized securely.',status:500,code:'OAUTH_STATE_ERROR'},
  GITHUB_OAUTH_NOT_CONFIGURED:{message:'GitHub OAuth is not configured yet.',status:503,code:'NOT_CONFIGURED'},
  INVALID_JOB_STATE:{message:'This job cannot be retried in its current state.',status:409,code:'INVALID_JOB_STATE'},
  UNSUPPORTED_AI_PROVIDER:{message:'The configured AI provider is not supported.',status:503,code:'AI_NOT_CONFIGURED'},
}

function sanitizeForLog(message:string){return message.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,'Bearer [REDACTED]').replace(/([?&]key=)[^&\s]+/gi,'$1[REDACTED]').slice(0,1000)}

export function routeError(error:unknown){
  if(isRouteError(error)) return fail(error instanceof Error&&error.message==='UNAUTHORIZED'?'Authentication required':'Owner access required',error instanceof Error&&error.message==='UNAUTHORIZED'?401:403,error instanceof Error?error.message:'AUTH_ERROR')
  const raw=error instanceof Error?error.message:'Unexpected error'
  const known=SAFE_ERRORS[raw]
  if(known) return fail(known.message,known.status,known.code)
  logError('api.internal_error',sanitizeForLog(raw))
  return fail('Something went wrong while processing the request.',500,'INTERNAL_ERROR')
}
