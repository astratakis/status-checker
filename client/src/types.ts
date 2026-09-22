/** What a server's `GET /api/v1/status` returns. */
export interface ServerStatus {
  hostname: string
  timestamp: string
  uptime_seconds: number
  cpu: { percent: number; cores: number; load_average: [number, number, number] }
  memory: { total: number; used: number; available: number; percent: number }
  disk: { total: number; used: number; free: number; percent: number }
}

/** The outcome of asking one server for its status, as reported by the gateway. */
export type Reading =
  | { state: 'online'; latencyMs: number; status: ServerStatus }
  | { state: 'unreachable' | 'timeout' | 'unauthorized' }
  | { state: 'error'; message: string }

export type Metric = 'cpu' | 'memory' | 'disk'

/** One point of a server's recent history. */
export type Sample = { time: number } & Record<Metric, number>

export interface Server {
  id: string
  name: string
  /** `null` until the first answer arrives. */
  reading: Reading | null
  /** When the server last answered, as epoch milliseconds. */
  lastSeen: number | null
  history: Sample[]
}

export type Severity = 'normal' | 'warning' | 'critical'

export type Health = 'pending' | 'online' | 'warning' | 'critical' | 'offline'
