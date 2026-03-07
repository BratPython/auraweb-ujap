import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/Landing'
import Admin from './components/Admin'
import Catalog from './components/Catalog'
import ProductDetail from './components/ProductDetail'
import { supabase } from './supabaseClient'
import './styles.css'

const BASE_FONTS = {
  logo: "'AuraLogo', Georgia, serif",
  serif: "'Playfair Display', Georgia, serif",
  body: "'Inter', sans-serif"
}

const BASE_PALETTE_LIGHT = {
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
  '--color-banner-text': '#fef8ef'
}

const BASE_PALETTE_DARK = {
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
  '--color-banner-text': '#fdf7ea'
}

const BASE_PALETTE_COLORBLIND = {
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
  '--color-banner-text': '#ffffff'
}

const DEFAULT_TYPOGRAPHY = {
  titles: { size: '36px', family: BASE_FONTS.serif, spacing: '0px' },
  subtitles: { size: '28px', family: BASE_FONTS.serif, spacing: '0px' },
  paragraphs: { size: '16px', family: BASE_FONTS.body, spacing: '0px' },
  banner: { size: '94px', family: BASE_FONTS.logo, spacing: '1px' }
}

const FALLBACK_STATE = {
  palettesByMode: {
    light: [{ id: 'light-default', name: 'Claro Default', values: { ...BASE_PALETTE_LIGHT } }],
    dark: [{ id: 'dark-default', name: 'Oscuro Default', values: { ...BASE_PALETTE_DARK } }],
    colorblind: [{ id: 'colorblind-default', name: 'Daltonicos Default', values: { ...BASE_PALETTE_COLORBLIND } }]
  },
  activePaletteIds: {
    light: 'light-default',
    dark: 'dark-default',
    colorblind: 'colorblind-default'
  },
  typography: { ...DEFAULT_TYPOGRAPHY }
}

let lastLoadedString = ''

function mergeTypography(input = {}) {
  return {
    titles: { ...DEFAULT_TYPOGRAPHY.titles, ...(input.titles || {}) },
    subtitles: { ...DEFAULT_TYPOGRAPHY.subtitles, ...(input.subtitles || {}) },
    paragraphs: { ...DEFAULT_TYPOGRAPHY.paragraphs, ...(input.paragraphs || {}) },
    banner: { ...DEFAULT_TYPOGRAPHY.banner, ...(input.banner || {}) }
  }
}

function buildVarsFromTypography(typography) {
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
    '--font-brand': typography.banner.family,
    '--size-brand': '32px',
    '--font-nav': typography.paragraphs.family,
    '--size-nav': '14px',
    '--font-card-title': typography.paragraphs.family,
    '--size-card-title': '16px',
    '--font-btn': typography.paragraphs.family,
    '--size-btn': '14px',
    '--font-btn-hover': typography.paragraphs.family,
    '--size-btn-hover': '14px',
    '--font-footer-title': typography.subtitles.family,
    '--size-footer-title': '16px',
    '--font-footer': typography.paragraphs.family,
    '--size-footer': '14px'
  }
}

function normalizeCategoryList(list, category) {
  if (!Array.isArray(list)) list = []

  const defaults = {
    light: { id: 'light-default', name: 'Claro Default', values: { ...BASE_PALETTE_LIGHT } },
    dark: { id: 'dark-default', name: 'Oscuro Default', values: { ...BASE_PALETTE_DARK } },
    colorblind: { id: 'colorblind-default', name: 'Daltonicos Default', values: { ...BASE_PALETTE_COLORBLIND } }
  }

  const baseValues = defaults[category].values
  const normalized = list.filter(Boolean).map((p, idx) => ({
    id: p.id || `${category}-${idx + 1}`,
    name: p.name || `${category}-${idx + 1}`,
    values: { ...baseValues, ...(p.values || {}) }
  }))

  if (normalized.length === 0) return [{ ...defaults[category] }]
  return normalized
}

