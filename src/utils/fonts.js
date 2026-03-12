const RETRY_DELAYS = [0, 600, 1800]

function sanitizeId(text) {
  return String(text).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
}

function normalizeFontUrl(url) {
  try {
    return encodeURI(url)
  } catch {
    return url
  }
}

function injectFontFace(name, url) {
  const id = `font-face-${sanitizeId(name)}`
  if (document.getElementById(id)) return

  const style = document.createElement('style')
  style.id = id
  style.textContent = `@font-face {\n` +
    `  font-family: '${name}';\n` +
    `  src: url('${url}');\n` +
    `  font-display: swap;\n` +
    `}`
  document.head.appendChild(style)
}

function attemptLoad(name, url, attempt) {
  const source = `url('${url}')`
  const face = new FontFace(name, source, { display: 'swap' })

  face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded)
      document.fonts.load(`1em "${name}"`).catch(() => {})
    })
    .catch((err) => {
      if (attempt < RETRY_DELAYS.length - 1) {
        const delay = RETRY_DELAYS[attempt + 1]
        setTimeout(() => attemptLoad(name, url, attempt + 1), delay)
      } else {
        console.warn(`No se pudo cargar la fuente ${name}:`, err)
      }
    })
}

export function registerFont(name, url) {
  if (!name || !url) return
  const safeUrl = normalizeFontUrl(url)
  injectFontFace(name, safeUrl)
  attemptLoad(name, safeUrl, 0)
}
