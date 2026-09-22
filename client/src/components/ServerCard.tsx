import type { CSSProperties } from 'react'
import { formatAgo, formatDuration, formatUsage } from '../lib/format'
import { healthOf, METRIC_LABELS, METRICS } from '../lib/health'
import type { Metric, Reading, Server, ServerStatus } from '../types'
import { Icon } from './Icon'
import { Meter } from './Meter'
import { Sparkline } from './Sparkline'
import { StatusPill } from './StatusPill'

function describe(metric: Metric, status: ServerStatus): string {
  if (metric === 'cpu') {
    const { cores, load_average } = status.cpu
    return `${cores} ${cores === 1 ? 'core' : 'cores'} · load ${load_average[0].toFixed(2)}`
  }
  return formatUsage(status[metric].used, status[metric].total)
}

const OUTAGES = {
  unreachable: [
    'No answer from this server',
    'Check that it is running and that its port can be reached from the dashboard.',
  ],
  timeout: ['This server is not answering in time', 'It took longer than 5 seconds to reply.'],
  unauthorized: [
    'This server rejected the API key',
    'The key in SERVERS has to match the API_KEY the server was started with.',
  ],
}

function Outage({ reading }: { reading: Exclude<Reading, { state: 'online' }> }) {
  const [title, hint] = reading.state === 'error' ? ['Something went wrong', reading.message] : OUTAGES[reading.state]
  return (
    <div className="outage">
      <Icon name={reading.state === 'unauthorized' ? 'lock' : 'offline'} size={22} />
      <p className="outage-title">{title}</p>
      <p className="outage-hint">{hint}</p>
    </div>
  )
}

interface ServerCardProps {
  server: Server
  index: number
  gapMs: number
}

export function ServerCard({ server, index, gapMs }: ServerCardProps) {
  const { reading, lastSeen, history } = server
  const status = reading?.state === 'online' ? reading.status : null

  let meta = 'Connecting…'
  if (reading?.state === 'online') {
    meta = `${reading.status.hostname} · up ${formatDuration(reading.status.uptime_seconds)} · ${reading.latencyMs} ms`
  } else if (reading) {
    meta = lastSeen ? `Last seen ${formatAgo(lastSeen, Date.now())}` : 'Has not answered yet'
  }

  return (
    <article className="card" data-health={healthOf(server)} style={{ '--index': index } as CSSProperties}>
      <header className="card-header">
        <div className="card-title">
          <h2>{server.name}</h2>
          <p>{meta}</p>
        </div>
        <StatusPill server={server} />
      </header>

      {reading && reading.state !== 'online' ? (
        <Outage reading={reading} />
      ) : (
        <div className="metrics">
          {METRICS.map((metric) => (
            <section className="metric" key={metric}>
              <Meter label={METRIC_LABELS[metric]} percent={status?.[metric].percent ?? null} />
              <div className="metric-body">
                <p className="metric-detail">{status ? describe(metric, status) : ' '}</p>
                <Sparkline label={METRIC_LABELS[metric]} metric={metric} samples={history} gapMs={gapMs} />
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  )
}
