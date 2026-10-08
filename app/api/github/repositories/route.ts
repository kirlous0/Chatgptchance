import { assertOwnerApi } from '@/lib/auth'
import { listGithubRepos } from '@/lib/github'
import { ok, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function GET(){try{const user=await assertOwnerApi();const repos=await listGithubRepos(user.id);return ok(repos)}catch(e){return routeError(e)}}
