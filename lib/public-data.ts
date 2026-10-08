import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type MediaRow = { project_id: string; storage_path: string | null; id?: string; status?: string; sort_order?: number; alt_text?: string | null; caption?: string | null }
type TechRow = { project_id: string; name: string; sort_order: number }
type FeatureRow = { project_id: string; name: string; sort_order: number }
type ShotRow = { id: string; project_id: string; storage_path: string | null; status: string }
type GalleryRow = { project_id: string; storage_path: string; alt_text: string | null; caption: string | null; sort_order: number }

async function signedMedia(rows: MediaRow[]) {
  const paths = [...new Set(rows.map((row) => row.storage_path).filter((path): path is string => Boolean(path)))]
  if (!paths.length) return new Map<string, string>()
  try {
    const { data, error } = await createAdminClient().storage.from('portfolio-media').createSignedUrls(paths, 3600)
    if (error) throw error
    return new Map((data ?? []).flatMap((item, index) => item.signedUrl ? [[paths[index], item.signedUrl] as const] : []))
  } catch { return new Map<string, string>() }
}

export async function getPublicSettings() {
  try {
    const db = await createServerSupabaseClient()
    const { data, error } = await db.from('site_settings').select('key,value').eq('visibility','public')
    if (error) throw error
    return Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, unknown>
  } catch { return {} }
}

async function getPublicProjectBundle(projectId?: string, includeMedia = true) {
  const db = await createServerSupabaseClient()
  const projectQuery = projectId
    ? db.from('published_projects').select('*').eq('id', projectId).maybeSingle()
    : db.from('published_projects').select('*').order('featured',{ascending:false}).order('order_index',{ascending:true})
  const [projects, tech, features, screenshots, gallery] = await Promise.all([
    projectQuery,
    db.from('published_project_technologies').select('project_id,name,sort_order').order('sort_order',{ascending:true}),
    db.from('published_project_features').select('project_id,name,sort_order').order('sort_order',{ascending:true}),
    db.from('published_project_screenshots').select('id,project_id,storage_path,status').eq('status','ready'),
    db.from('published_project_gallery').select('project_id,storage_path,alt_text,caption,sort_order').order('sort_order',{ascending:true}),
  ])
  for (const result of [projects,tech,features,screenshots,gallery]) if (result.error) throw result.error
  const rows = projectId ? (projects.data ? [projects.data] : []) : (projects.data ?? [])
  const projectIds = new Set(rows.map((p) => p.id))
  const filter = <T extends {project_id:string}>(items: T[] | null) => (items ?? []).filter((item) => projectIds.has(item.project_id))
  const filteredScreenshots = includeMedia ? filter((screenshots.data ?? []) as ShotRow[]) : []
  const filteredGallery = includeMedia ? filter((gallery.data ?? []) as GalleryRow[]) : []
  const mediaMap = includeMedia ? await signedMedia([...filteredScreenshots, ...filteredGallery]) : new Map<string,string>()
  const group = <T extends {project_id:string}>(items: T[]) => {
    const map = new Map<string, T[]>()
    for (const item of items) map.set(item.project_id, [...(map.get(item.project_id) ?? []), item])
    return map
  }
  const techBy = group((tech.data ?? []) as TechRow[])
  const featuresBy = group((features.data ?? []) as FeatureRow[])
  const shotsBy = group(filteredScreenshots)
  const galleryBy = group(filteredGallery)
  return rows.map((project) => ({
    ...project,
    project_technologies: techBy.get(project.id) ?? [],
    project_features: featuresBy.get(project.id) ?? [],
    project_screenshots: (shotsBy.get(project.id) ?? []).map((item) => ({...item,public_url:item.storage_path ? mediaMap.get(item.storage_path) ?? null : null})),
    project_gallery: (galleryBy.get(project.id) ?? []).map((item) => ({...item,public_url:item.storage_path ? mediaMap.get(item.storage_path) ?? null : null})),
  }))
}

export async function getPublishedProjects(options?: { includeMedia?: boolean }) {
  try { return await getPublicProjectBundle(undefined, options?.includeMedia ?? true) } catch { return [] }
}

export async function getPublishedProject(slug:string) {
  try {
    const projects = await getPublicProjectBundle()
    return projects.find((project) => project.slug === slug) ?? null
  } catch { return null }
}
