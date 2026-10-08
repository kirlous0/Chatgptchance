'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Activity, Boxes, Github, Images, LayoutDashboard, LogOut, Menu, Network, Settings, Sparkles, X, ScrollText } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const items = [
  ['/control-center','Dashboard',LayoutDashboard],['/control-center/projects','Projects',Boxes],['/control-center/repositories','Repositories',Github],['/control-center/ai','AI',Sparkles],['/control-center/screenshots','Screenshots',Images],['/control-center/sync','Sync',Activity],['/control-center/integrations','Integrations',Network],['/control-center/settings','Settings',Settings],['/control-center/audit-logs','Audit Logs',ScrollText],
] as const

export function ControlShell({children}:{children:React.ReactNode}) {
  const path = usePathname(); const router = useRouter(); const [mobile,setMobile] = useState(false)
  const signOut = async () => { await createBrowserSupabaseClient().auth.signOut(); router.replace('/control-center/login') }
  return <div className="control-grid min-h-screen bg-[#0b0b0a] text-[#f2f1ed]">
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/10 bg-[#0b0b0a]/96 px-5 py-5 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${mobile?'translate-x-0':'-translate-x-full'}`}>
        <div className="flex items-start justify-between"><Link href="/control-center" className="focus-ring"><span className="block text-[11px] font-semibold uppercase tracking-[.18em]">KIRLOUS / CONTROL</span><span className="mt-1 block mono text-[8px] uppercase tracking-[.14em] text-white/25">PRIVATE PRODUCT OPERATING SYSTEM</span></Link><button className="focus-ring lg:hidden" onClick={()=>setMobile(false)} aria-label="Close navigation"><X size={18}/></button></div>
        <div className="mt-9 border-y border-white/10 py-4"><p className="micro">OWNER SPACE</p><p className="mt-2 text-xs text-white/45">Evidence · Automation · Publishing</p></div>
        <nav className="mt-6 space-y-1" aria-label="Control Center navigation">{items.map(([href,label,Icon])=>{const active=path===href || (href!='/control-center' && path.startsWith(`${href}/`)); return <Link key={href} href={href} onClick={()=>setMobile(false)} data-active={active} className="control-nav-item focus-ring flex items-center gap-3 border px-3 py-3 text-[11px] uppercase tracking-[.12em] transition" style={{borderColor:active?'rgba(255,255,255,.20)':'transparent',background:active?'rgba(255,255,255,.045)':'transparent',color:active?'#fff':'rgba(255,255,255,.45)'}}><Icon size={15}/>{label}</Link>})}</nav>
        <div className="mt-auto border-t border-white/10 pt-5"><div className="mb-4 flex items-center justify-between text-[9px] uppercase tracking-[.14em] text-white/25"><span>v3.0</span><span className="inline-flex items-center gap-2"><i className="status-dot text-white/35"/> owner-only</span></div><button onClick={signOut} className="focus-ring flex w-full items-center gap-3 text-[11px] uppercase tracking-[.12em] text-white/40 hover:text-white"><LogOut size={15}/> Sign out</button></div>
      </aside>
      {mobile && <button aria-label="Close menu" onClick={()=>setMobile(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden"/>}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-white/10 bg-[#0b0b0acc] px-5 backdrop-blur-xl lg:px-8"><button className="focus-ring lg:hidden" onClick={()=>setMobile(true)} aria-label="Open navigation"><Menu size={18}/></button><div className="hidden md:block"><p className="micro">CONTROL CENTER</p><p className="mt-1 mono text-[8px] uppercase tracking-[.13em] text-white/22">Private / Owner only</p></div><div className="text-right"><span className="mono text-[9px] uppercase tracking-[.14em] text-white/22">PORTFOLIO ENGINE / 03</span><span className="ml-3 hidden text-[9px] uppercase tracking-[.14em] text-white/38 md:inline">{path.replace('/control-center','').replaceAll('/',' / ') || ' / dashboard'}</span></div></header>
        <main className="px-5 py-8 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  </div>
}
