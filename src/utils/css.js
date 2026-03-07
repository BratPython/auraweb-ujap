export function pxToNumber(value, fallback = 16) {
  const parsed = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

export function toPx(value, min = 0, max = 200) {
  const n = Math.max(min, Math.min(max, Number(value) || 0))
  return `${n}px`
}
