import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useElementWidth } from '../hooks/useElementWidth'
import { HISTORY_MS } from '../hooks/useFleet'
import { formatClock } from '../lib/format'
import { smoothPath, type Point } from '../lib/path'
import type { Metric, Sample } from '../types'

const HEIGHT = 44
const PAD = 6 // room for the end dot and its ring
const TIP_HALF_WIDTH = 52

interface SparklineProps {
  label: string
  metric: Metric
  samples: Sample[]
  /** A pause longer than this between two samples breaks the line. */
  gapMs: number
}

/** The last few minutes of one metric, always on a 0-100% scale. Hover or use the arrow keys to read values. */
export function Sparkline({ label, metric, samples, gapMs }: SparklineProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [activeTime, setActiveTime] = useState<number | null>(null)
  const gradient = useId()
  const bottom = HEIGHT - PAD

  const { points, runs } = useMemo(() => {
    const end = samples.at(-1)?.time ?? 0
    const points: Point[] = samples.map((sample) => ({
      x: PAD + (1 - (end - sample.time) / HISTORY_MS) * (width - 2 * PAD),
      y: PAD + (1 - sample[metric] / 100) * (HEIGHT - 2 * PAD),
    }))
    const runs: Point[][] = []
    samples.forEach((sample, index) => {
      if (index === 0 || sample.time - samples[index - 1].time > gapMs) runs.push([])
      runs.at(-1)!.push(points[index])
    })
    return { points, runs }
  }, [samples, metric, width, gapMs])

  const activeIndex = activeTime === null ? -1 : samples.findIndex(({ time }) => time === activeTime)
  const active = activeIndex === -1 ? null : { sample: samples[activeIndex], point: points[activeIndex] }
  const last = points.at(-1)

  const onPointerMove = (event: PointerEvent) => {
    if (samples.length === 0) return
    const x = event.clientX - event.currentTarget.getBoundingClientRect().left
    let nearest = 0
    points.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(points[nearest].x - x)) nearest = index
    })
    setActiveTime(samples[nearest].time)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (step === 0 || samples.length === 0) return
    event.preventDefault()
    const from = activeIndex === -1 ? samples.length - 1 : activeIndex
    setActiveTime(samples[Math.min(samples.length - 1, Math.max(0, from + step))].time)
  }

  const values = samples.map((sample) => sample[metric])
  const summary = values.length
    ? `now ${values.at(-1)!.toFixed(1)}%, lowest ${Math.min(...values).toFixed(1)}%, highest ${Math.max(...values).toFixed(1)}%`
    : 'no data yet'

  return (
    <div
      ref={ref}
      className="sparkline"
      role="img"
      tabIndex={0}
      aria-label={`${label} over the last 5 minutes: ${summary}`}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setActiveTime(null)}
      onFocus={() => setActiveTime(samples.at(-1)?.time ?? null)}
      onBlur={() => setActiveTime(null)}
      onKeyDown={onKeyDown}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden="true">
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop className="spark-stop" offset="0" stopOpacity="0.2" />
              <stop className="spark-stop" offset="1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line className="spark-baseline" x1="0" x2={width} y1={bottom + 0.5} y2={bottom + 0.5} />
          {runs.map((run) => {
            const line = smoothPath(run)
            return (
              <g key={run[0].x}>
                <path fill={`url(#${gradient})`} d={`${line}L${run.at(-1)!.x},${bottom}L${run[0].x},${bottom}Z`} />
                <path className="spark-line" d={line} />
              </g>
            )
          })}
          {active && <line className="spark-crosshair" x1={active.point.x} x2={active.point.x} y1="0" y2={bottom} />}
          {last && <circle className="spark-dot" cx={last.x} cy={last.y} r="4" />}
          {active && <circle className="spark-dot" cx={active.point.x} cy={active.point.y} r="4" />}
        </svg>
      )}
      {active && (
        <div
          className="spark-tip"
          style={{ left: Math.min(Math.max(active.point.x, TIP_HALF_WIDTH), Math.max(TIP_HALF_WIDTH, width - TIP_HALF_WIDTH)) }}
        >
          <strong>{active.sample[metric].toFixed(1)}%</strong>
          <span>{formatClock(active.sample.time)}</span>
        </div>
      )}
    </div>
  )
}
