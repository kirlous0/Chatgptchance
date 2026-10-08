export function ProjectMeta({
  category,
  year,
  presentation,
}: {
  category?: string | null
  year?: number | null
  presentation?: string | null
}) {
  return (
    <div className="project-meta">
      {category && <span>{category}</span>}
      {year && <span>{year}</span>}
      {presentation && <span>{presentation.replaceAll('_', ' ')}</span>}
    </div>
  )
}
