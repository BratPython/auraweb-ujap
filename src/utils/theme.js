import {
  DEFAULT_TYPOGRAPHY,
  BASE_PALETTE_LIGHT,
  BASE_PALETTE_DARK,
  BASE_PALETTE_COLORBLIND,
  FALLBACK_STATE,
} from '../config/theme'

export function mergeTypography(input = {}) {
  return {
    titles: { ...DEFAULT_TYPOGRAPHY.titles, ...(input.titles || {}) },
    subtitles: { ...DEFAULT_TYPOGRAPHY.subtitles, ...(input.subtitles || {}) },
    paragraphs: { ...DEFAULT_TYPOGRAPHY.paragraphs, ...(input.paragraphs || {}) },
    buttons: { ...DEFAULT_TYPOGRAPHY.buttons, ...(input.buttons || {}) },
    banner: { ...DEFAULT_TYPOGRAPHY.banner, ...(input.banner || {}) },
  }
}

export function buildVarsFromTypography(typography) {
  const buttonSize = typography.buttons?.size || typography.paragraphs.size

  return {
    '--size-title': typography.titles.size,
    '--font-title': typography.titles.family,
    '--letter-title': typography.titles.spacing,
    '--size-subtitle': typography.subtitles.size,
    '--font-subtitle': typography.subtitles.family,
    '--letter-subtitle': typography.subtitles.spacing,
    '--size-body': typography.paragraphs.size,
    '--font-body': typography.paragraphs.family,
    '--letter-body': typography.paragraphs.spacing,
    '--size-banner': typography.banner.size,
    '--font-banner': typography.banner.family,
    '--letter-banner': typography.banner.spacing,
    '--size-hero': typography.banner.size,
    '--size-hero-alt': typography.banner.size,
    '--font-hero': typography.banner.family,
    '--font-hero-alt': typography.banner.family,
    '--font-brand': typography.titles.family,
    '--size-brand': typography.titles.size,
    '--letter-brand': typography.titles.spacing,
    '--font-nav': typography.paragraphs.family,
    '--size-nav': buttonSize,
    '--font-card-title': typography.paragraphs.family,
    '--size-card-title': '16px',
    '--font-btn': typography.paragraphs.family,
    '--size-btn': buttonSize,
    '--font-btn-hover': typography.paragraphs.family,
    '--size-btn-hover': buttonSize,
    '--font-footer-title': typography.subtitles.family,
    '--size-footer-title': typography.subtitles.size,
    '--font-footer': typography.paragraphs.family,
    '--size-footer': typography.paragraphs.size,
  }
}

const PALETTE_DEFAULTS = {
  light: { id: 'light-default', name: 'Claro Default', values: { ...BASE_PALETTE_LIGHT } },
  dark: { id: 'dark-default', name: 'Oscuro Default', values: { ...BASE_PALETTE_DARK } },
  colorblind: { id: 'colorblind-default', name: 'Daltonicos Default', values: { ...BASE_PALETTE_COLORBLIND } },
}

function normalizeCategoryList(list, category) {
  if (!Array.isArray(list)) list = []

  const baseValues = PALETTE_DEFAULTS[category].values
  const normalized = list.filter(Boolean).map((p, idx) => ({
    id: p.id || `${category}-${idx + 1}`,
    name: p.name || `${category}-${idx + 1}`,
    values: {
      ...baseValues,
      ...(p.values || {}),
      '--btn-bg': (p.values && p.values['--card']) || baseValues['--card'],
    },
  }))

  if (normalized.length === 0) return [{ ...PALETTE_DEFAULTS[category] }]
  return normalized
}

export function normalizeThemeSettings(raw) {
  if (!raw || typeof raw !== 'object') return FALLBACK_STATE

  if (raw.palettesByMode && raw.activePaletteIds) {
    const light = normalizeCategoryList(raw.palettesByMode.light, 'light')
    const dark = normalizeCategoryList(raw.palettesByMode.dark, 'dark')
    const colorblind = normalizeCategoryList(raw.palettesByMode.colorblind, 'colorblind')

    const activePaletteIds = {
      light: light.some((p) => p.id === raw.activePaletteIds.light) ? raw.activePaletteIds.light : light[0].id,
      dark: dark.some((p) => p.id === raw.activePaletteIds.dark) ? raw.activePaletteIds.dark : dark[0].id,
      colorblind: colorblind.some((p) => p.id === raw.activePaletteIds.colorblind) ? raw.activePaletteIds.colorblind : colorblind[0].id,
    }

    return {
      palettesByMode: { light, dark, colorblind },
      activePaletteIds,
      typography: mergeTypography(raw.typography),
      tangramLoader: raw.tangramLoader !== false,
    }
  }

  return FALLBACK_STATE
}

export function getActivePaletteByMode(themeSettings, mode) {
  const list = themeSettings.palettesByMode[mode] || []
  const activeId = themeSettings.activePaletteIds[mode]
  return list.find((p) => p.id === activeId) || list[0]
}
