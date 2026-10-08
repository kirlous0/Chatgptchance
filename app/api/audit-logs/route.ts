import { assertOwnerApi } from '@/lib/auth'
import { listAuditLogs } from '@/lib/admin-data'
import { ok, routeError } from '@/lib/api'
export const runtime='nodejs'
export async function GET(){try{await assertOwnerApi();return ok(await listAuditLogs())}catch(e){return routeError(e)}}
