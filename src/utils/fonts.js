export function registerFont(name, url) {
  const source = `url('${encodeURI(url)}')`
  const face = new FontFace(name, source, { display: 'swap' })
  face
    .load()
    .then((loaded) => document.fonts.add(loaded))
    .catch((err) => console.warn(`No se pudo cargar la fuente ${name}:`, err))
}
