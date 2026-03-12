export const BUILTIN_FONTS = [
  { label: 'AuraLogo', value: "'AuraLogo', Georgia, serif", family: 'AuraLogo' },
  { label: 'Playfair Display', value: "'Playfair Display', Georgia, serif", family: 'Playfair Display' },
  { label: 'Georgia', value: 'Georgia, serif', family: 'Georgia' },
  { label: 'Inter', value: "'Inter', sans-serif", family: 'Inter' },
  { label: 'Arial', value: 'Arial, sans-serif', family: 'Arial' },
]

export const CATEGORY_META = {
  light: { label: 'Paletas Modo Claro' },
  dark: { label: 'Paletas Modo Oscuro' },
  colorblind: { label: 'Paletas Daltonicos' },
}

export const MODE_OPTIONS = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'colorblind', label: 'Daltonico' },
]

export const CATALOG_TABS = ['Todos', 'Tote bags', 'Carteras', 'Uni bags', 'Bandoleras', 'Accesorios']
export const SUB_CATEGORIAS_BOLSOS = ['Tote bags', 'Carteras', 'Uni bags', 'Bandoleras']
export const SUB_CATEGORIAS_ACCESORIOS = ['Cinturones', 'Lentes', 'Extras']

export const PALETTE_CLIPBOARD_KEY = 'aura:paletteClipboard'

export const EDITABLE_COLORS = [
  { cssVar: '--primary-color', label: 'Primario', resolve: (v) => v['--banner-color-1'] || v['--accent-alt'] || '#c44b6a' },
  { cssVar: '--secondary-color', label: 'Secundario', resolve: (v) => v['--banner-color-2'] || v['--accent'] || '#d96b2d' },
  { cssVar: '--bg', label: 'Fondos', resolve: (v) => v['--bg'] || '#f6f0e6' },
  { cssVar: '--card', label: 'Cards', resolve: (v) => v['--card'] || '#efe7d0' },
  { cssVar: '--text-color', label: 'Textos', resolve: (v) => v['--color-body'] || '#2b2318' },
]

export const TYPOGRAPHY_GROUPS = [
  { key: 'titles', label: 'Titulos', minSize: 8, maxSize: 140 },
  { key: 'subtitles', label: 'Subtitulos', minSize: 8, maxSize: 140 },
  { key: 'paragraphs', label: 'Parrafos', minSize: 8, maxSize: 140 },
]

export const WHATSAPP_URL = 'https://wa.link/ajq4wy'
export const INSTAGRAM_URL = 'https://www.instagram.com/theaura.a/'
