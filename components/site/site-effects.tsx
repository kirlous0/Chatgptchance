'use client'

import { useEffect, useState } from 'react'

export function SiteEffects() {
  const [progress, setProgress] = useState(0)

  const [publicSurface, setPublicSurface] = useState(true)

  useEffect(() => {
    setPublicSurface(!window.location.pathname.startsWith('/control-center'))
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  if (!publicSurface) return null

  return (
    <>
      <div aria-hidden className="site-progress"><span style={{ width: `${progress}%` }} /></div>
      <div aria-hidden className="desktop-crosshair">
        <span className="desktop-crosshair__h" />
        <span className="desktop-crosshair__v" />
      </div>
    </>
  )
}
