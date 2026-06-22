import { useEffect, useState } from 'react'

export function useCountdown(
  startedAt: string | null,
  durationMinutes: number
) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  const [pct, setPct] = useState(100)

  useEffect(() => {
    if (!startedAt) return

    const tick = () => {
      const start = new Date(startedAt).getTime()
      const end = start + durationMinutes * 60 * 1000
      const now = Date.now()
      const remaining = end - now
      const total = durationMinutes * 60 * 1000

      if (remaining <= 0) {
        setTimeLeft('Temps écoulé')
        setIsExpired(true)
        setPct(0)
        return
      }

      const percent = Math.round((remaining / total) * 100)
      setPct(percent)
      setIsExpired(false)

      const totalSeconds = Math.floor(remaining / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt, durationMinutes])

  return { timeLeft, isExpired, pct }
}