-- Kirlous Wael Portfolio Engine — single source of truth schema.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','viewer')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  github_user_id bigint not null unique,
  github_login text not null,
  access_token_encrypted text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.github_repositories (
  id uuid primary key default gen_random_uuid(),
  github_id bigint not null unique,
  owner_login text not null,
  name text not null,
  full_name text not null unique,
  default_branch text not null default 'main',
  html_url text not null,
  homepage text,
  description text,
  language text,
  topics text[] not null default '{}',
  stargazers_count integer not null default 0,
  forks_count integer not null default 0,
  open_issues_count integer not null default 0,
  pushed_at timestamptz,
  archived boolean not null default false,
  is_template boolean not null default false,
  private boolean not null default false,
  latest_commit_sha text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repository_analysis (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.github_repositories(id) on delete cascade,
  commit_sha text not null,
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  qualification text not null check (qualification in ('publish_candidate','review','ignore')),
  detected_technologies jsonb not null default '[]'::jsonb,
  detected_features jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  deployment_candidates jsonb not null default '[]'::jsonb,
  source_structure jsonb not null default '{}'::jsonb,
  warnings text[] not null default '{}',
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(repository_id, commit_sha)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  github_repository_id uuid references public.github_repositories(id) on delete set null,
  slug text not null unique,
  title text not null,
  short_description text,
  long_description text,
  category text,
  year integer,
  project_type text,
  presentation_type text not null default 'LARGE_EDITORIAL' check (presentation_type in ('LARGE_EDITORIAL','SPLIT_EDITORIAL','FULL_WIDTH','BROWSER_PREVIEW','DEVICE_SHOWCASE','GALLERY','CASE_STUDY')),
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  featured boolean not null default false,
  order_index integer not null default 0,
  live_url text,
  live_url_source text,
  live_url_status text check (live_url_status in ('unknown','reachable','unreachable','blocked','invalid')),
  github_url text,
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  title_source text not null default 'system' check (title_source in ('system','ai','manual','ai_manual')),
  description_source text not null default 'system' check (description_source in ('system','ai','manual','ai_manual')),
  presentation_type_source text not null default 'system' check (presentation_type_source in ('system','ai','manual','ai_manual')),
  featured_source text not null default 'system' check (featured_source in ('system','ai','manual','ai_manual')),
  hero_screenshot_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_technologies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  source text not null default 'system' check (source in ('system','detected','ai','manual','ai_manual')),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  sort_order integer not null default 0,
  unique(project_id, name)
);

create table if not exists public.project_features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  source text not null default 'system' check (source in ('detected','ai','manual','ai_manual')),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  evidence_id uuid,
  sort_order integer not null default 0,
  unique(project_id, name)
);

create table if not exists public.project_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  evidence_key text not null,
  source_kind text not null check (source_kind in ('readme','package_json','source_file','tree','github_metadata','live_demo','deployment_metadata','screenshot')),
  source_locator text not null,
  excerpt text,
  content_hash text,
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  trusted boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(project_id, evidence_key)
);

create table if not exists public.project_overrides (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  field_name text not null,
  value jsonb not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, field_name)
);

create table if not exists public.project_screenshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  fingerprint text not null unique,
  viewport_width integer not null,
  viewport_height integer not null,
  route text not null default '/',
  url text not null,
  storage_path text,
  status text not null default 'queued' check (status in ('queued','capturing','ready','rejected','failed')),
  quality_score integer check (quality_score between 0 and 100),
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  drop constraint if exists projects_hero_screenshot_id_fkey;
alter table public.projects
  add constraint projects_hero_screenshot_id_fkey foreign key (hero_screenshot_id) references public.project_screenshots(id) on delete set null;
alter table public.project_features
  drop constraint if exists project_features_evidence_id_fkey;
alter table public.project_features
  add constraint project_features_evidence_id_fkey foreign key (evidence_id) references public.project_evidence(id) on delete set null;

