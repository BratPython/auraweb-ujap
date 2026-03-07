import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { BUILTIN_FONTS } from '../config/constants'
import { registerFont } from '../utils/fonts'

export function useCustomFonts() {
  const [customFonts, setCustomFonts] = useState([])
  const [uploadingFont, setUploadingFont] = useState(false)

  useEffect(() => {
    async function fetchFonts() {
      try {
        const { data, error } = await supabase.from('custom_fonts').select('*')
        if (error) throw error

        const rows = data || []
        setCustomFonts(rows)
        rows.forEach((font) => registerFont(font.name, font.font_url))
      } catch (err) {
        console.error('Error cargando fuentes personalizadas:', err)
      }
    }

    fetchFonts()
  }, [])

  const allFonts = useMemo(() => {
    return [
      ...BUILTIN_FONTS,
      ...customFonts.map((f) => ({ label: f.name, value: `'${f.name}', sans-serif`, family: f.name })),
    ]
  }, [customFonts])

  async function handleFontUpload(file) {
    if (!file) return

    setUploadingFont(true)

    const origName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9 _-]/g, '')
    const fileExt = file.name.split('.').pop().toLowerCase()
    const storageFileName = `${origName}-${Date.now()}.${fileExt}`

    let mimeType = 'application/octet-stream'
    if (fileExt === 'ttf') mimeType = 'font/ttf'
    else if (fileExt === 'otf') mimeType = 'font/otf'
    else if (fileExt === 'woff') mimeType = 'font/woff'

    const forcedFile = new File([file], file.name, { type: mimeType })

    try {
      const { error: uploadError } = await supabase.storage
        .from('recursos_aura')
        .upload(storageFileName, forcedFile, {
          contentType: mimeType,
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('recursos_aura')
        .getPublicUrl(storageFileName)

      const rootPayload = {
        name: origName,
        font_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
      }

      const { error: dbError } = await supabase.from('custom_fonts').insert(rootPayload)
      if (dbError) throw dbError

      registerFont(origName, rootPayload.font_url)
      setCustomFonts((prev) => [...prev, rootPayload])
    } catch (err) {
      console.error('Error al subir fuente personalizada:', err)
      alert("Hubo un error al guardar la fuente. Verifica bucket 'recursos_aura' y permisos.")
    } finally {
      setUploadingFont(false)
    }
  }

  async function removeCustomFont(fontName) {
    try {
      const { error } = await supabase.from('custom_fonts').delete().eq('name', fontName)
      if (error) throw error
      setCustomFonts((prev) => prev.filter((f) => f.name !== fontName))
    } catch (err) {
      console.error('Error eliminando fuente personalizada:', err)
    }
  }

  return { customFonts, allFonts, uploadingFont, handleFontUpload, removeCustomFont }
}
