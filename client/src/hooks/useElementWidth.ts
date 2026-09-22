import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Tracks an element's content width, so SVG can be drawn at real pixel size. */
export function useElementWidth<T extends Element>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
