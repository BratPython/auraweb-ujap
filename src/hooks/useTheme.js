import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { FALLBACK_STATE } from '../config/theme'
import { normalizeThemeSettings, buildVarsFromTypography, getActivePaletteByMode } from '../utils/theme'

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

    Object.entries(mergedVars).forEach(([k, v]) => root.style.setProperty(k, v))
  }, [themeSettings, activeMode])

  return { themeSettings, setThemeSettings, activeMode, setActiveMode }
}
