export function normalizeHex(raw, fallback = '#000000') {
  if (typeof raw !== 'string') return fallback
  const val = raw.trim().toLowerCase()

  if (/^#[0-9a-f]{6}$/i.test(val)) return val
  if (/^#[0-9a-f]{3}$/i.test(val)) {
    return `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`
  }

  const stripped = val.replace(/[^0-9a-f]/gi, '')
  if (stripped.length === 6) return `#${stripped}`
  if (stripped.length === 3) return `#${stripped[0]}${stripped[0]}${stripped[1]}${stripped[1]}${stripped[2]}${stripped[2]}`

  return fallback
}

export function createPaletteId(category) {
  return `${category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export function extractPaletteValues(raw) {
  if (!raw || typeof raw !== 'object') return null

  const maybeValues = raw.values && typeof raw.values === 'object' ? raw.values : raw
  const entries = Object.entries(maybeValues).filter(([k, v]) => k.startsWith('--') && typeof v === 'string')

  if (entries.length === 0) return null
  return Object.fromEntries(entries)
}
