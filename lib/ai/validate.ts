import { AIProjectSchema, AIVisionSchema, type AIProject, type AIVision } from '@/lib/ai/schema'
import { KNOWN_TECH } from '@/lib/analysis/repository'

const ALLOWED_FEATURES = new Set(['Responsive interface','Animations / motion','Authentication','Charts / data visualization','Media playback','Reservations / booking','Gallery / image experience','SEO metadata','API integration'])
const ALLOWED_TECH = new Set(KNOWN_TECH.map(([,label]) => label))

export function validateAIProject(raw: unknown, evidenceIds: Set<string>) {
  const parsed = AIProjectSchema.parse(raw)
  const claims = parsed.claims.filter((claim) => claim.evidenceIds.every((id) => evidenceIds.has(id)))
  const technologies = parsed.technologies.filter((tech) => ALLOWED_TECH.has(tech))
  const features = parsed.features.filter((feature) => ALLOWED_FEATURES.has(feature))
  const confidence = Math.min(parsed.confidence, claims.length ? Math.max(...claims.map((c)=>c.confidence)) : 0.35)
  return { ...parsed, claims, technologies, features, confidence } as AIProject
}

export function validateAIVision(raw: unknown, screenshotIds: Set<string>) {
  const parsed = AIVisionSchema.parse(raw)
  return { rankings: parsed.rankings.filter((r)=>screenshotIds.has(r.screenshotId)) } as AIVision
}
