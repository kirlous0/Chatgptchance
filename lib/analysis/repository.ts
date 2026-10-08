import { sha256 } from '@/lib/security'
import type { GithubRepo, GithubTreeItem } from '@/lib/github'

export type Evidence = {
  key: string
  sourceKind: 'readme'|'package_json'|'source_file'|'tree'|'github_metadata'|'live_demo'|'deployment_metadata'|'screenshot'
  locator: string
  excerpt?: string
  confidence: number
  trusted: boolean
}

export const KNOWN_TECH = [
  ['next','Next.js'], ['react','React'], ['typescript','TypeScript'], ['tailwindcss','Tailwind CSS'],
  ['framer-motion','Framer Motion'], ['chart.js','Chart.js'], ['zod','Zod'], ['supabase-js','Supabase'],
  ['firebase','Firebase'], ['vite','Vite'], ['express','Express'], ['prisma','Prisma'], ['drizzle-orm','Drizzle ORM'],
  ['playwright','Playwright'], ['three','Three.js'], ['gsap','GSAP'], ['lucide-react','Lucide'],
] as const

const FEATURE_PATTERNS = [
  { name: 'Responsive interface', patterns: [/@media/i, /viewport/i, /responsive/i] },
  { name: 'Animations / motion', patterns: [/framer-motion/i, /motion\./i, /gsap/i, /animate/i] },
  { name: 'Authentication', patterns: [/auth/i, /signIn/i, /sign-up/i, /login/i] },
  { name: 'Charts / data visualization', patterns: [/chart\.js/i, /recharts/i, /plotly/i, /highcharts/i] },
  { name: 'Media playback', patterns: [/HTML5 Video/i, /video/i, /audio/i, /hls/i] },
  { name: 'Reservations / booking', patterns: [/reservation/i, /booking/i, /reserve/i] },
  { name: 'Gallery / image experience', patterns: [/gallery/i, /lightbox/i, /image/i, /photos/i] },
  { name: 'SEO metadata', patterns: [/metadata/i, /generateMetadata/i, /sitemap/i, /robots/i] },
  { name: 'API integration', patterns: [/fetch\(/i, /axios/i, /api\//i] },
]

function excerptAround(text: string, regex: RegExp) {
  const match = regex.exec(text)
  if (!match || match.index === undefined) return text.slice(0, 180)
  const start = Math.max(0, match.index - 90)
  return text.slice(start, Math.min(text.length, match.index + 160)).replace(/\s+/g, ' ').trim()
}

export function analyzeRepository(repo: GithubRepo, readme: string, packageJson: Record<string, unknown> | null, tree: GithubTreeItem[], sourceSamples: Array<{path:string;content:string}>) {
  const evidence: Evidence[] = [
    { key: 'github:metadata', sourceKind: 'github_metadata', locator: repo.html_url, excerpt: `${repo.full_name} ${repo.description ?? ''}`.trim(), confidence: 1, trusted: true },
  ]
  if (readme) evidence.push({ key: 'readme:root', sourceKind: 'readme', locator: 'README.md', excerpt: readme.slice(0, 1000), confidence: 0.96, trusted: true })
  if (packageJson) evidence.push({ key: 'package:root', sourceKind: 'package_json', locator: 'package.json', excerpt: JSON.stringify({name:packageJson.name,description:packageJson.description,dependencies:packageJson.dependencies,devDependencies:packageJson.devDependencies}).slice(0, 5000), confidence: 0.99, trusted: true })

  const depBlob = packageJson ? JSON.stringify({dependencies: packageJson.dependencies ?? {}, devDependencies: packageJson.devDependencies ?? {}}) : ''
  const combined = [readme, ...sourceSamples.map((s) => s.content)].join('\n')
  const technologies = new Map<string, {confidence:number; evidenceKey:string}>()
  for (const [needle,label] of KNOWN_TECH) {
    const inPackage = depBlob.toLowerCase().includes(needle.toLowerCase())
    const inSource = combined.toLowerCase().includes(needle.toLowerCase())
    if (inPackage || inSource) technologies.set(label, { confidence: inPackage ? 0.99 : 0.82, evidenceKey: inPackage ? 'package:root' : 'readme:root' })
  }
  if (packageJson?.name && !technologies.has('TypeScript') && tree.some((x) => x.path.endsWith('.ts') || x.path.endsWith('.tsx'))) {
    technologies.set('TypeScript', { confidence: 0.9, evidenceKey: 'tree:typescript' })
    evidence.push({ key:'tree:typescript', sourceKind:'tree', locator:'repository tree', excerpt:'TypeScript source files detected in repository tree.', confidence:0.9, trusted:true })
  }

  const features: Array<{name:string;evidenceKey:string;confidence:number}> = []
  for (const feature of FEATURE_PATTERNS) {
    const pattern = feature.patterns.find((p) => p.test(combined))
    if (!pattern) continue
    const evidenceKey = `feature:${sha256(feature.name).slice(0, 12)}`
    evidence.push({ key:evidenceKey, sourceKind:'source_file', locator:sourceSamples.find((s)=>pattern.test(s.content))?.path ?? 'README.md', excerpt: excerptAround(combined, pattern), confidence:0.78, trusted:true })
    features.push({ name: feature.name, evidenceKey, confidence:0.78 })
  }

  const meaningfulFiles = tree.filter((x) => x.type === 'blob' && !/(^|\/)(node_modules|\.next|dist|build)(\/|$)/.test(x.path))
  const hasApp = meaningfulFiles.some((x) => /(^|\/)(app|src\/app|pages)(\/|$)/.test(x.path) || /(^|\/)(App|page)\.(tsx?|jsx?)$/.test(x.path))
  const hasPackage = Boolean(packageJson)
  const docs = Boolean(readme && readme.length >= 240)
  const hasAssets = meaningfulFiles.some((x) => /\.(png|jpe?g|webp|svg|gif|mp4|webm)$/.test(x.path))
  const activity = repo.pushed_at ? Math.max(0, 1 - Math.min(180, (Date.now() - Date.parse(repo.pushed_at)) / 86400000) / 180) : 0
  const deploymentCandidates: string[] = []
  if (repo.homepage) deploymentCandidates.push(repo.homepage)
  for (const match of readme.matchAll(/https?:\/\/[^\s)\]}>]+/g)) {
    const candidate = match[0].replace(/[.,;]+$/, '')
    if (!deploymentCandidates.includes(candidate)) deploymentCandidates.push(candidate)
    if (deploymentCandidates.length >= 8) break
  }
  if (deploymentCandidates.length) evidence.push({ key:'deployment:candidates', sourceKind:'deployment_metadata', locator:'repository metadata / README', excerpt:deploymentCandidates.join(' | '), confidence:0.75, trusted:true })

  const completeness = (hasPackage ? 18 : 0) + (hasApp ? 22 : 0) + (meaningfulFiles.length >= 15 ? 18 : Math.min(18, meaningfulFiles.length)) + (docs ? 12 : 0) + (hasAssets ? 8 : 0)
  const techScore = Math.min(14, technologies.size * 3)
  const deploymentScore = deploymentCandidates.length ? 8 : 0
  const activityScore = Math.round(activity * 6)
  const score = Math.max(0, Math.min(100, completeness + techScore + deploymentScore + activityScore))
  const qualification = score >= 72 && meaningfulFiles.length >= 10 ? 'publish_candidate' : score >= 45 ? 'review' : 'ignore'
  const warnings: string[] = []
  if (!docs) warnings.push('Weak or missing documentation')
  if (!hasApp) warnings.push('Application entry structure was not confidently detected')
  if (!deploymentCandidates.length) warnings.push('No deployment candidate discovered')
  if (meaningfulFiles.length < 10) warnings.push('Small repository footprint')

  return { technologies:[...technologies].map(([name,v])=>({name,confidence:v.confidence,evidenceKey:v.evidenceKey})), features, evidence, deploymentCandidates, meaningfulFiles, score, qualification, warnings, sourceStructure:{meaningfulFileCount:meaningfulFiles.length,hasApp,hasPackage,hasAssets,docs} }
}
