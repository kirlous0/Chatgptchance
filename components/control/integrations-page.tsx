'use client'

import { useEffect, useState } from 'react'

type Integration = { state: string; login?: string | null; message?: string | null }
type ApiResponse = { ok: boolean; data?: Record<string, Integration>; error?: { message?: string } }

export function IntegrationsPage() {
  const [data, setData] = useState<Record<string, Integration>>({})
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const response = await fetch('/api/integrations/status', { cache: 'no-store' })
      const json = await response.json() as ApiResponse
      if (json.ok && json.data) setData(json.data)
      else setError(json.error?.message ?? 'Unable to read status')
    } catch {
      setError('Unable to reach the integration status endpoint.')
    }
  }

  useEffect(() => { void load() }, [])

  return <section>
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div><div className="section-marker"><span className="eyebrow">CONTROL / 07</span></div><h1 className="serif mt-4 text-5xl md:text-7xl">Integrations.</h1></div>
      <button onClick={() => void load()} className="border border-white/10 px-4 py-3 text-[10px] uppercase tracking-[.12em]">Check status</button>
    </div>
    {error && <p className="mt-5 border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p>}
    <div className="mt-8 grid gap-3 md:grid-cols-2">
      {(Object.entries(data) as Array<[string, Integration]>).map(([name, value]) => <div key={name} className="control-card p-5"><div className="flex items-center justify-between"><p className="micro">{name}</p><i className={`status-dot ${value.state==='healthy'?'text-white/65':value.state==='degraded'?'text-amber-200':'text-white/25'}`} /></div><p className="mt-4 text-sm capitalize">{value.state}</p>{value.login&&<p className="mt-2 text-xs text-white/40">{value.login}</p>}{value.message&&<p className="mt-2 text-xs text-white/35">{value.message}</p>}</div>)}
      {!Object.keys(data).length && !error && <div className="control-card p-8 text-sm text-white/35">Checking integrations…</div>}
    </div>
    <div className="mt-8 control-card p-6"><p className="micro">GITHUB OAUTH</p><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">The connection flow uses a signed, expiring owner-bound state cookie. The GitHub access token is encrypted server-side and never sent to the browser.</p><a href="/api/github/connect" className="mt-5 inline-flex border border-white/15 px-4 py-3 text-[10px] uppercase tracking-[.12em] hover:border-white/30">Connect GitHub</a></div>
  </section>
}
