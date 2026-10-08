import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, isOwner } from '@/lib/auth'
import { encryptSecret, verifyOAuthState } from '@/lib/security'
import { audit } from '@/lib/audit'

export const runtime='nodejs'
export async function GET(request:NextRequest){
 const user=await getCurrentUser(); if(!user)return NextResponse.redirect(new URL('/control-center/login?error=auth',request.url))
 const code=request.nextUrl.searchParams.get('code'); const state=request.nextUrl.searchParams.get('state'); const cookie=request.cookies.get('github_oauth_state')?.value
 const nonce=cookie?verifyOAuthState(cookie,user.id):null
 if(!code||!state||!nonce||nonce!==state||!(await isOwner(user.id)))return NextResponse.redirect(new URL('/control-center/integrations?error=invalid_state',request.url))
 const clientId=process.env.GITHUB_CLIENT_ID; const clientSecret=process.env.GITHUB_CLIENT_SECRET; const redirectUri=process.env.GITHUB_OAUTH_REDIRECT_URI
 if(!clientId||!clientSecret||!redirectUri)return NextResponse.redirect(new URL('/control-center/integrations?error=not_configured',request.url))
 const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,redirect_uri:redirectUri})})
 const tokenData=await tokenResponse.json() as {access_token?:string,scope?:string,error?:string}; if(!tokenResponse.ok||!tokenData.access_token)throw new Error(`GITHUB_TOKEN_EXCHANGE_FAILED:${tokenData.error??tokenResponse.status}`)
 const profileResponse=await fetch('https://api.github.com/user',{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${tokenData.access_token}`,'X-GitHub-Api-Version':'2026-03-10','User-Agent':'KirlousWaelPortfolio/3.0'}})
 const profile=await profileResponse.json() as {id:number,login:string}; if(!profileResponse.ok)throw new Error('GITHUB_PROFILE_FAILED')
 const db=createAdminClient(); const {error}=await db.from('github_connections').upsert({user_id:user.id,github_user_id:profile.id,github_login:profile.login,access_token_encrypted:encryptSecret(tokenData.access_token),scopes:(tokenData.scope??'').split(',').filter(Boolean),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error
 await db.from('integration_status').upsert({integration:'github',state:'configured',message:`Connected as ${profile.login}`,metadata:{githubLogin:profile.login},checked_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:'integration'})
 await audit('github.connected','github_connection',undefined,{githubLogin:profile.login},user.id)
 const response=NextResponse.redirect(new URL('/control-center/repositories',request.url)); response.cookies.delete('github_oauth_state'); return response
}
