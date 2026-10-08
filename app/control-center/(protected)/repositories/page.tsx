import { listRepositories } from '@/lib/admin-data'
import { RepositoriesPage } from '@/components/control/repositories-page'
export default async function RepositoriesRoute(){return <RepositoriesPage stored={await listRepositories()}/>} 
