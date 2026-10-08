import { assertOwnerApi } from '@/lib/auth'
import { listJobs } from '@/lib/admin-data'
import { ok, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function GET(){try{await assertOwnerApi();return ok(await listJobs())}catch(e){return routeError(e)}}
