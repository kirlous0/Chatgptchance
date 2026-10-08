import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const mustExist=['app/layout.tsx','proxy.ts','supabase/migrations/0001_initial.sql','lib/auth.ts','lib/github.ts','lib/pipeline.ts','lib/jobs.ts','lib/ai/providers.ts','screenshot-worker/src/index.ts','screenshot-worker/Dockerfile','README.md','.env.example']
for(const file of mustExist)if(!fs.existsSync(path.join(root,file)))throw new Error(`Missing required file: ${file}`)
const sql=fs.readFileSync(path.join(root,'supabase/migrations/0001_initial.sql'),'utf8')
for(const view of ['published_projects','published_project_technologies','published_project_features','published_project_screenshots','published_project_gallery'])if(!sql.includes(`create or replace view public.${view}`))throw new Error(`Missing public view: ${view}`)
for(const table of ['profiles','github_connections','github_repositories','repository_analysis','projects','project_technologies','project_features','project_evidence','project_overrides','project_screenshots','project_gallery','ai_generations','ai_provider_runs','jobs','webhook_events','integration_status','site_settings','audit_logs'])if(!sql.includes(`create table if not exists public.${table}`))throw new Error(`Missing table: ${table}`)
for(const forbiddenPublicPolicy of ['public_published_projects','public_project_technologies','public_project_features','public_project_screenshots','public_project_gallery','portfolio_media_read'])if(sql.includes(forbiddenPublicPolicy))throw new Error(`Broad public policy leaked: ${forbiddenPublicPolicy}`)
for(const legacy of ['pipeline_runs','project_analyses','github_tokens','sync_jobs','webhook_deliveries','screenshot_quality_logs'])if(sql.includes(legacy))throw new Error(`Legacy schema leaked: ${legacy}`)
const presentationText=fs.readFileSync(path.join(root,'components/site/project-renderer.tsx'),'utf8')+'\n'+fs.readFileSync(path.join(root,'lib/ai/schema.ts'),'utf8')
for(const text of ['LARGE_EDITORIAL','SPLIT_EDITORIAL','FULL_WIDTH','BROWSER_PREVIEW','DEVICE_SHOWCASE','GALLERY','CASE_STUDY'])if(!presentationText.includes(text))throw new Error(`Missing presentation type: ${text}`)
const all=fs.readFileSync(path.join(root,'README.md'),'utf8')
if(/localStorage|fake API|fake responses/i.test(all))throw new Error('README suggests fake/local storage architecture')
for(const forbidden of ['pipeline_runs','project_analyses','github_tokens','sync_jobs','webhook_deliveries','screenshot_quality_logs']){for(const file of ['lib','app','components','screenshot-worker']){const base=path.join(root,file);if(!fs.existsSync(base))continue;const stack=[base];while(stack.length){const current=stack.pop();for(const entry of fs.readdirSync(current,{withFileTypes:true})){if(entry.name==='node_modules'||entry.name==='.next')continue;const fp=path.join(current,entry.name);if(entry.isDirectory())stack.push(fp);else if(/\.(ts|tsx|js|mjs)$/.test(entry.name)&&fs.readFileSync(fp,'utf8').includes(forbidden))throw new Error(`Legacy symbol leaked: ${forbidden} in ${path.relative(root,fp)}`)}}}}
const env=fs.readFileSync(path.join(root,'.env.example'),'utf8')
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','GITHUB_WEBHOOK_SECRET','SESSION_SECRET','AI_PROVIDER','SCREENSHOT_WORKER_URL','SCREENSHOT_WORKER_SECRET'])if(!env.includes(name))throw new Error(`Missing env var in example: ${name}`)
console.log(`Source integrity checks passed: ${mustExist.length} required files, 18 DB tables, 7 presentation types, security envs and legacy-schema scan.`)
