import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Luma Proxies — Proxies Premium Residencial',
  description: 'Proxies residenciais, móveis e datacenter em +180 países. Setup em segundos, pague só pelo que usar.',
  keywords: 'proxies residenciais, proxy brasil, proxy mobile, datacenter, proxy barato',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{
        fontFamily: 'Manrope, sans-serif',
        ['--font-archivo' as string]: 'Archivo, sans-serif',
        ['--font-manrope' as string]: 'Manrope, sans-serif',
        ['--font-mono' as string]: '"JetBrains Mono", monospace',
      }}>{children}</body>
    </html>
  )
}
