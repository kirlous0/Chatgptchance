import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getPublicSettings } from '@/lib/public-data'
import { Reveal } from '@/components/site/reveal'

export const metadata = { title: 'About' }

export default async function AboutPage() {
  const settings = await getPublicSettings()
  const body = typeof settings.about_body === 'string' && settings.about_body ? settings.about_body : 'I design and engineer web experiences where visual craft and reliable software meet.'

  return (
    <main className="page-shell pt-36 pb-28 md:pb-40">
      <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
        <div><div className="section-marker"><span className="eyebrow">ABOUT / 02</span></div><p className="mono mt-5 text-[9px] uppercase tracking-[.14em] text-white/22">CRAFT + SYSTEMS</p></div>
        <Reveal><h1 className="serif max-w-5xl text-6xl leading-[.88] tracking-[-.055em] md:text-8xl">Craft first.<br/><span className="text-white/34">Systems underneath.</span></h1></Reveal>
      </div>
      <div className="mt-20 grid gap-12 border-t border-white/10 pt-8 md:grid-cols-[.7fr_1.3fr]">
        <span className="micro">PHILOSOPHY</span>
        <div className="max-w-3xl">
          <Reveal><p className="text-xl leading-8 text-white/66 md:text-2xl">{body}</p></Reveal>
          <div className="mt-14 grid gap-8 border-y border-white/10 py-7 sm:grid-cols-3">
            <div><p className="micro">01 / VISUAL</p><p className="mt-3 text-sm leading-6 text-white/55">Editorial composition, hierarchy, motion and detail without visual noise.</p></div>
            <div><p className="micro">02 / ENGINEERING</p><p className="mt-3 text-sm leading-6 text-white/55">Interfaces built on explicit data contracts, predictable states and maintainable boundaries.</p></div>
            <div><p className="micro">03 / AUTOMATION</p><p className="mt-3 text-sm leading-6 text-white/55">Less repetitive portfolio maintenance. More time spent on the actual product.</p></div>
          </div>
          <div className="mt-12 flex flex-wrap gap-7"><Link href="/work" className="magnetic-link focus-ring micro">VIEW WORK <ArrowUpRight size={15}/></Link><Link href="/contact" className="magnetic-link focus-ring micro text-white/55">CONTACT <ArrowUpRight size={15}/></Link></div>
        </div>
      </div>
    </main>
  )
}
