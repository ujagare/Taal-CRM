import { useEffect, useRef, useState } from 'react'
export function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0)
  const raf = useRef()
  useEffect(() => {
    const start = performance.now()
    const tick = t => {
      const p = Math.min(1, (t - start) / duration)
      setVal(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return val
}