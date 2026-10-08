import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { PublicNav } from '@/components/site/public-nav'
import { SiteEffects } from '@/components/site/site-effects'

const sans=Geist({subsets:['latin'],variable:'--font-sans',display:'swap'})
const mono=Geist_Mono({subsets:['latin'],variable:'--font-mono',display:'swap'})
const serif=Instrument_Serif({subsets:['latin'],variable:'--font-serif',weight:'400',display:'swap'})

export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),title:{default:'Kirlous Wael — Digital Product Builder',template:'%s — Kirlous Wael'},description:'A portfolio of polished web products built by Kirlous Wael.',openGraph:{title:'Kirlous Wael — Digital Product Builder',description:'A portfolio of polished web products built by Kirlous Wael.',type:'website',siteName:'Kirlous Wael'},twitter:{card:'summary_large_image',title:'Kirlous Wael — Digital Product Builder',description:'A portfolio of polished web products built by Kirlous Wael.'},robots:{index:true,follow:true}}

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}><body><SiteEffects/><PublicNav/>{children}</body></html>}
