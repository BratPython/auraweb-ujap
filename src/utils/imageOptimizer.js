const SUPABASE_STORAGE_URL = 'https://tmvntnwcdtqqeeeskfzo.supabase.co'

export function getWebpUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return url

  const prefix = `${SUPABASE_STORAGE_URL}/storage/v1/object/public/`
  if (!url.startsWith(prefix)) return url

  const relative = url.slice(prefix.length)
  const params = new URLSearchParams()
  params.set('format', 'webp')
  if (options.width) params.set('width', String(options.width))
  if (options.height) params.set('height', String(options.height))
  if (options.quality) params.set('quality', String(options.quality))

  return `${SUPABASE_STORAGE_URL}/storage/v1/render/image/public/${relative}?${params.toString()}`
}
