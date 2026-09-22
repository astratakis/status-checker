import { useTween } from '../hooks/useTween'
import { formatPercent } from '../lib/format'
import { severityOf } from '../lib/health'

// The ring is a 270° arc. `pathLength` stretches the circle's own units so
// that the arc measures exactly 100, which makes the dash length the percentage.
const ARC = 100
const CIRCLE = ARC / 0.75

function AnimatedPercent({ value }: { value: number }) {
  return <>{formatPercent(useTween(value))}</>
}

interface MeterProps {
  label: string
  /** `null` while there is nothing to show yet. */
  percent: number | null
}

export function Meter({ label, percent }: MeterProps) {
  const filled = Math.min(100, Math.max(0, percent ?? 0))

  return (
    <div
      className="meter"
      data-severity={severityOf(filled)}
      role="meter"
      aria-label={`${label} usage`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      aria-valuetext={percent === null ? 'No data' : `${formatPercent(percent)}%`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <g transform="rotate(135 60 60)">
          <circle className="meter-track" cx="60" cy="60" r="52" pathLength={CIRCLE} strokeDasharray={`${ARC} ${CIRCLE}`} />
          <circle
            className="meter-fill"
            cx="60"
            cy="60"
            r="52"
            pathLength={CIRCLE}
            // A round cap would still paint a dot at 0%, so hide the empty fill.
            style={{ strokeDasharray: `${filled} ${CIRCLE}`, opacity: filled > 0 ? 1 : 0 }}
          />
        </g>
      </svg>
      <div className="meter-readout">
        {percent === null ? (
          <span className="meter-empty">–</span>
        ) : (
          <span className="meter-value">
            <AnimatedPercent value={percent} />
            <small>%</small>
          </span>
        )}
      </div>
      <span className="meter-label">{label}</span>
    </div>
  )
}
