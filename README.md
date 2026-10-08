# KIRLOUS WAEL — Autonomous AI-Powered Developer Portfolio

A production-oriented portfolio engine built from zero: a premium public portfolio backed by a private owner Control Center. GitHub evidence flows through deterministic repository analysis, optional AI enrichment, live-demo validation, screenshot capture, visual ranking, review, and explicit publishing.

## Architecture

- **Web app:** Next.js App Router + React + TypeScript + Tailwind CSS + Framer Motion.
- **Database/Auth/Storage:** Supabase Postgres, Supabase Auth, Supabase Storage, Row Level Security.
- **GitHub:** OAuth, REST API, repository import, webhook registration and HMAC validation.
- **AI:** replaceable `AIProvider` abstraction with Gemini and OpenRouter adapters; structured JSON validation with Zod. The Control Center can select provider/model; environment keys remain server-only.
- **Jobs:** DB-backed idempotent job queue with leases, bounded retries and exponential backoff; Vercel cron claims one job per invocation.
- **Screenshots:** independent Node + Playwright/Chromium worker; Vercel never launches Chromium itself.
- **Security:** signed OAuth state, encrypted GitHub token storage, SSRF validation, redirect validation, webhook signatures, owner-only APIs, upload limits and repository-content prompt-injection boundaries.

## Public routes

`/` · `/work` · `/work/[slug]` · `/about` · `/contact` · `/sitemap.xml` · `/robots.txt`

The public UI is intentionally evidence-first. No project is seeded as authoritative content. Projects appear only after a real repository import and explicit publication.

## Control Center

`/control-center` · `/control-center/projects` · `/control-center/repositories` · `/control-center/ai` · `/control-center/screenshots` · `/control-center/sync` · `/control-center/integrations` · `/control-center/settings` · `/control-center/audit-logs`

Administration uses Supabase email/password authentication plus an owner role stored in `profiles`. There is no public admin registration screen.

## Setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_initial.sql` in the Supabase SQL editor or through your migration workflow.
3. Create an Auth user for the owner in Supabase Auth. Then assign that exact user UUID the `owner` role:

```sql
insert into public.profiles (id, role)
values ('YOUR_AUTH_USER_UUID', 'owner')
on conflict (id) do update set role = 'owner';
```

4. Copy `.env.example` to `.env.local` and fill in the server/public values.
5. Configure the GitHub OAuth App callback as `GITHUB_OAUTH_REDIRECT_URI`.
6. Deploy the screenshot worker separately and point `SCREENSHOT_WORKER_URL` to it. Keep `SCREENSHOT_WORKER_SECRET` identical between the app and worker.
7. Start the web app with `npm run dev`. Start the worker with `npm run worker:dev` from the repository root, or deploy the `screenshot-worker` directory independently.

## GitHub OAuth

Required server variables:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_OAUTH_REDIRECT_URI`
- `GITHUB_WEBHOOK_SECRET`

The owner clicks **Connect GitHub** from the Control Center. The access token is encrypted before database persistence and never returned to the browser.

## AI

Choose `AI_PROVIDER=gemini` or `AI_PROVIDER=openrouter`.

Configure either:

- Gemini: `GEMINI_API_KEY` + optional `AI_MODEL`
- OpenRouter: `OPENROUTER_API_KEY` + `OPENROUTER_MODEL`

The AI receives structured evidence as untrusted data. The validator drops unknown technologies/features and rejects claims that cite evidence IDs not present in the database.

## Screenshot worker

The worker is intentionally separate because Chromium is not a reliable fit for standard Vercel request execution. It exposes only:

- `GET /health`
- `POST /v1/screenshot` protected by `x-worker-secret`

The worker validates the initial URL, redirect target and browser requests against HTTP(S)-only and private-network rules, enforces viewport allow-lists, limits request bodies, waits for fonts/images, evaluates error states, and returns a PNG plus quality metadata.

## Jobs

Job types:

`repository_analysis`, `live_url_check`, `ai_project_generation`, `screenshot_capture`, `ai_screenshot_analysis`, `github_sync`.

Each job has an idempotency key, attempts, bounded retries, lease locking and observable failure state. Vercel cron calls `/api/jobs/process` with `Authorization: Bearer $CRON_SECRET`.

## Storage

`portfolio-media` and `portfolio-private` are private buckets. Published pages receive short-lived signed URLs only for media attached to published projects, so unpublished assets are not publicly addressable. Large media does not live in PostgreSQL.

## Manual overrides

The Control Center records override values in `project_overrides` and updates the corresponding project value. AI regeneration checks these override records before changing fields. Technologies/features are also protected from AI regeneration once manually overridden.

## Security notes

Repository READMEs, source files, package metadata, external URLs, webhook payloads, uploaded files and AI outputs are all treated as untrusted inputs. React output is rendered without unsafe HTML injection. Webhook HMAC is checked against the raw request body. Admin pages are owner-gated and marked `noindex`.

## Verification status

### Verified by source-level implementation

- single Supabase schema
- single server authorization path
- signed GitHub OAuth state
- encrypted GitHub tokens
- webhook HMAC verification + delivery dedupe
- SSRF guard + redirect validation
- deterministic repository analyzer
- structured AI provider abstraction
- DB-backed job queue + leasing/retry logic
- manual override persistence model
- Playwright worker endpoint + quality gate
- public SEO routes
- responsive public and Control Center UI structure

### Verification performed in this build environment

- TypeScript parser scan: 0 syntax errors across all `.ts`/`.tsx` files.
- JavaScript/MJS syntax scan: passed.
- Source integrity scan: passed.
- The full npm dependency install could not complete in the build environment, so `npm test`, `npm run lint`, `npm run typecheck` and `npm run build` could not be executed here. Run them after `npm install` in a networked environment.

### Requires external credentials / services

- Supabase project + executed migration
- Supabase Auth owner user
- GitHub OAuth App + webhook secret
- Gemini or OpenRouter API key
- externally deployed screenshot worker
- Vercel cron in production

### Production validation still required

GitHub OAuth, live GitHub API calls, webhook delivery, AI provider calls, Chromium capture, Supabase RLS behavior and Vercel/Supabase deployment behavior require real credentials and a deployed environment; this source bundle does not pretend those external systems were verified without access to your credentials.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run worker:typecheck
npm run worker:dev
```

## Important files

- `supabase/migrations/0001_initial.sql` — authoritative database schema + RLS + job claim function
- `lib/auth.ts` — owner authorization
- `lib/github.ts` — server-side GitHub integration
- `lib/analysis/repository.ts` — deterministic evidence gathering/scoring
- `lib/ai/providers.ts` — Gemini/OpenRouter abstraction
- `lib/ai/validate.ts` — anti-hallucination validation
- `lib/pipeline.ts` — automation pipeline
- `lib/job-runner.ts` — DB job execution
- `lib/ssrf.ts` — SSRF protection
- `components/site/project-renderer.tsx` — 7-style public presentation engine
- `components/control/project-editor.tsx` — review/override surface
- `screenshot-worker/src/index.ts` — independent Chromium worker
