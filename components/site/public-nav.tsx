'use client'

import Link from 'next/link'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Wordmark } from '@/components/site/wordmark'

const links = [['/work', 'WORK'], ['/about', 'ABOUT'], ['/contact', 'CONTACT']] as const

export function PublicNav() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  if (path.startsWith('/control-center')) return null

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b0b0acc] backdrop-blur-xl">
      <div className="page-shell flex h-[72px] items-center justify-between">
        <Wordmark />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} data-active={path === href || path.startsWith(`${href}/`)} className="nav-link micro focus-ring">
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <span className="mono text-[9px] uppercase tracking-[.14em] text-white/25">EST. / 2026</span>
          <Link href="/contact" className="focus-ring inline-flex items-center gap-2 border border-white/12 px-3 py-2 text-[10px] uppercase tracking-[.13em] hover:border-white/25">
            Start a build <ArrowUpRight size={13} />
          </Link>
        </div>
        <button className="focus-ring flex h-10 w-10 items-center justify-center md:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close navigation' : 'Open navigation'}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#0b0b0a] md:hidden">
          <div className="page-shell py-4">
            {links.map(([href, label], index) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center justify-between border-b border-white/10 py-5 text-sm tracking-[.14em] last:border-0">
                <span><span className="mono mr-4 text-[9px] text-white/25">0{index + 1}</span>{label}</span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
            <div className="pt-5 text-[9px] uppercase tracking-[.15em] text-white/25">EST. / 2026 · WEB / PRODUCT / ENGINEERING</div>
          </div>
        </div>
      )}
    </header>
  )
}
