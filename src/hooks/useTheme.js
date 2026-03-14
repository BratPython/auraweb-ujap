import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { FALLBACK_STATE } from '../config/theme'
import { normalizeThemeSettings, buildVarsFromTypography, getActivePaletteByMode } from '../utils/theme'
import { registerFont } from '../utils/fonts'

function parseColorToRgb(color) {
  if (!color || typeof color !== 'string') return null
  const value = color.trim()

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    let raw = hex[1]
    if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('')
    const intVal = Number.parseInt(raw, 16)
    return {
      r: (intVal >> 16) & 255,
      g: (intVal >> 8) & 255,
      b: intVal & 255,
    }
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i)
  if (rgb) {
    const parts = rgb[1].split(',').map((x) => Number.parseFloat(x.trim()))
    if (parts.length >= 3 && parts.every((n, idx) => idx > 2 || Number.isFinite(n))) {
      return { r: parts[0], g: parts[1], b: parts[2] }
    }
  }

  return null
}

function luminanceChannel(v) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function contrastRatio(a, b) {
  const l1 = 0.2126 * luminanceChannel(a.r) + 0.7152 * luminanceChannel(a.g) + 0.0722 * luminanceChannel(a.b)
  const l2 = 0.2126 * luminanceChannel(b.r) + 0.7152 * luminanceChannel(b.g) + 0.0722 * luminanceChannel(b.b)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

function pickBlackOrWhiteByContrast(bgColor) {
  const bg = parseColorToRgb(bgColor)
  if (!bg) return '#000000'

  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 0, g: 0, b: 0 }
  return contrastRatio(bg, white) >= contrastRatio(bg, black) ? '#ffffff' : '#000000'
}

export function useTheme() {
  const [themeSettings, setThemeSettings] = useState(null)
  const [activeMode, setActiveMode] = useState('light')
  const [globalDocId, setGlobalDocId] = useState('global')
  const lastLoadedRef = useRef('')

  // Fetch theme from Supabase on mount
  useEffect(() => {
    async function fetchTheme() {
      try {
        const { data, error } = await supabase
          .from('theme_settings')
          .select('*')
          .eq('is_active', true)
          .limit(1)

        if (error) {
          console.error('Error cargando theme_settings:', error)
          setThemeSettings(FALLBACK_STATE)
          return
        }

        if (data && data.length > 0) {
          const doc = data[0]
          setGlobalDocId(doc.id)
          const normalized = normalizeThemeSettings(doc.settings)
          lastLoadedRef.current = JSON.stringify(normalized)
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

  // Persist theme changes to Supabase
  useEffect(() => {
    if (!themeSettings) return

    const saveChanges = async () => {
      const payloadString = JSON.stringify(themeSettings)
      if (payloadString === lastLoadedRef.current) return

      try {
        const { error } = await supabase.from('theme_settings').upsert({
          id: globalDocId,
          settings: themeSettings,
          is_active: true,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          console.error('Error guardando cambios en Supabase:', error)
        } else {
          lastLoadedRef.current = payloadString
        }
      } catch (e) {
        console.error('Fallo general al guardar theme:', e)
      }
    }

    saveChanges()
  }, [themeSettings, globalDocId])

  // Load custom fonts globally so they work outside admin pages too.
  useEffect(() => {
    let cancelled = false

    async function loadCustomFonts() {
      try {
        const { data, error } = await supabase
          .from('custom_fonts')
          .select('name, font_url')

        if (error) {
          console.error('Error cargando fuentes globales:', error)
          return
        }

        if (cancelled) return

        ;(data || []).forEach((font) => {
          registerFont(font.name, font.font_url)
        })
      } catch (err) {
        console.error('Excepcion cargando fuentes globales:', err)
      }
    }

    loadCustomFonts()

    const onFocus = () => loadCustomFonts()
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadCustomFonts()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Apply CSS variables to document root
  useEffect(() => {
    if (!themeSettings) return

    const root = document.documentElement
    const modeKey = activeMode === 'dark' || activeMode === 'colorblind' ? activeMode : 'light'
    const palette = getActivePaletteByMode(themeSettings, modeKey)
    const typographyVars = buildVarsFromTypography(themeSettings.typography)
    const mergedVars = {
      ...(palette?.values || {}),
      ...typographyVars,
    }

    const autoHoverText = pickBlackOrWhiteByContrast(
      mergedVars['--btn-hover'] || mergedVars['--accent'] || '#d96b2d'
    )

    Object.entries(mergedVars).forEach(([k, v]) => root.style.setProperty(k, v))
    root.style.setProperty('--auto-contrast-on-btn-hover', autoHoverText)
    root.style.setProperty('--color-btn-hover', autoHoverText)
  }, [themeSettings, activeMode])

  return { themeSettings, setThemeSettings, activeMode, setActiveMode }
}
