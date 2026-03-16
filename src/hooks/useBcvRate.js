import { useEffect, useState } from 'react'

const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial'
const BCV_CACHE_KEY = 'auraweb_bcv_rate_v1'
const BCV_CACHE_TTL_MS = 15 * 60 * 1000

function readCachedRate() {
  try {
    const raw = sessionStorage.getItem(BCV_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const age = Date.now() - Number(parsed.timestamp || 0)
    if (!Number.isFinite(age) || age > BCV_CACHE_TTL_MS) return null

    const rate = Number.parseFloat(parsed.rate)
    if (!Number.isFinite(rate) || rate <= 0) return null

    return rate
  } catch {
    return null
  }
}

function cacheRate(rate) {
  try {
    sessionStorage.setItem(
      BCV_CACHE_KEY,
      JSON.stringify({
        rate,
        timestamp: Date.now(),
      })
    )
  } catch {
    // Ignore storage failures.
  }
}

export function useBcvRate() {
  const [bcvRate, setBcvRate] = useState(() => readCachedRate())
  const [loading, setLoading] = useState(() => !readCachedRate())
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const cached = readCachedRate()
    if (cached) {
      setBcvRate(cached)
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    async function fetchRate() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(BCV_API_URL)
        if (!response.ok) {
          throw new Error(`BCV API error: ${response.status}`)
        }

        const data = await response.json()
        const rate = Number.parseFloat(data?.promedio)

        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error('BCV API returned an invalid rate')
        }

        if (!cancelled) {
          setBcvRate(rate)
          cacheRate(rate)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchRate()

    return () => {
      cancelled = true
    }
  }, [])

  return { bcvRate, loading, error }
}
