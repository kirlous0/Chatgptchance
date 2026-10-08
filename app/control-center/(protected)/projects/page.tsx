import { listProjects } from '@/lib/admin-data'
import { ProjectsPage } from '@/components/control/projects-page'
export default async function ProjectsRoute(){return <ProjectsPage projects={await listProjects()}/>} 
