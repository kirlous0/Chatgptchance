import { requireOwner } from '@/lib/auth'
import { ControlShell } from '@/components/control/control-shell'
export const dynamic='force-dynamic'
export const metadata={robots:{index:false,follow:false},title:'Control Center'}
export default async function ProtectedLayout({children}:{children:React.ReactNode}){await requireOwner();return <ControlShell>{children}</ControlShell>}
