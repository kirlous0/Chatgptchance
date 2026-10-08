import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProjectEditor } from '@/components/control/project-editor'
export default async function ProjectEditorRoute({params}:{params:Promise<{id:string}>}){const {id}=await params;const {data,error}=await createAdminClient().from('projects').select('*,project_technologies(name,source,confidence),project_features(name,source,confidence),project_evidence(id,source_kind,source_locator,excerpt,confidence),project_screenshots(id,storage_path,status,quality_score,metadata)').eq('id',id).maybeSingle();if(error||!data)notFound();return <ProjectEditor project={data}/>} 
