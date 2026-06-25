'use client'

import dynamic from 'next/dynamic'

const WorldMapInner = dynamic(
  () => import('./WorldMapInner').then((m) => m.WorldMapInner),
  { ssr: false, loading: () => <div style={{ width: '100%', height: 280 }} /> }
)

export interface WorldMapProps {
  style?: React.CSSProperties
  className?: string
}

export function WorldMap({ style, className }: WorldMapProps) {
  return (
    <div style={{ width: '100%', ...style }} className={className}>
      <WorldMapInner />
    </div>
  )
}
