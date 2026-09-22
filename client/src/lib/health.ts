import type { Health, Metric, Server, Severity } from '../types'

export const WARNING_PERCENT = 75
export const CRITICAL_PERCENT = 90

export const METRICS: readonly Metric[] = ['cpu', 'memory', 'disk']

export const METRIC_LABELS: Record<Metric, string> = { cpu: 'CPU', memory: 'Memory', disk: 'Disk' }

export function severityOf(percent: number): Severity {
  if (percent >= CRITICAL_PERCENT) return 'critical'
  if (percent >= WARNING_PERCENT) return 'warning'
  return 'normal'
}

/** A server is as healthy as its busiest resource. */
export function healthOf({ reading }: Server): Health {
  if (!reading) return 'pending'
  if (reading.state !== 'online') return 'offline'
  const busiest = Math.max(...METRICS.map((metric) => reading.status[metric].percent))
  const severity = severityOf(busiest)
  return severity === 'normal' ? 'online' : severity
}
