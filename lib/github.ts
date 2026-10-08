import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/security'

const API = 'https://api.github.com'
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
  'User-Agent': 'KirlousWaelPortfolio/3.0',
}

export async function getConnectedUserIdByLogin(login: string) {
  const db = createAdminClient()
  const { data, error } = await db.from('github_connections').select('user_id').eq('github_login', login).maybeSingle()
  if (error) throw error
  return data?.user_id ?? null
}

async function getTokenForUser(userId: string) {
  const db = createAdminClient()
  const { data, error } = await db.from('github_connections').select('access_token_encrypted').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('GITHUB_NOT_CONNECTED')
  return decryptSecret(data.access_token_encrypted)
}

async function githubFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { ...headers, Authorization: `Bearer ${token}`, ...(init.headers ?? {}) }, cache: 'no-store' })
  const text = await response.text()
  if (!response.ok) throw new Error(`GITHUB_${response.status}:${text.slice(0, 240)}`)
  return text ? JSON.parse(text) as T : ({} as T)
}

export type GithubRepo = {
  id: number; name: string; full_name: string; private: boolean; owner: { login: string };
  html_url: string; homepage: string | null; description: string | null; language: string | null;
  topics?: string[]; default_branch: string; stargazers_count: number; forks_count: number;
  open_issues_count: number; pushed_at: string | null; archived: boolean; is_template?: boolean;
}

export async function getGithubUser(userId: string) {
  return githubFetch<{ id:number; login:string }>(`/user`, await getTokenForUser(userId))
}

export async function listGithubRepos(userId: string) {
  return githubFetch<GithubRepo[]>(`/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator`, await getTokenForUser(userId))
}

export async function getGithubRepo(userId: string, owner: string, repo: string) {
  return githubFetch<GithubRepo>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, await getTokenForUser(userId))
}

export async function getGithubReadme(userId: string, owner: string, repo: string) {
  const data = await githubFetch<{ content?: string; encoding?: string }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`, await getTokenForUser(userId))
  return data.content ? Buffer.from(data.content, data.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8') : ''
}

export async function getGithubPackageJson(userId: string, owner: string, repo: string) {
  try { return JSON.parse(await getGithubFile(userId, owner, repo, 'package.json')) } catch { return null }
}

export async function getLatestCommitSha(userId:string, owner:string, repo:string, branch:string){ const token=await getTokenForUser(userId); const data=await githubFetch<Array<{sha:string}>>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,token); return data[0]?.sha ?? null }

export type GithubTreeItem = { path:string; mode:string; type:'blob'|'tree'; sha:string; size?:number; url:string }
export async function getGithubTree(userId: string, owner: string, repo: string, branch: string) {
  const token = await getTokenForUser(userId)
  const data = await githubFetch<{ tree: GithubTreeItem[]; truncated:boolean }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token)
  return data
}

export async function getGithubFile(userId: string, owner: string, repo: string, path: string, ref?: string) {
  const token = await getTokenForUser(userId)
  const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const data = await githubFetch<{ content?:string; encoding?:string }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}${suffix}`, token)
  if (!data.content) return ''
  return Buffer.from(data.content.replace(/\n/g, ''), data.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8')
}

export async function createGithubWebhook(userId: string, owner: string, repo: string, callbackUrl: string) {
  return githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`, await getTokenForUser(userId), {
    method: 'POST',
    body: JSON.stringify({ name: 'web', active: true, events: ['push'], config: { url: callbackUrl, content_type: 'json', insecure_ssl: '0', secret: process.env.GITHUB_WEBHOOK_SECRET ?? '' } }),
    headers: { 'Content-Type': 'application/json' },
  })
}
