import { NextResponse } from 'next/server'
import { assertOwnerApi } from '@/lib/auth'
import { routeError } from '@/lib/api'
import { signOAuthState, verifyState } from '@/lib/security'

export const runtime = 'nodejs'

export async function GET() {
  try {
  const owner = await assertOwnerApi()
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI
  if (!clientId || !redirectUri) throw new Error('GITHUB_OAUTH_NOT_CONFIGURED')

  const signed = signOAuthState(owner.id)
  const raw = verifyState(signed)
  if (!raw) throw new Error('GITHUB_OAUTH_STATE_FAILED')
  const nonce = JSON.parse(raw).nonce as string
  const response = NextResponse.redirect(`https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo%20read:user&state=${encodeURIComponent(nonce)}`)
  response.cookies.set('github_oauth_state', signed, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' })
  return response
  } catch (error) {
    return routeError(error)
  }
}
