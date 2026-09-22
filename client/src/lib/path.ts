export interface Point {
  x: number
  y: number
}

/**
 * SVG path through the points as a monotone cubic spline (Fritsch-Carlson):
 * smooth, but it never overshoots the data, so the line never shows a value
 * that was not measured. Points must be ordered by strictly increasing x.
 */
export function smoothPath(points: readonly Point[]): string {
  const count = points.length
  if (count === 0) return ''
  if (count < 3) return points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x},${y}`).join('')

  const widths: number[] = []
  const slopes: number[] = []
  for (let i = 0; i < count - 1; i++) {
    widths[i] = points[i + 1].x - points[i].x
    slopes[i] = (points[i + 1].y - points[i].y) / widths[i]
  }

  const tangents = [slopes[0]]
  for (let i = 1; i < count - 1; i++) {
    const before = slopes[i - 1]
    const after = slopes[i]
    // Flat at every peak and trough; elsewhere a width-weighted harmonic mean.
    tangents[i] =
      before * after <= 0
        ? 0
        : (3 * (widths[i - 1] + widths[i])) /
          ((2 * widths[i] + widths[i - 1]) / before + (widths[i] + 2 * widths[i - 1]) / after)
  }
  tangents[count - 1] = slopes[count - 2]

  let path = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < count - 1; i++) {
    const third = widths[i] / 3
    const from = points[i]
    const to = points[i + 1]
    path += `C${from.x + third},${from.y + tangents[i] * third} ${to.x - third},${to.y - tangents[i + 1] * third} ${to.x},${to.y}`
  }
  return path
}
