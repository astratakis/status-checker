import { healthOf } from '../lib/health'
import type { Health, Server } from '../types'
import { Icon, type IconName } from './Icon'
import type { Tone } from './StatusPill'

export interface Summary {
  tone: Tone
  icon: IconName
  headline: string
}

/** The one-line verdict for the whole fleet. The worst problem wins. */
export function summarize(servers: Server[]): Summary {
  const count = (health: Health) => servers.filter((server) => healthOf(server) === health).length
  const total = servers.length
  const offline = count('offline')
  const critical = count('critical')
  const strained = critical + count('warning')

  if (total === 0 || count('pending') === total) {
    return { tone: 'neutral', icon: 'pending', headline: 'Checking your servers…' }
  }
  if (offline > 0) {
    const headline =
      offline < total ? `${offline} of ${total} servers unreachable` : total === 1 ? 'Server unreachable' : 'All servers unreachable'
    return { tone: 'critical', icon: 'offline', headline }
  }
  if (strained > 0) {
    const headline = strained === 1 ? '1 server needs attention' : `${strained} servers need attention`
    return critical > 0 ? { tone: 'critical', icon: 'alert', headline } : { tone: 'warning', icon: 'warning', headline }
  }
  return { tone: 'good', icon: 'check', headline: 'All systems operational' }
}

interface FleetSummaryProps {
  servers: Server[]
  summary: Summary
  refreshSeconds: number
}

export function FleetSummary({ servers, summary, refreshSeconds }: FleetSummaryProps) {
  const online = servers.filter((server) => server.reading?.state === 'online').length

  return (
    <section className="fleet" data-tone={summary.tone} aria-live="polite">
      <div className="fleet-badge">
        <Icon name={summary.icon} size={26} />
      </div>
      <div>
        <h1>{summary.headline}</h1>
        <p>
          {online} of {servers.length} {servers.length === 1 ? 'server' : 'servers'} online
          <span className="live">
            <i />
            Live, every {refreshSeconds}s
          </span>
        </p>
      </div>
    </section>
  )
}
