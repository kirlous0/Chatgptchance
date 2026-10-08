import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getPublicSettings } from '@/lib/public-data'
import { Reveal } from '@/components/site/reveal'

export const metadata = { title: 'Contact' }

export default async function ContactPage() {
  const s = await getPublicSettings()
  const email = typeof s.email === 'string' ? s.email : ''
  const wa = typeof s.whatsapp_url === 'string' ? s.whatsapp_url : ''
  const gh = typeof s.github_url === 'string' ? s.github_url : 'https://github.com/kirlous0'
  const links = [
    email ? {label: 'Email', value: email, href: `mailto:${email}`} : null,
    wa ? {label: 'WhatsApp', value: 'Direct conversation', href: wa} : null,
    {label: 'GitHub', value: 'github.com/kirlous0', href: gh},
  ].filter(Boolean) as Array<{label:string;value:string;href:string}>

  return (
    <main className="page-shell pt-36 pb-28 md:pb-40">
      <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
        <div><div className="section-marker"><span className="eyebrow">CONTACT / 03</span></div><p className="mono mt-5 text-[9px] uppercase tracking-[.14em] text-white/22">NO FORM / JUST A CONVERSATION</p></div>
        <Reveal><h1 className="serif max-w-5xl text-6xl leading-[.88] tracking-[-.055em] md:text-8xl">Make the next thing memorable.</h1></Reveal>
      </div>
      <section className="mt-20 grid gap-12 border-t border-white/10 pt-8 md:grid-cols-[.7fr_1.3fr]">
        <span className="micro">REACH OUT</span>
        <div>
          <p className="max-w-xl text-base leading-7 text-white/48">A direct line is intentional. Share the product, interface or system you are trying to make better.</p>
          <div className="mt-10">
            {links.map((item, i) => <Link key={item.label} className="group data-row flex items-start justify-between gap-5" href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}><span><span className="micro block">0{i+1} / {item.label}</span><span className="mt-3 block text-lg">{item.value}</span></span><ArrowUpRight size={18} className="mt-1 transition group-hover:translate-x-1 group-hover:-translate-y-1"/></Link>)}
            {!links.length && <div className="border border-white/10 p-6"><p className="micro">CONTACT NOT CONFIGURED</p><p className="mt-3 text-sm leading-6 text-white/45">The owner has not enabled direct contact details yet.</p></div>}
          </div>
        </div>
      </section>
    </main>
  )
}