function normalizeThemeSettings(raw) {
  if (!raw || typeof raw !== 'object') return FALLBACK_STATE

  if (raw.palettesByMode && raw.activePaletteIds) {
    const light = normalizeCategoryList(raw.palettesByMode.light, 'light')
    const dark = normalizeCategoryList(raw.palettesByMode.dark, 'dark')
    const colorblind = normalizeCategoryList(raw.palettesByMode.colorblind, 'colorblind')

    const activePaletteIds = {
      light: light.some((p) => p.id === raw.activePaletteIds.light) ? raw.activePaletteIds.light : light[0].id,
      dark: dark.some((p) => p.id === raw.activePaletteIds.dark) ? raw.activePaletteIds.dark : dark[0].id,
      colorblind: colorblind.some((p) => p.id === raw.activePaletteIds.colorblind) ? raw.activePaletteIds.colorblind : colorblind[0].id
    }

    return {
      palettesByMode: { light, dark, colorblind },
      activePaletteIds,
      typography: mergeTypography(raw.typography)
    }
  }

  return FALLBACK_STATE
}

function getActivePaletteByMode(themeSettings, mode) {
  const list = themeSettings.palettesByMode[mode] || []
  const activeId = themeSettings.activePaletteIds[mode]
  return list.find((p) => p.id === activeId) || list[0]
}

function App() {
  const [themeSettings, setThemeSettings] = useState(null)
  const [activeMode, setActiveMode] = useState('light')
  const [globalDocId, setGlobalDocId] = useState('global')

  useEffect(() => {
    async function fetchTheme() {
      try {
        const { data, error } = await supabase.from('theme_settings').select('*').eq('is_active', true).limit(1)

        if (error) {
          console.error('Error cargando theme_settings:', error)
          setThemeSettings(FALLBACK_STATE)
          return
        }

        if (data && data.length > 0) {
          const doc = data[0]
          setGlobalDocId(doc.id)
          const normalized = normalizeThemeSettings(doc.settings)
          lastLoadedString = JSON.stringify(normalized)
          setThemeSettings(normalized)
        } else {
          setThemeSettings(FALLBACK_STATE)
        }
      } catch (err) {
        console.error('Excepcion cargando theme:', err)
        setThemeSettings(FALLBACK_STATE)
      }
    }

    fetchTheme()
  }, [])

  useEffect(() => {
    if (!themeSettings) return

    const saveChanges = async () => {
      const payloadString = JSON.stringify(themeSettings)
      if (payloadString === lastLoadedString) return

      try {
        const { error } = await supabase.from('theme_settings').upsert({
          id: globalDocId,
          settings: themeSettings,
          is_active: true,
          updated_at: new Date().toISOString()
        })

        if (error) {
          console.error('Error guardando cambios en Supabase:', error)
        } else {
          lastLoadedString = payloadString
        }
      } catch (e) {
        console.error('Fallo general al guardar theme:', e)
      }
    }

    saveChanges()
  }, [themeSettings, globalDocId])

  useEffect(() => {
    if (!themeSettings) return

    const root = document.documentElement
    const modeKey = activeMode === 'dark' || activeMode === 'colorblind' ? activeMode : 'light'
    const palette = getActivePaletteByMode(themeSettings, modeKey)
    const typographyVars = buildVarsFromTypography(themeSettings.typography)
    const mergedVars = {
      ...(palette?.values || {}),
      ...typographyVars
    }

    Object.entries(mergedVars).forEach(([k, v]) => root.style.setProperty(k, v))
  }, [themeSettings, activeMode])

  if (!themeSettings) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f0e6', color: '#2b2318', fontFamily: 'sans-serif' }}>
        <p>Cargando tema...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin themeSettings={themeSettings} setThemeSettings={setThemeSettings} />} />
        <Route path="/" element={<Landing activeMode={activeMode} onModeChange={setActiveMode} />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
