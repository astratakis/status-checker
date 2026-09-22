import type { ReactNode } from 'react'

const RING = <circle cx="8" cy="8" r="6.25" />
const DOT = <circle cx="8" cy="11.1" r="0.55" fill="currentColor" />

const SHAPES = {
  check: <>{RING}<path d="m5.4 8.2 1.8 1.8 3.5-3.7" /></>,
  warning: <><path d="M8 2.3 14.3 13H1.7L8 2.3Z" /><path d="M8 6.4v2.7" />{DOT}</>,
  alert: <>{RING}<path d="M8 4.8v3.9" />{DOT}</>,
  offline: <>{RING}<path d="m5.9 5.9 4.2 4.2m0-4.2-4.2 4.2" /></>,
  lock: <><rect x="3.5" y="7" width="9" height="6.5" rx="1.6" /><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" /></>,
  pending: <circle cx="8" cy="8" r="6.25" strokeDasharray="2.6 2.6" />,
  sun: <><circle cx="8" cy="8" r="2.9" /><path d="M8 1.4v1.5m0 10.2v1.5M1.4 8h1.5m10.2 0h1.5M3.3 3.3l1.1 1.1m7.2 7.2 1.1 1.1m0-9.4-1.1 1.1m-7.2 7.2-1.1 1.1" /></>,
  moon: <path d="M13.6 9.6A5.9 5.9 0 0 1 6.4 2.4a5.9 5.9 0 1 0 7.2 7.2Z" />,
  cards: <><rect x="2" y="2" width="5" height="5" rx="1.3" /><rect x="9" y="2" width="5" height="5" rx="1.3" /><rect x="2" y="9" width="5" height="5" rx="1.3" /><rect x="9" y="9" width="5" height="5" rx="1.3" /></>,
  table: <path d="M2.5 4h11m-11 4h11m-11 4h11" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof SHAPES

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  )
}
