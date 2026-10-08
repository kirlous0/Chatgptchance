import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { getPublishedProject, getPublishedProjects } from '@/lib/public-data'
import { ProjectMeta } from '@/components/site/project-meta'
import { Reveal } from '@/components/site/reveal'

export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
  const {slug} = await params
  const p = await getPublishedProject(slug)
  return p ? {title:p.title,description:p.short_description ?? 'A web product by Kirlous Wael.',alternates:{canonical:`/work/${slug}`},openGraph:{title:`${p.title} — Kirlous Wael`,description:p.short_description ?? 'A web product by Kirlous Wael.'}} : {title:'Project not found'}
}

export default async function ProjectPage({params}:{params:Promise<{slug:string}>}) {
  const {slug} = await params
  const [p, all] = await Promise.all([getPublishedProject(slug), getPublishedProjects()])
  if (!p) notFound()
  const hero = p.project_screenshots?.find((s:{id:string;public_url?:string|null}) => s.id === p.hero_screenshot_id)?.public_url ?? p.project_screenshots?.find((s:{status:string;public_url?:string|null}) => s.status === 'ready')?.public_url ?? null
  const tech = [...(p.project_technologies ?? [])].sort((a:{sort_order:number},b:{sort_order:number}) => a.sort_order-b.sort_order)
  const features = [...(p.project_features ?? [])].sort((a:{sort_order:number},b:{sort_order:number}) => a.sort_order-b.sort_order)
  const gallery = [...(p.project_gallery ?? [])].sort((a:{sort_order:number},b:{sort_order:number}) => a.sort_order-b.sort_order)
  const related = all.filter((x:{id:string}) => x.id !== p.id).slice(0, 2)

  return (
    <main className="pt-32 md:pt-40">
      <header className="page-shell pb-16 md:pb-24">
        <Link href="/work" className="magnetic-link focus-ring micro"><ArrowLeft size={14}/> BACK TO WORK</Link>
        <div className="mt-12 flex flex-wrap items-end justify-between gap-8"><div><span className="eyebrow">PROJECT / {p.featured ? 'FEATURED' : 'SELECTED'}</span><ProjectMeta category={p.category} year={p.year} presentation={p.presentation_type}/></div><span className="mono text-[9px] uppercase tracking-[.14em] text-white/22">PUBLISHED WORK</span></div>
        <h1 className="serif mt-7 max-w-6xl text-6xl leading-[.86] tracking-[-.06em] md:text-9xl">{p.title}</h1>
        {p.short_description && <p className="mt-8 max-w-2xl text-base leading-7 text-white/60 md:text-lg">{p.short_description}</p>}
        <div className="mt-8 flex flex-wrap gap-5 text-[11px] uppercase tracking-[.13em]">{p.live_url && <Link className="magnetic-link focus-ring" target="_blank" rel="noreferrer" href={p.live_url}>LIVE DEMO <ArrowUpRight size={14}/></Link>}{p.github_url && <Link className="magnetic-link focus-ring text-white/52" target="_blank" rel="noreferrer" href={p.github_url}>GITHUB <ArrowUpRight size={14}/></Link>}</div>
      </header>

      {hero ? <div className="page-shell"><div className="project-frame"><Image src={hero} width={1440} height={900} alt={`${p.title} project preview`} className="h-auto w-full object-cover" priority sizes="(max-width: 767px) 100vw, 92vw"/></div></div> : <div className="page-shell"><div className="media-placeholder min-h-[360px]"><span>VERIFIED VISUAL PENDING</span></div></div>}

      <section className="page-shell py-20 md:py-28"><div className="grid gap-12 md:grid-cols-[.72fr_1.28fr]"><span className="micro">01 / OVERVIEW</span><div>{p.long_description && <Reveal><p className="max-w-3xl text-2xl leading-[1.16] tracking-[-.02em] md:text-4xl">{p.long_description}</p></Reveal>}{tech.length>0 && <div className="mt-12"><p className="micro">TECHNOLOGIES</p><div className="mt-5 grid gap-y-0 border-t border-white/10 pt-0 sm:grid-cols-2">{tech.map((t:{name:string},i:number)=><div key={t.name} className="data-row flex items-center gap-4"><span className="mono text-[10px] text-white/22">{String(i+1).padStart(2,'0')}</span><span className="text-sm">{t.name}</span></div>)}</div></div>}{features.length>0 && <div className="mt-12"><p className="micro">VERIFIED FEATURES</p><div className="mt-5">{features.map((f:{name:string})=><div key={f.name} className="data-row text-sm text-white/62">{f.name}</div>)}</div></div>}</div></div></section>

      {gallery.length>0 && <section className="page-shell pb-24 md:pb-36"><div className="rule pt-8"><p className="micro">02 / SCREENSHOT GALLERY</p><div className="mt-8 grid gap-5 md:grid-cols-2">{gallery.map((g:{storage_path:string;alt_text:string|null;caption:string|null})=>{const src=(g as {public_url?:string|null}).public_url ?? null;return src?<figure key={g.storage_path} className="project-frame"><Image src={src} width={1200} height={800} alt={g.alt_text ?? p.title} className="project-image h-auto w-full" sizes="(max-width: 767px) 100vw,50vw"/>{g.caption&&<figcaption className="border-t border-white/10 p-4 text-xs text-white/38">{g.caption}</figcaption>}</figure>:null})}</div></div></section>}

      {related.length>0 && <section className="page-shell pb-28 md:pb-40"><div className="rule pt-8"><div className="flex items-center justify-between gap-5"><p className="micro">03 / RELATED WORK</p><Link href="/work" className="magnetic-link micro focus-ring">ALL WORK <ArrowUpRight size={14}/></Link></div><div className="mt-8 grid gap-5 md:grid-cols-2">{related.map((r:{id:string;slug:string;title:string;category:string|null;year:number|null})=><Link key={r.id} href={`/work/${r.slug}`} className="group border border-white/10 p-6 transition hover:border-white/25"><div className="flex items-start justify-between gap-5"><span className="micro">{r.category ?? 'WEB PROJECT'} / {r.year ?? '—'}</span><ArrowUpRight size={16} className="transition group-hover:translate-x-1 group-hover:-translate-y-1"/></div><h2 className="serif mt-16 text-4xl leading-none tracking-[-.04em] md:text-5xl">{r.title}</h2></Link>)}</div></div></section>}
    </main>
  )
}
