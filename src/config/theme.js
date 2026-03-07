export const BASE_FONTS = {
  logo: "'AuraLogo', Georgia, serif",
  serif: "'Playfair Display', Georgia, serif",
  body: "'Inter', sans-serif",
}

export const BASE_PALETTE_LIGHT = {
  '--bg': '#f6f0e6',
  '--card': '#efe7d0',
  '--header-bg': '#f6f0e6',
  '--btn-bg': '#efe7d0',
  '--btn-hover': '#d96b2d',
  '--accent': '#d96b2d',
  '--accent-alt': '#c44b6a',
  '--banner-color-1': '#c44b6a',
  '--banner-color-2': '#d96b2d',
  '--color-brand': '#2b2318',
  '--color-nav': '#2b2318',
  '--color-title': '#2b2318',
  '--color-subtitle': '#2b2318',
  '--color-body': '#2b2318',
  '--color-card-title': '#7f7158',
  '--color-footer-title': '#ffffff',
  '--color-footer': '#ffffff',
  '--footer-bg': '#d96b2d',
  '--color-banner-text': '#fef8ef',
}

export const BASE_PALETTE_DARK = {
  '--bg': '#1a1816',
  '--card': '#2b2824',
  '--header-bg': '#1a1816',
  '--btn-bg': '#38342e',
  '--btn-hover': '#e07a38',
  '--accent': '#e07a38',
  '--accent-alt': '#7a4a99',
  '--banner-color-1': '#7a4a99',
  '--banner-color-2': '#e07a38',
  '--color-brand': '#f6f0e6',
  '--color-nav': '#f6f0e6',
  '--color-title': '#f6f0e6',
  '--color-subtitle': '#f6f0e6',
  '--color-body': '#f6f0e6',
  '--color-card-title': '#c4b59a',
  '--color-footer-title': '#ffffff',
  '--color-footer': '#f4eee2',
  '--footer-bg': '#2e251b',
  '--color-banner-text': '#fdf7ea',
}

export const BASE_PALETTE_COLORBLIND = {
  '--bg': '#f4f4ef',
  '--card': '#e5e6dc',
  '--header-bg': '#f4f4ef',
  '--btn-bg': '#d9dbcc',
  '--btn-hover': '#0072b2',
  '--accent': '#0072b2',
  '--accent-alt': '#009e73',
  '--banner-color-1': '#009e73',
  '--banner-color-2': '#0072b2',
  '--color-brand': '#1d1d1d',
  '--color-nav': '#1d1d1d',
  '--color-title': '#1d1d1d',
  '--color-subtitle': '#1d1d1d',
  '--color-body': '#1d1d1d',
  '--color-card-title': '#2a2a2a',
  '--color-footer-title': '#ffffff',
  '--color-footer': '#ffffff',
  '--footer-bg': '#005a87',
  '--color-banner-text': '#ffffff',
}

export const DEFAULT_TYPOGRAPHY = {
  titles: { size: '36px', family: BASE_FONTS.serif, spacing: '0px' },
  subtitles: { size: '28px', family: BASE_FONTS.serif, spacing: '0px' },
  paragraphs: { size: '16px', family: BASE_FONTS.body, spacing: '0px' },
  banner: { size: '94px', family: BASE_FONTS.logo, spacing: '1px' },
}

export const FALLBACK_STATE = {
  palettesByMode: {
    light: [{ id: 'light-default', name: 'Claro Default', values: { ...BASE_PALETTE_LIGHT } }],
    dark: [{ id: 'dark-default', name: 'Oscuro Default', values: { ...BASE_PALETTE_DARK } }],
    colorblind: [{ id: 'colorblind-default', name: 'Daltonicos Default', values: { ...BASE_PALETTE_COLORBLIND } }],
  },
  activePaletteIds: {
    light: 'light-default',
    dark: 'dark-default',
    colorblind: 'colorblind-default',
  },
  typography: { ...DEFAULT_TYPOGRAPHY },
}
