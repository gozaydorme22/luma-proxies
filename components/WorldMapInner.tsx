'use client'

import { WORLD_PATHS } from './worldPaths'

const AC = '#a855f7'

const NODES: [number, number][] = [
  [-46.6, -23.5], // São Paulo
  [-74.0,  40.7], // New York
  [-118.2, 34.0], // Los Angeles
  [-0.1,   51.5], // London
  [8.7,    50.1], // Frankfurt
  [103.8,   1.3], // Singapore
  [139.7,  35.7], // Tokyo
  [151.2, -33.9], // Sydney
  [55.3,   25.2], // Dubai
  [72.8,   19.1], // Mumbai
  [28.0,  -26.2], // Johannesburg
  [3.4,    6.5],  // Lagos
]

function project(lon: number, lat: number): [number, number] {
  const λ = (lon * Math.PI) / 180
  const φ = (lat * Math.PI) / 180
  const l = [0.8707, -0.131979, -0.013791, 0.003971, -0.001529]
  const d = [1.007226, 0.015085, -0.044475, 0.028874, -0.005916]
  const φ2 = φ * φ, φ4 = φ2 * φ2
  const x = λ * (l[0] + φ2 * (l[1] + φ2 * (l[2] + φ4 * φ2 * (l[3] + φ2 * l[4]))))
  const y = φ * (d[0] + φ2 * (d[1] + φ2 * (d[2] + φ4 * (d[3] + φ2 * d[4]))))
  return [480 + 153 * x, 250 - 153 * y]
}

const PTS = NODES.map(([lon, lat]) => project(lon, lat))

// Stagger each node's ping so they don't all fire at once
const DELAYS = [0, 0.6, 1.3, 0.2, 1.8, 0.9, 0.4, 1.5, 1.1, 0.7, 1.6, 0.3]

export function WorldMapInner() {
  return (
    <svg viewBox="140 5 716 400" width="100%" style={{ display: 'block' }}>
      <style>{`
        @keyframes wm-ping {
          0%   { r: 3;   opacity: 0.9; }
          100% { r: 18;  opacity: 0;   }
        }
        @keyframes wm-pulse {
          0%,100% { opacity: 0.7; }
          50%     { opacity: 1;   }
        }
        ${PTS.map((_, i) => `
          .wm-ring-${i} {
            animation: wm-ping 2.4s cubic-bezier(0,.6,.4,1) ${DELAYS[i]}s infinite;
          }
          .wm-dot-${i} {
            animation: wm-pulse 2.4s ease-in-out ${DELAYS[i]}s infinite;
          }
        `).join('')}
      `}</style>

      <defs>
        <filter id="wm-continent" x="-4%" y="-8%" width="108%" height="116%">
          <feMorphology operator="dilate" radius="0.5" in="SourceGraphic" result="dilated" />
          <feGaussianBlur in="dilated" stdDeviation="1.5" result="glow-blur" />
          <feFlood floodColor="#7c3aed" floodOpacity="0.22" result="glow-color" />
          <feComposite in="glow-color" in2="glow-blur" operator="in" result="glow" />
          <feFlood floodColor="#7c3aed" floodOpacity="0.45" result="edge-color" />
          <feComposite in="edge-color" in2="dilated" operator="in" result="edge" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="edge" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="wm-node-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Continent silhouettes — Antarctica excluded */}
      <g fill="#1a0a2e" stroke="none" filter="url(#wm-continent)">
        {WORLD_PATHS.filter(({ id }) => id !== 'ATA').map(({ id, d }) => (
          <path key={id} d={d} />
        ))}
      </g>

      {/* Pulsing nodes — expanding ring + steady core dot */}
      {PTS.map(([x, y], i) => (
        <g key={i} filter="url(#wm-node-glow)">
          {/* Expanding ping ring */}
          <circle
            className={`wm-ring-${i}`}
            cx={x} cy={y} r={3}
            fill="none"
            stroke={AC}
            strokeWidth={1.2}
          />
          {/* Steady core */}
          <circle
            className={`wm-dot-${i}`}
            cx={x} cy={y} r={2.2}
            fill={AC}
          />
        </g>
      ))}
    </svg>
  )
}
