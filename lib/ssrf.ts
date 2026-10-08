import dns from 'node:dns/promises'
import net from 'node:net'

function ipv4ToNumber(ip: string) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0
}

function privateIpv4(ip: string) {
  const n = ipv4ToNumber(ip)
  if (n === null) return true
  const ranges: Array<[number, number]> = [
    [0x00000000, 0x00ffffff], [0x0a000000, 0x0affffff], [0x64400000, 0x647fffff],
    [0x7f000000, 0x7fffffff], [0xa9fe0000, 0xa9feffff], [0xac100000, 0xac1fffff],
    [0xc0000000, 0xc00000ff], [0xc0000200, 0xc00002ff], [0xc0a80000, 0xc0a8ffff],
    [0xc6120000, 0xc613ffff], [0xc6336400, 0xc63364ff], [0xcb007100, 0xcb0071ff],
    [0xe0000000, 0xffffffff],
  ]
  return ranges.some(([min, max]) => n >= min && n <= max)
}

function ipv6ToBigInt(ip: string) {
  let normalized = ip.toLowerCase()
  const zone = normalized.indexOf('%')
  if (zone >= 0) normalized = normalized.slice(0, zone)
  if (normalized.includes('.')) {
    const lastColon = normalized.lastIndexOf(':')
    const v4 = normalized.slice(lastColon + 1)
    const n = ipv4ToNumber(v4)
    if (n === null) return null
    normalized = `${normalized.slice(0, lastColon)}:${((n >>> 16) & 0xffff).toString(16)}:${(n & 0xffff).toString(16)}`
  }
  const halves = normalized.split('::')
  if (halves.length > 2) return null
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves[1] ? halves[1].split(':') : []
  const missing = 8 - left.length - right.length
  if (missing < 0) return null
  const groups = [...left, ...Array.from({ length: missing }, () => '0'), ...right]
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null
  return groups.reduce((acc, g) => (acc << 16n) + BigInt(parseInt(g, 16)), 0n)
}

function privateIpv6(ip: string) {
  const n = ipv6ToBigInt(ip)
  if (n === null) return true
  const top8 = Number(n >> 120n)
  const second8 = Number((n >> 112n) & 0xffn)
  if (n === 0n || n === 1n) return true
  if (top8 === 0xfc || top8 === 0xfd) return true // fc00::/7
  if (top8 === 0xfe && second8 >= 0x80 && second8 <= 0xbf) return true // fe80::/10
  if ((n >> 32n) === 0xffffn) {
    const v4 = Number(n & 0xffffffffn)
    return privateIpv4([v4 >>> 24, (v4 >>> 16) & 255, (v4 >>> 8) & 255, v4 & 255].join('.'))
  }
  return false
}


export async function assertSafeUrl(raw: string) {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('INVALID_URL') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('UNSAFE_SCHEME')
  if (url.username || url.password) throw new Error('URL_CREDENTIALS_NOT_ALLOWED')
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '')
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('PRIVATE_HOSTNAME')
  }
  const literalType = net.isIP(hostname)
  if (literalType === 4 && privateIpv4(hostname)) throw new Error('PRIVATE_IP')
  if (literalType === 6 && privateIpv6(hostname)) throw new Error('PRIVATE_IP')
  if (!literalType) {
    const resolved = await dns.lookup(hostname, { all: true, verbatim: true })
    if (!resolved.length) throw new Error('DNS_LOOKUP_FAILED')
    for (const record of resolved) {
      if ((record.family === 4 && privateIpv4(record.address)) || (record.family === 6 && privateIpv6(record.address))) {
        throw new Error('DNS_RESOLVES_PRIVATE')
      }
    }
  }
  return url
}

export async function safeFetch(rawUrl: string, init: RequestInit = {}, options: { timeoutMs?: number; maxBytes?: number; maxRedirects?: number } = {}) {
  const timeoutMs = options.timeoutMs ?? 8000
  const maxBytes = options.maxBytes ?? 256 * 1024
  const maxRedirects = options.maxRedirects ?? 3
  let current = rawUrl
  for (let i = 0; i <= maxRedirects; i++) {
    const safeUrl = await assertSafeUrl(current)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(safeUrl, { ...init, redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': 'KirlousWaelPortfolio/3.0', ...(init.headers ?? {}) } })
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) return response
        current = new URL(location, safeUrl).toString()
        continue
      }
      const length = Number(response.headers.get('content-length') ?? '0')
      if (length && length > maxBytes) throw new Error('RESPONSE_TOO_LARGE')
      return { response, safeUrl }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new Error('REQUEST_TIMEOUT')
      throw error
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('TOO_MANY_REDIRECTS')
}

export async function readLimitedText(response: Response, maxBytes = 256 * 1024) {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error('RESPONSE_TOO_LARGE')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder().decode(bytes)
}