create table if not exists public.project_gallery (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null,
  model text not null,
  input_fingerprint text not null,
  output jsonb not null,
  accepted boolean not null default false,
  rejection_reason text,
  latency_ms integer,
  token_usage jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_provider_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  task text not null,
  status text not null check (status in ('started','succeeded','failed')),
  latency_ms integer,
  token_usage jsonb,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('repository_analysis','live_url_check','ai_project_generation','screenshot_capture','ai_screenshot_analysis','github_sync')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','retrying','cancelled')),
  idempotency_key text not null unique,
  attempts integer not null default 0,
  max_attempts integer not null default 4,
  available_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null unique,
  event_name text not null,
  action text,
  repository_full_name text,
  payload_hash text not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_status (
  id uuid primary key default gen_random_uuid(),
  integration text not null unique,
  state text not null check (state in ('configured','healthy','degraded','down','unconfigured','unknown')),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  visibility text not null default 'private' check (visibility in ('public','private')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_public on public.projects(status, featured, order_index);
create index if not exists idx_projects_repo on public.projects(github_repository_id);
create index if not exists idx_repo_analysis_repo on public.repository_analysis(repository_id, analyzed_at desc);
create index if not exists idx_project_evidence_project on public.project_evidence(project_id);
create index if not exists idx_screenshots_project on public.project_screenshots(project_id, status);
create index if not exists idx_jobs_runnable on public.jobs(status, available_at, created_at);
create index if not exists idx_jobs_type on public.jobs(type, status);
create index if not exists idx_webhooks_repo on public.webhook_events(repository_full_name, created_at desc);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

create or replace function public.is_owner(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'owner'
  );
$$;

create or replace function public.claim_next_job(worker_name text, lease_seconds integer default 120)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.jobs;
begin
  with candidate as (
    select id from public.jobs
    where (
      (status in ('queued','retrying') and available_at <= now())
      or (status = 'processing' and locked_until < now())
    )
    order by created_at
    for update skip locked
    limit 1
  )
  update public.jobs j
  set status = 'processing',
      attempts = j.attempts + 1,
      locked_until = now() + make_interval(secs => lease_seconds),
      started_at = coalesce(j.started_at, now()),
      updated_at = now()
  from candidate
  where j.id = candidate.id
  returning j.* into claimed;
  return claimed;
end;
$$;

revoke all on function public.claim_next_job(text, integer) from public;
revoke all on function public.is_owner(uuid) from public;
grant execute on function public.is_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.github_connections enable row level security;
alter table public.github_repositories enable row level security;
alter table public.repository_analysis enable row level security;
alter table public.projects enable row level security;
alter table public.project_technologies enable row level security;
alter table public.project_features enable row level security;
alter table public.project_evidence enable row level security;
alter table public.project_overrides enable row level security;
alter table public.project_screenshots enable row level security;
alter table public.project_gallery enable row level security;
alter table public.ai_generations enable row level security;
alter table public.ai_provider_runs enable row level security;
alter table public.jobs enable row level security;
alter table public.webhook_events enable row level security;
alter table public.integration_status enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy owner_profiles on public.profiles for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_github_connections on public.github_connections for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_github_repositories on public.github_repositories for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_repository_analysis on public.repository_analysis for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_projects on public.projects for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_project_technologies on public.project_technologies for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_project_features on public.project_features for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_project_evidence on public.project_evidence for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_project_overrides on public.project_overrides for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_project_screenshots on public.project_screenshots for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_project_gallery on public.project_gallery for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_ai_generations on public.ai_generations for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_ai_provider_runs on public.ai_provider_runs for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_jobs on public.jobs for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_webhook_events on public.webhook_events for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_integration_status on public.integration_status for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_site_settings on public.site_settings for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy owner_audit_logs on public.audit_logs for select to authenticated using (public.is_owner());

create policy public_site_settings on public.site_settings for select to anon, authenticated using (visibility = 'public');

-- Public read models intentionally expose only presentation fields.
-- Internal evidence, provenance, quality, AI and override columns stay in base tables.
create or replace view public.published_projects
with (security_barrier = true)
as
select id, slug, title, short_description, long_description, category, year, project_type, presentation_type, featured, order_index, live_url, github_url, published_at
from public.projects
where status = 'published' and published_at is not null;

create or replace view public.published_project_technologies
with (security_barrier = true)
as
select id, project_id, name, sort_order
from public.project_technologies
where exists (select 1 from public.projects p where p.id = project_id and p.status = 'published' and p.published_at is not null);

create or replace view public.published_project_features
with (security_barrier = true)
as
select id, project_id, name, sort_order
from public.project_features
where exists (select 1 from public.projects p where p.id = project_id and p.status = 'published' and p.published_at is not null);

create or replace view public.published_project_screenshots
with (security_barrier = true)
as
select id, project_id, storage_path, status
from public.project_screenshots
where status = 'ready' and exists (select 1 from public.projects p where p.id = project_id and p.status = 'published' and p.published_at is not null);

create or replace view public.published_project_gallery
with (security_barrier = true)
as
select id, project_id, storage_path, alt_text, caption, sort_order
from public.project_gallery
where exists (select 1 from public.projects p where p.id = project_id and p.status = 'published' and p.published_at is not null);

revoke all on public.published_projects from public;
revoke all on public.published_project_technologies from public;
revoke all on public.published_project_features from public;
revoke all on public.published_project_screenshots from public;
revoke all on public.published_project_gallery from public;
grant select on public.published_projects, public.published_project_technologies, public.published_project_features, public.published_project_screenshots, public.published_project_gallery to anon, authenticated;

insert into public.site_settings(key,value,visibility)
values
  ('hero_kicker', '"KIRLOUS WAEL"'::jsonb, 'public'),
  ('hero_title', '"DIGITAL PRODUCT BUILDER."'::jsonb, 'public'),
  ('hero_description', '"Full-stack web developer focused on polished, high-performance digital products."'::jsonb, 'public'),
  ('intro_statement', '"I do not just build interfaces. I build digital products."'::jsonb, 'public'),
  ('about_body', '"I design and engineer web experiences where visual craft and reliable software meet."'::jsonb, 'public'),
  ('github_url', '"https://github.com/kirlous0"'::jsonb, 'public'),
  ('email', '""'::jsonb, 'public'),
  ('whatsapp_url', '""'::jsonb, 'public'),
  ('ai_provider', '"gemini"'::jsonb, 'private'),
  ('ai_model', '"gemini-2.5-flash"'::jsonb, 'private')
on conflict (key) do nothing;

insert into storage.buckets(id,name,public)
values ('portfolio-media','portfolio-media',false), ('portfolio-private','portfolio-private',false)
on conflict (id) do nothing;


create policy portfolio_media_owner_read on storage.objects for select to authenticated using (bucket_id = 'portfolio-media' and public.is_owner());
create policy portfolio_media_owner_write on storage.objects for all to authenticated using (bucket_id = 'portfolio-media' and public.is_owner()) with check (bucket_id = 'portfolio-media' and public.is_owner());
create policy portfolio_private_owner on storage.objects for all to authenticated using (bucket_id = 'portfolio-private' and public.is_owner()) with check (bucket_id = 'portfolio-private' and public.is_owner());

grant execute on function public.claim_next_job(text, integer) to service_role;
