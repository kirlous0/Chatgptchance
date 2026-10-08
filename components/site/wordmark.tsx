import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export function Wordmark() {
  return (
    <Link href="/" className="wordmark focus-ring" aria-label="Kirlous Wael home">
      <span className="wordmark__name">KIRLOUS WAEL</span>
      <span className="wordmark__sub">DIGITAL / PRODUCT / WEB</span>
      <ArrowUpRight size={13} className="wordmark__icon" />
    </Link>
  )
}
