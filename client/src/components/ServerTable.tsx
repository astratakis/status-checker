import { formatDuration, formatPercent } from '../lib/format'
import { METRIC_LABELS, METRICS, severityOf } from '../lib/health'
import type { Server } from '../types'
import { StatusPill } from './StatusPill'

function BarMeter({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="bar-meter" data-severity={severityOf(percent)}>
      <span>{formatPercent(percent)}%</span>
      <div className="bar" role="meter" aria-label={`${label} usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <i style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  )
}

/** Every server on one line: the compact, screen-reader-friendly twin of the cards. */
export function ServerTable({ servers }: { servers: Server[] }) {
  return (
    <div className="card table-card">
      <table>
        <thead>
          <tr>
            <th scope="col">Server</th>
            <th scope="col">Status</th>
            {METRICS.map((metric) => (
              <th scope="col" key={metric}>{METRIC_LABELS[metric]}</th>
            ))}
            <th scope="col">Uptime</th>
            <th scope="col">Latency</th>
          </tr>
        </thead>
        <tbody>
          {servers.map((server) => {
            const online = server.reading?.state === 'online' ? server.reading : null
            return (
              <tr key={server.id}>
                <th scope="row">
                  {server.name}
                  <small>{online?.status.hostname ?? '–'}</small>
                </th>
                <td><StatusPill server={server} /></td>
                {METRICS.map((metric) => (
                  <td key={metric}>
                    {online ? <BarMeter label={METRIC_LABELS[metric]} percent={online.status[metric].percent} /> : '–'}
                  </td>
                ))}
                <td>{online ? formatDuration(online.status.uptime_seconds) : '–'}</td>
                <td>{online ? `${online.latencyMs} ms` : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
