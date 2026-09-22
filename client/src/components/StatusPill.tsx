import type { Server } from '../types'
import { healthOf } from '../lib/health'
import { Icon, type IconName } from './Icon'

export type Tone = 'neutral' | 'good' | 'warning' | 'critical'

interface Badge {
  label: string
  icon: IconName
  tone: Tone
}

/** Status is never colour alone: every state has its own icon and word. */
export function badgeOf(server: Server): Badge {
  switch (healthOf(server)) {
    case 'pending':
      return { label: 'Checking', icon: 'pending', tone: 'neutral' }
    case 'online':
      return { label: 'Online', icon: 'check', tone: 'good' }
    case 'warning':
      return { label: 'Warning', icon: 'warning', tone: 'warning' }
    case 'critical':
      return { label: 'Critical', icon: 'alert', tone: 'critical' }
    case 'offline':
      return server.reading?.state === 'unauthorized'
        ? { label: 'Unauthorized', icon: 'lock', tone: 'critical' }
        : { label: 'Offline', icon: 'offline', tone: 'critical' }
  }
}

export function StatusPill({ server }: { server: Server }) {
  const { label, icon, tone } = badgeOf(server)
  return (
    <span className="pill" data-tone={tone}>
      <Icon name={icon} />
      {label}
    </span>
  )
}
