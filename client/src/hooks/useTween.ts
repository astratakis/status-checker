import { useEffect, useRef, useState } from 'react'

/** Eases the returned number towards `target` whenever the target changes. */
export function useTween(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target)
  const latest = useRef(target)

  useEffect(() => {
    const from = latest.current
    if (from === target) return

    const start = performance.now()
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = requestAnimationFrame(function step(now) {
      const progress = instant ? 1 : Math.min(1, (now - start) / durationMs)
      latest.current = from + (target - from) * (1 - (1 - progress) ** 3)
      setValue(latest.current)
      if (progress < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}
