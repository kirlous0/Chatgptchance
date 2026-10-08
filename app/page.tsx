import Link from 'next/link'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { getPublicSettings, getPublishedProjects } from '@/lib/public-data'
import { ProjectRenderer } from '@/components/site/project-renderer'
import { Reveal } from '@/components/site/reveal'

export default async function HomePage() {
  const [settings, projects] = await Promise.all([getPublicSettings(), getPublishedProjects()])
  const get = (key: string, fallback: string) => typeof settings[key] === 'string' && settings[key] ? String(settings[key]) : fallback
  const heroTitle = get('hero_title', 'DIGITAL PRODUCT BUILDER.')
  const heroDescription = get('hero_description', 'Full-stack web developer focused on polished, high-performance digital products.')
  const intro = get('intro_statement', 'I do not just build interfaces. I build digital products.')

  return (
    <main className="relative isolate overflow-hidden">
      <div aria-hidden className="site-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] opacity-55" />
      <section className="page-shell relative flex min-h-[94vh] flex-col justify-end pb-14 pt-32 md:pb-20">
        <div aria-hidden className="hero-orbit" />
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
          <Reveal>
            <div className="section-marker"><span className="eyebrow">01 / KIRLOUS WAEL</span></div>
            <h1 className="serif mt-7 max-w-6xl text-[clamp(4rem,10.5vw,9.6rem)] leading-[.8] tracking-[-.06em]">{heroTitle}</h1>
            <p className="mt-10 max-w-xl text-base leading-7 text-white/58 md:text-lg">{heroDescription}</p>
          </Reveal>
          <Reveal className="lg:pb-2">
            <div className="flex flex-col items-start gap-4 border-l border-white/10 pl-5">
              <span className="mono text-[9px] uppercase tracking-[.14em] text-white/25">SELECTED DIGITAL WORK</span>
              <Link href="/work" className="magnetic-link focus-ring micro">Enter the work <ArrowUpRight size={15}/></Link>
              <span className="mt-4 max-w-[170px] text-[11px] leading-5 text-white/35">Interfaces, systems and product experiences — built with evidence, restraint and intent.</span>
            </div>
          </Reveal>
        </div>
        <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-5 md:mt-24">
          <div className="flex items-center gap-4"><ArrowDown size={15}/><span className="micro">SCROLL TO EXPLORE</span></div>
          <span className="mono text-[9px] uppercase tracking-[.14em] text-white/22">WEB / PRODUCT / ENGINEERING</span>
        </div>
      </section>

      <section className="page-shell py-24 md:py-36">
        <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr]">
          <span className="micro">02 / APPROACH</span>
          <Reveal>
            <p className="serif max-w-4xl text-4xl leading-[1.02] tracking-[-.035em] md:text-6xl">{intro}</p>
            <div className="mt-10 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div><p className="micro">01</p><p className="mt-3 text-xs leading-5 text-white/42">Visual systems that make interfaces feel authored.</p></div>
              <div><p className="micro">02</p><p className="mt-3 text-xs leading-5 text-white/42">Engineering decisions anchored in real project evidence.</p></div>
              <div><p className="micro">03</p><p className="mt-3 text-xs leading-5 text-white/42">Automation that removes repetitive portfolio maintenance.</p></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-10 md:py-16">
        <div className="page-shell mb-10 flex items-end justify-between gap-6">
          <div><div className="section-marker"><span className="eyebrow">03 / SELECTED WORK</span></div><h2 className="serif mt-4 text-4xl tracking-[-.03em] md:text-6xl">Built with intent.</h2></div>
          <Link href="/work" className="magnetic-link micro hidden md:inline-flex">VIEW ALL <ArrowUpRight size={15}/></Link>
        </div>
        {projects.length ? projects.slice(0, 6).map((project, i) => <ProjectRenderer key={project.id} project={project as never} index={i + 1} />) : (
          <div className="page-shell rule rule-b py-20 text-white/45"><p className="micro">NO PUBLISHED PROJECTS</p><p className="mt-4 max-w-lg text-sm leading-6">Projects appear here only after real GitHub analysis, evidence review and explicit publication from the Control Center.</p><Link href="/control-center/login" className="magnetic-link micro mt-6 focus-ring">OPEN CONTROL CENTER <ArrowUpRight size={15}/></Link></div>
        )}
      </section>

      <section className="page-shell py-28 md:py-40">
        <div className="grid gap-10 border-t border-white/10 pt-8 md:grid-cols-[.8fr_1.2fr]">
          <span className="micro">04 / PRINCIPLE</span>
          <Reveal>
            <p className="serif max-w-5xl text-4xl leading-[1] tracking-[-.04em] md:text-6xl">The design gets attention. The system earns trust.</p>
            <div className="mt-8 flex flex-wrap gap-6"><Link href="/about" className="magnetic-link focus-ring micro">READ THE APPROACH <ArrowUpRight size={15}/></Link><Link href="/contact" className="magnetic-link focus-ring micro text-white/55">START A CONVERSATION <ArrowUpRight size={15}/></Link></div>
          </Reveal>
        </div>
      </section>

      <div className="overflow-hidden border-y border-white/10 py-4">
        <div className="flex min-w-max gap-10 px-5 font-mono text-[9px] uppercase tracking-[.22em] text-white/22 md:px-8">
          {Array.from({length: 8}).map((_, i) => <span key={i}>BUILD / ANALYZE / SHIP / REPEAT</span>)}
        </div>
      </div>

      <footer className="rule"><div className="page-shell flex flex-col gap-3 py-6 text-[10px] uppercase tracking-[.14em] text-white/35 md:flex-row md:justify-between"><span>KIRLOUS WAEL</span><span>WEB / PRODUCT / ENGINEERING</span><span>© 2026</span></div></footer>
    </main>
  )
}
