import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '../lib/money'

interface Props {
  value: number
  format?: (n: number) => string
  className?: string
}

/** Number that eases toward its value — the app's signature motion. */
export function AnimatedNumber({ value, format = formatMoney, className = '' }: Props) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = value
      setDisplay(value)
      return
    }
    const from = fromRef.current
    fromRef.current = value
    if (from === value) {
      setDisplay(value)
      return
    }
    const duration = 700
    const start = performance.now()
    let raf: number
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (value - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span className={`num ${className}`}>{format(display)}</span>
}
