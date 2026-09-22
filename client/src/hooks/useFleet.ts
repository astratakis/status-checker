import { useEffect, useState } from 'react'
import type { Reading, Server } from '../types'

/** How far back the trend lines reach. */
export const HISTORY_MS = 5 * 60 * 1000

const RETRY_MS = 5000

interface Config {
  refreshSeconds: number
  servers: { id: string; name: string }[]
}

export interface Fleet {
  servers: Server[]
  refreshSeconds: number
  /** Set while the dashboard cannot load its own configuration. */
  error: string | null
}

async function fetchReading(id: string, signal: AbortSignal): Promise<Reading> {
  try {
    const response = await fetch(`/api/servers/${id}/status`, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch {
    return { state: 'error', message: 'The dashboard lost contact with its own gateway.' }
  }
}

function applyReading(server: Server, reading: Reading, now: number): Server {
  if (reading.state !== 'online') return { ...server, reading }
  const { cpu, memory, disk } = reading.status
  const sample = { time: now, cpu: cpu.percent, memory: memory.percent, disk: disk.percent }
  const history = [...server.history.filter(({ time }) => time > now - HISTORY_MS), sample]
  return { ...server, reading, lastSeen: now, history }
}

/** Loads the list of servers, then keeps polling each of them while the tab is visible. */
export function useFleet(): Fleet {
  const [config, setConfig] = useState<Config | null>(null)
  const [servers, setServers] = useState<Server[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let retry: number | undefined

    const load = async () => {
      try {
        const response = await fetch('/api/servers')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const loaded: Config = await response.json()
        if (cancelled) return
        setError(null)
        setServers(loaded.servers.map((server) => ({ ...server, reading: null, lastSeen: null, history: [] })))
        setConfig(loaded)
      } catch {
        if (cancelled) return
        setError('The dashboard cannot reach its gateway. Retrying…')
        retry = window.setTimeout(load, RETRY_MS)
      }
    }
    load()

    return () => {
      cancelled = true
      window.clearTimeout(retry)
    }
  }, [])

  useEffect(() => {
    if (!config) return
    const controller = new AbortController()
    const inFlight = new Set<string>()

    const poll = () => {
      for (const { id } of config.servers) {
        // A slow server must not pile up requests or let an old answer overwrite a newer one.
        if (inFlight.has(id)) continue
        inFlight.add(id)
        fetchReading(id, controller.signal).then((reading) => {
          inFlight.delete(id)
          if (controller.signal.aborted) return
          const now = Date.now()
          setServers((current) =>
            current.map((server) => (server.id === id ? applyReading(server, reading, now) : server)),
          )
        })
      }
    }

    let timer: number | undefined
    const sync = () => {
      window.clearInterval(timer)
      if (document.hidden) return // nobody is watching: leave the servers alone
      poll()
      timer = window.setInterval(poll, config.refreshSeconds * 1000)
    }
    sync()
    document.addEventListener('visibilitychange', sync)

    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [config])

  return { servers, refreshSeconds: config?.refreshSeconds ?? 5, error }
}
