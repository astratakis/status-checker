const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

/** `{ value: '7.75', unit: 'GB' }`, scaled by 1024 and kept to three significant digits. */
function scaleBytes(bytes: number, unitIndex?: number) {
  const index = unitIndex ?? Math.min(BYTE_UNITS.length - 1, Math.max(0, Math.floor(Math.log2(bytes || 1) / 10)))
  const scaled = bytes / 1024 ** index
  const value = scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)
  return { value, unit: BYTE_UNITS[index], index }
}

export function formatBytes(bytes: number): string {
  const { value, unit } = scaleBytes(bytes)
  return `${value} ${unit}`
}

/** "2.95 of 7.75 GB": both numbers share the total's unit. */
export function formatUsage(used: number, total: number): string {
  const whole = scaleBytes(total)
  return `${scaleBytes(used, whole.index).value} of ${whole.value} ${whole.unit}`
}

export function formatPercent(percent: number): string {
  return percent < 10 ? percent.toFixed(1) : percent.toFixed(0)
}

/** The two most significant units: "12d 4h", "3h 12m", "45s". */
export function formatDuration(seconds: number): string {
  const units: [string, number][] = [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]]
  const first = units.findIndex(([, size]) => seconds >= size)
  if (first === -1) return '0s'
  let rest = Math.floor(seconds)
  return units
    .slice(first, first + 2)
    .map(([unit, size]) => {
      const amount = Math.floor(rest / size)
      rest -= amount * size
      return `${amount}${unit}`
    })
    .join(' ')
}

export function formatAgo(thenMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.round((nowMs - thenMs) / 1000))
  return seconds < 5 ? 'just now' : `${formatDuration(seconds)} ago`
}

const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function formatClock(timeMs: number): string {
  return clock.format(timeMs)
}
