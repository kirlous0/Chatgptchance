# KIRLOUS WAEL — Final Build Report

## 1. Architecture implemented

Next.js App Router + React + TypeScript + Tailwind CSS + Framer Motion, with Supabase Postgres/Auth/Storage, a DB-backed job queue, GitHub integration, replaceable AI providers, and a standalone Playwright/Chromium screenshot worker.

The application has one authoritative database schema and one owner authorization path. Public content is served through restricted read views rather than exposing internal project columns directly.

## 2. Pages created

Public:
- `/`
- `/work`
- `/work/[slug]`
- `/about`
- `/contact`
- `/sitemap.xml`
- `/robots.txt`

Private:
- `/control-center`
- `/control-center/projects`
- `/control-center/projects/[id]`
- `/control-center/repositories`
- `/control-center/ai`
- `/control-center/screenshots`
- `/control-center/sync`
- `/control-center/integrations`
- `/control-center/settings`
- `/control-center/audit-logs`
- `/control-center/login`

## 3. Design system / distinctive touches

- Editorial black / warm-white visual language with a restrained sand accent.
- Strong serif + grotesk + mono hierarchy.
- Scroll progress rail and subtle desktop crosshair.
- Asymmetric editorial project compositions instead of repeated cards.
- Seven project presentation modes.
- Browser preview chrome, project numbering, provenance labels, metadata rails, large visual framing, restrained hover motion.
- Mobile navigation intentionally designed rather than just collapsed.
- Control Center uses a product-like command surface with grid texture, state dots, pipeline map, active-work view, audit access, and responsive navigation.
- Reduced-motion support is built into the public motion system.

## 4. Database tables

`profiles`, `github_connections`, `github_repositories`, `repository_analysis`, `projects`, `project_technologies`, `project_features`, `project_evidence`, `project_overrides`, `project_screenshots`, `project_gallery`, `ai_generations`, `ai_provider_runs`, `jobs`, `webhook_events`, `integration_status`, `site_settings`, `audit_logs`.

Additional public read views:
- `published_projects`
- `published_project_technologies`
- `published_project_features`
- `published_project_screenshots`
- `published_project_gallery`

## 5. API routes

GitHub OAuth/connect/callback/import/repositories/webhook; projects CRUD/publish/regenerate/media; AI analysis/vision; screenshots; jobs/process/retry/cancel; settings; audit logs; integration status.

All owner-sensitive routes use server-side authorization. Validation is performed with Zod where payloads are user-controlled.

## 6. AI pipeline

Deterministic repository analysis runs before AI enrichment. Evidence IDs are carried into structured AI output. Zod validation removes unsupported technologies/features and rejects claims that cite evidence not present in the project evidence set.

AI provider abstraction supports Gemini and OpenRouter. Provider/model settings are server-side and keys remain environment-only.

## 7. GitHub integration

- Signed OAuth state bound to the owner and limited to a ten-minute lifetime.
- Encrypted token storage using AES-256-GCM derived from `SESSION_SECRET`.
- Repository metadata, README, package.json, tree, source samples and commit SHA retrieval.
- GitHub webhook signature validation plus delivery deduplication.
- Change-aware sync logic differentiates analysis/configuration changes from visual/source changes.

## 8. Screenshot pipeline

Vercel does not launch Chromium. Screenshot jobs call the independent Node/Playwright worker.

Supported captures:
- 1440×900 desktop
- 390×844 mobile
- 1024×1366 tablet

The worker validates URLs, browser subrequests and redirects against HTTP(S)-only and private-network rules, applies concurrency limits, waits for fonts/images, captures PNG output, and runs a quality gate.

Screenshot fingerprints use repository SHA, demo URL, route and viewport so unchanged captures can be reused.

## 9. Security protections

- Owner-only admin access.
- Owner-bound, signed GitHub OAuth state.
- Encrypted GitHub tokens.
- Webhook HMAC verification and delivery dedupe.
- SSRF protection for live URLs, redirects and browser subrequests.
- Input size and image signature validation for uploads.
- HTTP(S)-only external URL policy.
- No unsafe HTML rendering path.
- Public DB access is restricted through intentionally narrow published views.
- Portfolio media is stored in private Supabase buckets; published pages receive short-lived signed URLs only for published assets.
- Control Center and login are excluded from indexing.
- Internal API errors are sanitized before returning to clients.
- Repository content is treated as untrusted evidence for AI prompt-injection purposes.

## 10. Performance / UX work

- Server-side public data loading.
- `next/image` for project media.
- Minimal client-side effects.
- Controlled Framer Motion reveals with reduced-motion support.
- Signed media URLs generated only when needed.
- No unnecessary public project seeds.
- Responsive layouts for public and admin surfaces.

## 11. Tests / verification performed in this environment

PASS:
- TypeScript/TSX parser scan: 84 files, 0 parse errors.
- Targeted semantic scan for unresolved symbols/properties: 0 selected diagnostics.
- JavaScript/MJS syntax scan: PASS.
- Source integrity and legacy-schema scan: PASS.
- Security runtime smoke test: encryption round-trip, HMAC state verification, owner-bound OAuth state.
- Screenshot quality runtime smoke test: server-error rejection and healthy-page acceptance.

Not executed here:
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run worker:typecheck`

Reason: the environment could not resolve `registry.npmjs.org` while installing dependencies (`EAI_AGAIN`), so dependency-backed commands were not falsely marked as passed.

## 12. Build status

Source bundle: verified by static/source-level checks and runtime smoke tests.
Dependency-backed build: requires `npm install` in a networked environment.

## 13. External setup required

- Supabase project + migration execution.
- Supabase owner Auth user + `profiles.role = 'owner'`.
- GitHub OAuth App + webhook secret.
- Gemini or OpenRouter API key.
- Screenshot worker deployment with `WORKER_SECRET` matching `SCREENSHOT_WORKER_SECRET`.
- Vercel environment variables and cron configuration.

## 14. Known limitations

- External credentials and deployed services were not available here, so live GitHub OAuth, live webhooks, real AI calls, Chromium capture against production websites, Supabase RLS in a hosted project, and Vercel runtime behavior still require production validation.
- A deterministic repository analyzer is intentionally conservative; some legitimate frameworks/features may be classified as review instead of publish-candidate until additional evidence adapters are added.

## 15. Important files

- `supabase/migrations/0001_initial.sql`
- `lib/auth.ts`
- `lib/security.ts`
- `lib/github.ts`
- `lib/analysis/repository.ts`
- `lib/ai/providers.ts`
- `lib/ai/validate.ts`
- `lib/pipeline.ts`
- `lib/job-runner.ts`
- `lib/ssrf.ts`
- `lib/public-data.ts`
- `components/site/project-renderer.tsx`
- `components/site/public-nav.tsx`
- `components/site/site-effects.tsx`
- `components/control/control-shell.tsx`
- `components/control/project-editor.tsx`
- `screenshot-worker/src/index.ts`
- `scripts/verify-source.mjs`
- `README.md`
