import React, { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/Landing'
import Admin from './components/Admin'
import Catalog from './components/Catalog'
import ProductDetail from './components/ProductDetail'
import { supabase } from './supabaseClient'
import './styles.css'

/* === Base Palettes with 12 Grouped Text Elements === */

const baseFonts = {
  brand: "'AuraLogo', Georgia, serif",
  heading: "Georgia, serif",
  body: "'Inter', sans-serif"
}

const defaultLight = {
  '--bg': '#f6f0e6',
  '--card': '#efe7d0',
  '--accent': '#d96b2d',
  '--accent-alt': '#c44b6a',
  '--header-bg': 'rgba(246, 240, 230, 0.85)',
  '--btn-bg': '#efe7d0',
  '--btn-hover': '#d96b2d',
  '--color-brand': '#2b2318', '--size-brand': '32px', '--font-brand': baseFonts.brand,
  '--color-nav': '#2b2318', '--size-nav': '14px', '--font-nav': baseFonts.body,
  '--color-hero': '#d96b2d', '--size-hero': '100px', '--font-hero': baseFonts.brand,
  '--color-hero-alt': '#c44b6a', '--size-hero-alt': '100px', '--font-hero-alt': baseFonts.brand,
  '--color-title': '#2b2318', '--size-title': '36px', '--font-title': baseFonts.heading,
  '--color-subtitle': '#bfae90', '--size-subtitle': '24px', '--font-subtitle': baseFonts.heading,
  '--color-card-title': '#bfae90', '--size-card-title': '16px', '--font-card-title': baseFonts.body,
  '--color-body': '#2b2318', '--size-body': '16px', '--font-body': baseFonts.body,
  '--color-btn': '#2b2318', '--size-btn': '14px', '--font-btn': baseFonts.body,
  '--color-btn-hover': '#ffffff', '--size-btn-hover': '14px', '--font-btn-hover': baseFonts.body,
  '--color-footer-title': '#ffffff', '--size-footer-title': '16px', '--font-footer-title': baseFonts.body,
  '--color-footer': '#ffffff', '--size-footer': '14px', '--font-footer': baseFonts.body,
}

const defaultDark = {
  '--bg': '#1a1816',
  '--card': '#2b2824',
  '--accent': '#e07a38',
  '--accent-alt': '#d15374',
  '--header-bg': 'rgba(26, 24, 22, 0.85)',
  '--btn-bg': '#38342e',
  '--btn-hover': '#e07a38',
  '--color-brand': '#f6f0e6', '--size-brand': '32px', '--font-brand': baseFonts.brand,
  '--color-nav': '#f6f0e6', '--size-nav': '14px', '--font-nav': baseFonts.body,
  '--color-hero': '#e07a38', '--size-hero': '100px', '--font-hero': baseFonts.brand,
  '--color-hero-alt': '#d15374', '--size-hero-alt': '100px', '--font-hero-alt': baseFonts.brand,
  '--color-title': '#f6f0e6', '--size-title': '36px', '--font-title': baseFonts.heading,
  '--color-subtitle': '#a89c83', '--size-subtitle': '24px', '--font-subtitle': baseFonts.heading,
  '--color-card-title': '#a89c83', '--size-card-title': '16px', '--font-card-title': baseFonts.body,
  '--color-body': '#f6f0e6', '--size-body': '16px', '--font-body': baseFonts.body,
  '--color-btn': '#f6f0e6', '--size-btn': '14px', '--font-btn': baseFonts.body,
  '--color-btn-hover': '#ffffff', '--size-btn-hover': '14px', '--font-btn-hover': baseFonts.body,
  '--color-footer-title': '#ffffff', '--size-footer-title': '16px', '--font-footer-title': baseFonts.body,
  '--color-footer': '#ffffff', '--size-footer': '14px', '--font-footer': baseFonts.body,
}

const FALLBACK_STATE = {
  savedPalettes: {
    'Modo Claro (Default)': defaultLight,
    'Modo Oscuro (Default)': defaultDark,
  },
  activeLightId: 'Modo Claro (Default)',
  activeDarkId: 'Modo Oscuro (Default)',
}

// Global variable to avoid re-saving the exact same payload we just loaded
let lastLoadedString = ''

function App() {
  const [themeSettings, setThemeSettings] = useState(null)
  const [activeMode, setActiveMode] = useState('light')
  const [globalDocId, setGlobalDocId] = useState('global')

  // Load from Supabase on mount
  useEffect(() => {
    async function fetchTheme() {
      try {
        const { data, error } = await supabase
          .from('theme_settings')
          .select('*')
          .eq('is_active', true)
          .limit(1)

        if (error) {
          console.error("Error cargando theme_settings de Supabase:", error)
          setThemeSettings(FALLBACK_STATE)
          return
        }

        if (data && data.length > 0) {
          const doc = data[0]
          setGlobalDocId(doc.id) // we save the id to update the exact active row
          const loaded = doc.settings || FALLBACK_STATE
          // Ensure defaults always exist
          if (!loaded.savedPalettes['Modo Claro (Default)']) loaded.savedPalettes['Modo Claro (Default)'] = defaultLight
          if (!loaded.savedPalettes['Modo Oscuro (Default)']) loaded.savedPalettes['Modo Oscuro (Default)'] = defaultDark

          lastLoadedString = JSON.stringify(loaded)
          setThemeSettings(loaded)
        } else {
          console.warn("No se encontró ningún tema activo en la DB, usando fallback e insertaremos uno.")
          setThemeSettings(FALLBACK_STATE)
        }
      } catch (err) {
        console.error("Excepción cargando theme:", err)
        setThemeSettings(FALLBACK_STATE)
      }
    }
    fetchTheme()
  }, [])

  // Inject all custom fonts from Supabase into <head>
  useEffect(() => {
    async function fetchCustomFonts() {
      try {
        const { data, error } = await supabase.from('custom_fonts').select('*')
        if (error) throw error
        if (data) {
          // Create or update a style element to hold our dynamic @font-face rules
          let styleEl = document.getElementById('aura-custom-fonts')
          if (!styleEl) {
            styleEl = document.createElement('style')
            styleEl.id = 'aura-custom-fonts'
            document.head.appendChild(styleEl)
          }

          const fontFaceRules = data.map(font => `
            @font-face {
              font-family: '${font.name}';
              src: url('${font.font_url}');
              font-display: swap;
            }
          `).join('\n')

          styleEl.innerHTML = fontFaceRules
        }
      } catch (err) {
        console.error("Error inyectando fuentes globales:", err)
      }
    }
    fetchCustomFonts()
  }, [])

  // Persist settings reliably after changes
  useEffect(() => {
    if (!themeSettings) return

    const saveChanges = async () => {
      const payloadString = JSON.stringify(themeSettings)
      if (payloadString === lastLoadedString) return // Already saved or just loaded

      try {
        const { error } = await supabase.from('theme_settings').upsert({
          id: globalDocId,
          settings: themeSettings,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        if (error) {
          console.error("Error guardando cambios en Supabase:", error)
        } else {
          lastLoadedString = payloadString // update diffing tracker
        }
      } catch (e) {
        console.error("Fallo general al guardar:", e)
      }
    }
    saveChanges()
  }, [themeSettings, globalDocId])

  // Apply CSS Variables based on current mode
  useEffect(() => {
    if (!themeSettings) return
    const root = document.documentElement
    const currentPaletteId = activeMode === 'light' ? themeSettings.activeLightId : themeSettings.activeDarkId
    const currentPalette = themeSettings.savedPalettes[currentPaletteId] || defaultLight

    Object.entries(currentPalette).forEach(([k, v]) => root.style.setProperty(k, v))
  }, [themeSettings, activeMode])

  function toggleMode() {
    setActiveMode(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Loading Screen to prevent FOUC
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
        <Route
          path="/admin"
          element={
            <Admin
              themeSettings={themeSettings}
              setThemeSettings={setThemeSettings}
            />
          }
        />
        <Route
          path="/"
          element={
            <Landing
              activeMode={activeMode}
              toggleMode={toggleMode}
            />
          }
        />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
