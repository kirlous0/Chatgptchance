import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ProjectMeta } from '@/components/site/project-meta'
import { Reveal } from '@/components/site/reveal'

type Project = {
  id: string
  slug: string
  title: string
  short_description: string | null
  category: string | null
  year: number | null
  presentation_type: string
  featured: boolean
  live_url: string | null
  github_url: string | null
  hero_screenshot_id: string | null
  project_technologies?: Array<{name: string; sort_order?: number}>
  project_screenshots?: Array<{id: string; storage_path: string | null; public_url?: string | null; status: string}>
}

function getHero(project: Project) {
  const ready = (project.project_screenshots ?? []).filter((s) => s.status === 'ready')
  const shot = ready.find((s) => s.id === project.hero_screenshot_id) ?? ready[0]
  return shot?.public_url ?? null
}

function Techs({project}: {project: Project}) {
  const techs = (project.project_technologies ?? []).slice(0, 6)
  if (!techs.length) return null
  return <div className="mt-7 flex flex-wrap gap-x-2 gap-y-2">{techs.map((t) => <span key={t.name} className="mono border border-white/10 px-3 py-2 text-[9px] uppercase tracking-[.12em] text-white/42">{t.name}</span>)}</div>
}

function ProjectLink({project, label = 'VIEW PROJECT'}: {project: Project; label?: string}) {
  return <Link href={`/work/${project.slug}`} className="magnetic-link focus-ring micro">{label} <ArrowUpRight size={14} className="project-arrow" /></Link>
}

function Visual({project, className = '', browser = false}: {project: Project; className?: string; browser?: boolean}) {
  const image = getHero(project)
  return (
    <div className={`project-frame ${className}`}>
      {browser && <div className="browser-bar"><i className="browser-dot"/><i className="browser-dot"/><i className="browser-dot"/><span className="browser-url">LIVE / VERIFIED DEMO</span></div>}
      {image ? <Image src={image} alt={`${project.title} project preview`} width={1440} height={900} className="project-image h-auto w-full object-cover" sizes="(max-width: 767px) 100vw, 84vw" /> : <div className="media-placeholder"><span>NO VERIFIED VISUAL YET</span></div>}
    </div>
  )
}

export function ProjectRenderer({project, index}: {project: Project; index: number}) {
  const num = String(index).padStart(2, '0')
  const title = <h3 className="serif text-5xl leading-[.88] tracking-[-.045em] md:text-7xl">{project.title}</h3>
  const desc = <p className="mt-5 max-w-xl text-sm leading-6 text-white/52">{project.short_description ?? 'Details are assembled only from verified repository evidence.'}</p>
  const header = (label?: string) => <div className="mb-7 flex items-start justify-between gap-6"><div className="flex gap-5"><span className="project-index mono">{num}</span><div><span className="project-kicker">{label ?? 'SELECTED WORK'}</span>{title}<ProjectMeta category={project.category} year={project.year} presentation={project.presentation_type}/></div></div><ProjectLink project={project} /></div>
  let content: React.ReactNode

  switch (project.presentation_type) {
    case 'SPLIT_EDITORIAL':
      content = <div className="grid gap-8 md:grid-cols-[1.08fr_.92fr] md:items-end"><Visual project={project}/><div className="pb-2">{header('SPLIT / EDITORIAL')}{desc}<Techs project={project}/></div></div>
      break
    case 'FULL_WIDTH':
      content = <><div className="mb-8 flex items-end justify-between gap-8"><div className="flex gap-5"><span className="project-index mono">{num}</span><div><span className="project-kicker">FULL / WIDTH</span>{title}<ProjectMeta category={project.category} year={project.year} presentation={project.presentation_type}/></div></div><ProjectLink project={project}/></div><Visual project={project}/></>
      break
    case 'BROWSER_PREVIEW':
      content = <>{header('BROWSER / PREVIEW')}<Visual project={project} browser /></>
      break
    case 'DEVICE_SHOWCASE':
      content = <div className="grid gap-10 md:grid-cols-[.66fr_1.34fr] md:items-center"><div>{header('DEVICE / SHOWCASE')}{desc}<Techs project={project}/></div><div className="flex justify-center border border-white/10 bg-[#11110f] p-5 md:p-10"><div className="w-[74%] overflow-hidden rounded-[28px] border border-white/15 bg-black p-1 md:w-[62%]"><Visual project={project} className="rounded-[23px]" /></div></div></div>
      break
    case 'GALLERY':
      content = <><div className="flex items-end justify-between gap-6"><div className="flex gap-5"><span className="project-index mono">{num}</span><div><span className="project-kicker">GALLERY / STORY</span>{title}<ProjectMeta category={project.category} year={project.year} presentation={project.presentation_type}/></div></div><ProjectLink project={project}/></div><div className="mt-8 grid gap-4 md:grid-cols-[1.55fr_.45fr]"><Visual project={project}/><div className="border border-white/10 p-6"><span className="micro">PRIMARY VISUAL</span>{desc}<Techs project={project}/></div></div></>
      break
    case 'CASE_STUDY':
      content = <div className="grid gap-9 md:grid-cols-[.72fr_1.28fr] md:items-end"><div>{header('CASE / STUDY')}<Techs project={project}/></div><div><div className="border-t border-white/10 pt-5">{desc}</div><div className="mt-8"><Visual project={project}/></div><div className="mt-6"><ProjectLink project={project} label="READ CASE STUDY"/></div></div></div>
      break
    default:
      content = <>{header('LARGE / EDITORIAL')}{desc}<Techs project={project}/><div className="mt-9"><Visual project={project}/></div></>
  }

  return <Reveal><article className="rule py-14 md:py-20"><div className="page-shell project-hit">{content}</div></article></Reveal>
}
