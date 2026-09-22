// Serves the dashboard and relays its status requests to the monitored
// servers, so their API keys stay here and never reach the browser.

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'

const PORT = Number(process.env.PORT) || 3000
const REFRESH_SECONDS = Math.max(1, Number(process.env.REFRESH_SECONDS) || 5)
const UPSTREAM_TIMEOUT_MS = 5000
const DIST = resolve(import.meta.dirname, 'dist')

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

/** Parses SERVERS: comma-separated entries, each `name|url|api-key`. */
function parseServers(raw) {
  const entries = raw.split(',').map((entry) => entry.trim()).filter(Boolean)
  if (entries.length === 0) {
    throw new Error('SERVERS is empty. Expected entries like name|url|api-key.')
  }
  return entries.map((entry, index) => {
    const [name, url, ...rest] = entry.split('|').map((part) => part.trim())
    const apiKey = rest.join('|')
    if (!name || !apiKey || !URL.canParse(url ?? '')) {
      throw new Error(`SERVERS entry ${index + 1} must look like name|url|api-key.`)
    }
    return {
      id: String(index),
      name,
      statusUrl: `${url.replace(/\/+$/, '')}/api/v1/status`,
      apiKey,
    }
  })
}

/** Asks one server for its status and describes the outcome for the dashboard. */
async function readStatus(server) {
  const started = performance.now()
  try {
    const response = await fetch(server.statusUrl, {
      headers: { 'X-API-Key': server.apiKey },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    if (response.status === 401 || response.status === 403) {
      return { state: 'unauthorized' }
    }
    if (!response.ok) {
      return { state: 'error', message: `The server answered with HTTP ${response.status}.` }
    }
    const status = await response.json()
    return { state: 'online', latencyMs: Math.round(performance.now() - started), status }
  } catch (error) {
    if (error.name === 'TimeoutError') return { state: 'timeout' }
    if (error instanceof SyntaxError) {
      return { state: 'error', message: 'The server sent a reply that is not valid JSON.' }
    }
    return { state: 'unreachable' }
  }
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

async function sendFile(req, res, pathname) {
  let file = resolve(DIST, `.${pathname}`)
  const insideDist = file === DIST || file.startsWith(DIST + sep)
  const info = insideDist ? await stat(file).catch(() => null) : null
  if (!info?.isFile()) file = join(DIST, 'index.html') // the app handles its own routes

  const type = CONTENT_TYPES[extname(file)] ?? 'application/octet-stream'
  const compress = !type.startsWith('font/') && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': type,
    // Vite fingerprints everything under /assets, so it can be cached forever.
    'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    Vary: 'Accept-Encoding',
    ...(compress && { 'Content-Encoding': 'gzip' }),
  })
  if (req.method === 'HEAD') return res.end()
  const stages = compress ? [createReadStream(file), createGzip(), res] : [createReadStream(file), res]
  await pipeline(stages)
}

async function handle(req, res, servers) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }
  const pathname = decodeURIComponent(new URL(req.url, 'http://gateway').pathname)

  if (pathname === '/api/servers') {
    return sendJson(res, 200, {
      refreshSeconds: REFRESH_SECONDS,
      servers: servers.map(({ id, name }) => ({ id, name })),
    })
  }
  const match = pathname.match(/^\/api\/servers\/([^/]+)\/status$/)
  if (match) {
    const server = servers.find(({ id }) => id === match[1])
    if (!server) return sendJson(res, 404, { error: 'Unknown server' })
    return sendJson(res, 200, await readStatus(server))
  }
  if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' })

  await sendFile(req, res, pathname)
}

let servers
try {
  servers = parseServers(process.env.SERVERS ?? '')
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

createServer((req, res) => {
  handle(req, res, servers).catch((error) => {
    // Malformed URLs land here (400); anything else is ours (500).
    const statusCode = error instanceof URIError || error.code === 'ERR_INVALID_URL' ? 400 : 500
    if (statusCode === 500) console.error(error)
    if (res.headersSent) res.destroy()
    else sendJson(res, statusCode, { error: statusCode === 400 ? 'Bad request' : 'Internal error' })
  })
}).listen(PORT, () => {
  console.log(`Dashboard on :${PORT}, watching ${servers.map(({ name }) => name).join(', ')}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(0))
