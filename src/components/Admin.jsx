import React, { useEffect, useMemo, useRef, useState } from 'react'
import Landing from './Landing'
import { supabase } from '../supabaseClient'

const BUILTIN_FONTS = [
  { label: 'AuraLogo', value: "'AuraLogo', Georgia, serif", family: 'AuraLogo' },
  { label: 'Playfair Display', value: "'Playfair Display', Georgia, serif", family: 'Playfair Display' },
  { label: 'Georgia', value: 'Georgia, serif', family: 'Georgia' },
  { label: 'Inter', value: "'Inter', sans-serif", family: 'Inter' },
  { label: 'Arial', value: 'Arial, sans-serif', family: 'Arial' }
]

const CATEGORY_META = {
  light: { label: 'Paletas Modo Claro' },
  dark: { label: 'Paletas Modo Oscuro' },
  colorblind: { label: 'Paletas Daltonicos' }
}

const PALETTE_CLIPBOARD_KEY = 'aura:paletteClipboard'

function pxToNumber(value, fallback = 16) {
  const parsed = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function toPx(value, min = 0, max = 200) {
  const n = Math.max(min, Math.min(max, Number(value) || 0))
  return `${n}px`
}

function createPaletteId(category) {
  return `${category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function normalizeHex(raw, fallback = '#000000') {
  if (typeof raw !== 'string') return fallback
  const val = raw.trim().toLowerCase()

  if (/^#[0-9a-f]{6}$/i.test(val)) return val
  if (/^#[0-9a-f]{3}$/i.test(val)) {
    return `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`
  }

  const stripped = val.replace(/[^0-9a-f]/gi, '')
  if (stripped.length === 6) return `#${stripped}`
  if (stripped.length === 3) return `#${stripped[0]}${stripped[0]}${stripped[1]}${stripped[1]}${stripped[2]}${stripped[2]}`

  return fallback
}

function registerFont(name, url) {
  const source = `url('${url}')`
  const face = new FontFace(name, source, { display: 'swap' })
  face
    .load()
    .then((loaded) => document.fonts.add(loaded))
    .catch((err) => console.warn(`No se pudo cargar la fuente ${name}:`, err))
}

function extractPaletteValues(raw) {
  if (!raw || typeof raw !== 'object') return null

  const maybeValues = raw.values && typeof raw.values === 'object' ? raw.values : raw
  const entries = Object.entries(maybeValues).filter(([k, v]) => k.startsWith('--') && typeof v === 'string')

  if (entries.length === 0) return null
  return Object.fromEntries(entries)
}

function typographyToCssVars(typography) {
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
    '--font-nav': typography.paragraphs.family,
    '--font-card-title': typography.paragraphs.family,
    '--font-btn': typography.paragraphs.family,
    '--font-btn-hover': typography.paragraphs.family,
    '--font-footer-title': typography.subtitles.family,
    '--font-footer': typography.paragraphs.family
  }
}

export default function Admin({ themeSettings, setThemeSettings }) {
  const [editingCategory, setEditingCategory] = useState('light')
  const [editingId, setEditingId] = useState('')
  const [newPaletteName, setNewPaletteName] = useState('')

  const [searchByCategory, setSearchByCategory] = useState({
    light: '',
    dark: '',
    colorblind: ''
  })

  const [customFonts, setCustomFonts] = useState([])
  const [uploadingFont, setUploadingFont] = useState(false)
  const [hexDrafts, setHexDrafts] = useState({})
  const [paletteClipboard, setPaletteClipboard] = useState(null)
  const [clipboardNote, setClipboardNote] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    const firstLight = themeSettings?.activePaletteIds?.light
    if (firstLight && !editingId) {
      setEditingCategory('light')
      setEditingId(firstLight)
    }
  }, [themeSettings, editingId])

  useEffect(() => {
    // Reset drafts when changing palette/category to avoid stale text values.
    setHexDrafts({})
  }, [editingCategory, editingId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PALETTE_CLIPBOARD_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const values = extractPaletteValues(parsed)
      if (values) {
        setPaletteClipboard({
          sourceCategory: parsed.sourceCategory || 'light',
          sourceName: parsed.sourceName || 'Paleta copiada',
          values
        })
      }
    } catch (err) {
      console.warn('No se pudo leer el portapapeles local de paletas:', err)
    }
  }, [])

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
      ...customFonts.map((f) => ({ label: f.name, value: `'${f.name}', sans-serif`, family: f.name }))
    ]
  }, [customFonts])

  const editingPalette = useMemo(() => {
    const list = themeSettings.palettesByMode[editingCategory] || []
    return list.find((p) => p.id === editingId) || list[0] || null
  }, [themeSettings, editingCategory, editingId])

  const previewVars = useMemo(() => {
    const paletteValues = editingPalette?.values || {}
    return {
      ...paletteValues,
      ...typographyToCssVars(themeSettings.typography)
    }
  }, [editingPalette, themeSettings.typography])

  function setActivePalette(category, id) {
    setThemeSettings((prev) => ({
      ...prev,
      activePaletteIds: {
        ...prev.activePaletteIds,
        [category]: id
      }
    }))
  }

  function selectPalette(category, id) {
    setEditingCategory(category)
    setEditingId(id)
  }

  function addPalette(category) {
    const source =
      (themeSettings.palettesByMode[category] || []).find((p) => p.id === themeSettings.activePaletteIds[category]) ||
      (themeSettings.palettesByMode[category] || [])[0]

    if (!source) return

    const id = createPaletteId(category)
    const trimmedName = newPaletteName.trim()
    const name = trimmedName || `Nueva ${CATEGORY_META[category].label} ${themeSettings.palettesByMode[category].length + 1}`

    const nextPalette = {
      id,
      name,
      values: { ...source.values }
    }

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: [...prev.palettesByMode[category], nextPalette]
      }
    }))

    setNewPaletteName('')
    selectPalette(category, id)
  }

  function renamePalette(category, id, name) {
    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: prev.palettesByMode[category].map((p) => (p.id === id ? { ...p, name } : p))
      }
    }))
  }

  function deletePalette(category, id) {
    const list = themeSettings.palettesByMode[category]
    if (list.length <= 1) return

    const filtered = list.filter((p) => p.id !== id)
    const nextActive = themeSettings.activePaletteIds[category] === id ? filtered[0].id : themeSettings.activePaletteIds[category]

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: filtered
      },
      activePaletteIds: {
        ...prev.activePaletteIds,
        [category]: nextActive
      }
    }))

    if (editingCategory === category && editingId === id) {
      setEditingId(filtered[0].id)
    }
  }

  function updatePaletteValues(map) {
    if (!editingPalette) return

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [editingCategory]: prev.palettesByMode[editingCategory].map((p) => {
          if (p.id !== editingPalette.id) return p
          return { ...p, values: { ...p.values, ...map } }
        })
      }
    }))
  }

  function updateEditingPaletteVar(cssVar, value) {
    if (!editingPalette) return

    if (cssVar === '--text-color') {
      updatePaletteValues({
        '--color-body': value,
        '--color-title': value,
        '--color-subtitle': value,
        '--color-brand': value,
        '--color-nav': value,
        '--color-card-title': value
      })
      return
    }

    if (cssVar === '--bg') {
      updatePaletteValues({
        '--bg': value,
        '--header-bg': value
      })
      return
    }

    if (cssVar === '--primary-color') {
      updatePaletteValues({
        '--banner-color-1': value,
        '--accent-alt': value
      })
      return
    }

    if (cssVar === '--secondary-color') {
      updatePaletteValues({
        '--banner-color-2': value,
        '--accent': value,
        '--btn-hover': value,
        '--footer-bg': value
      })
      return
    }

    updatePaletteValues({ [cssVar]: value })
  }

  function onHexChange(cssVar, rawValue) {
    setHexDrafts((prev) => ({ ...prev, [cssVar]: rawValue }))
  }

  function onHexEnter(cssVar, rawValue, fallback) {
    const normalized = normalizeHex(rawValue, fallback)
    updateEditingPaletteVar(cssVar, normalized)
    setHexDrafts((prev) => ({ ...prev, [cssVar]: normalized }))
  }

  function onColorPickerChange(cssVar, value) {
    updateEditingPaletteVar(cssVar, value)
    setHexDrafts((prev) => ({ ...prev, [cssVar]: value }))
  }

  function updateTypography(group, field, value) {
    setThemeSettings((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        [group]: {
          ...prev.typography[group],
          [field]: value
        }
      }
    }))
  }

  function persistPaletteClipboard(payload) {
    setPaletteClipboard(payload)
    localStorage.setItem(PALETTE_CLIPBOARD_KEY, JSON.stringify(payload))
  }

  async function copyPalette(category, palette) {
    const payload = {
      sourceCategory: category,
      sourceName: palette.name,
      values: { ...palette.values }
    }

    persistPaletteClipboard(payload)

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload.values, null, 2))
      setClipboardNote(`Paleta "${palette.name}" copiada.`)
    } catch {
      setClipboardNote(`Paleta "${palette.name}" guardada localmente (sin acceso al portapapeles del navegador).`)
    }
  }

  function createPaletteFromValues(category, values, baseName = 'Copia') {
    const source =
      (themeSettings.palettesByMode[category] || []).find((p) => p.id === themeSettings.activePaletteIds[category]) ||
      (themeSettings.palettesByMode[category] || [])[0]

    if (!source) return

    const id = createPaletteId(category)
    const name = `${baseName} ${themeSettings.palettesByMode[category].length + 1}`
    const nextPalette = {
      id,
      name,
      values: { ...source.values, ...values }
    }

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: [...prev.palettesByMode[category], nextPalette]
      }
    }))

    selectPalette(category, id)
  }

  function pastePaletteFromLocal(category) {
    if (!paletteClipboard?.values) {
      setClipboardNote('No hay paleta copiada para pegar.')
      return
    }

    createPaletteFromValues(category, paletteClipboard.values, `Copia de ${paletteClipboard.sourceName || 'paleta'}`)
    setClipboardNote('Paleta pegada como nueva.')
  }

  async function pastePaletteFromSystem(category) {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = JSON.parse(text)
      const values = extractPaletteValues(parsed)

      if (!values) {
        setClipboardNote('El contenido del portapapeles no es una paleta valida.')
        return
      }

      const payload = {
        sourceCategory: category,
        sourceName: parsed.sourceName || 'Portapapeles',
        values
      }

      persistPaletteClipboard(payload)
      createPaletteFromValues(category, values, `Pegada desde portapapeles`)
      setClipboardNote('Paleta pegada desde portapapeles.')
    } catch (err) {
      setClipboardNote('No se pudo leer el portapapeles del navegador. Usa "Copiar" primero.')
      console.warn('Error pegando desde portapapeles:', err)
    }
  }

  async function handleFontUpload(e) {
    const file = e.target.files?.[0]
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
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('recursos_aura')
        .getPublicUrl(storageFileName)

      const rootPayload = {
        name: origName,
        font_url: urlData.publicUrl,
        created_at: new Date().toISOString()
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
      e.target.value = ''
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

  return (
    <div className="admin-page admin-v2-page">
      <div className="admin-v2-layout">
        <div className="admin-v2-sidebar">
          <div className="editor-card">
            <h2 className="admin-title">Administrador de Paletas y Tipografia</h2>
            <p className="admin-note">Siempre hay una paleta activa por categoria y nunca se permite dejar una categoria sin paletas.</p>
          </div>

          {Object.keys(CATEGORY_META).map((category) => {
            const list = themeSettings.palettesByMode[category]
            const query = searchByCategory[category].toLowerCase().trim()
            const filtered = list.filter((p) => p.name.toLowerCase().includes(query))
            const activeId = themeSettings.activePaletteIds[category]

            return (
              <div key={category} className="editor-card">
                <h4>{CATEGORY_META[category].label}</h4>

                <input
                  className="palette-search"
                  placeholder="Buscar paleta por nombre..."
                  value={searchByCategory[category]}
                  onChange={(e) => setSearchByCategory((prev) => ({ ...prev, [category]: e.target.value }))}
                />

                <div className="saved-palette-list">
                  {filtered.map((palette) => {
                    const isEditing = editingCategory === category && editingId === palette.id
                    const isActive = activeId === palette.id
                    const canDelete = list.length > 1
                    return (
                      <div key={palette.id} className={`saved-palette-item${isEditing ? ' active-edit' : ''}`}>
                        <div className="palette-swatches">
                          <div className="palette-swatch" style={{ background: palette.values['--bg'] }} />
                          <div className="palette-swatch" style={{ background: palette.values['--accent'] }} />
                        </div>

                        <input
                          className="palette-name-input"
                          value={palette.name}
                          onChange={(e) => renamePalette(category, palette.id, e.target.value)}
                        />

                        <div className="saved-palette-actions">
                          <button className="btn-sm" onClick={() => selectPalette(category, palette.id)}>
                            {isEditing ? 'Editando' : 'Editar'}
                          </button>
                          <button className="btn-sm" onClick={() => copyPalette(category, palette)}>
                            Copiar
                          </button>
                          <button className={`btn-sm ${isActive ? 'btn-sm-active' : ''}`} onClick={() => setActivePalette(category, palette.id)}>
                            {isActive ? 'Activa' : 'Activar'}
                          </button>
                          <button
                            className="btn-sm btn-sm-danger"
                            disabled={!canDelete}
                            title={canDelete ? 'Eliminar paleta' : 'Debe quedar al menos una paleta por categoria'}
                            onClick={() => deletePalette(category, palette.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {filtered.length === 0 && <p className="admin-note">No hay paletas con ese nombre.</p>}
                </div>

                <div className="palette-save-row">
                  <input
                    placeholder="Nombre de nueva paleta"
                    value={newPaletteName}
                    onChange={(e) => setNewPaletteName(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={() => addPalette(category)}>Crear</button>
                </div>

                <div className="palette-save-row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => pastePaletteFromLocal(category)}>
                    Pegar Copia
                  </button>
                  <button className="btn" onClick={() => pastePaletteFromSystem(category)}>
                    Pegar Portapapeles
                  </button>
                </div>

                {clipboardNote ? <p className="admin-note" style={{ marginTop: 8 }}>{clipboardNote}</p> : null}
              </div>
            )
          })}

          {editingPalette && (
            <div className="editor-card">
              <h4>Editando paleta: {editingPalette.name}</h4>
              <p className="admin-note" style={{ marginBottom: 10 }}>
                Colores editables: primario, secundario, fondo, cards y textos. El fondo tambien aplica al header.
              </p>
              <div className="palette-editor">
                {[
                  ['--primary-color', 'Primario', editingPalette.values['--banner-color-1'] || editingPalette.values['--accent-alt'] || '#c44b6a'],
                  ['--secondary-color', 'Secundario', editingPalette.values['--banner-color-2'] || editingPalette.values['--accent'] || '#d96b2d'],
                  ['--bg', 'Fondos', editingPalette.values['--bg'] || '#f6f0e6'],
                  ['--card', 'Cards', editingPalette.values['--card'] || '#efe7d0'],
                  ['--text-color', 'Textos', editingPalette.values['--color-body'] || '#2b2318']
                ].map(([key, label, value]) => {
                  const safeValue = normalizeHex(value)
                  const inputValue = hexDrafts[key] ?? safeValue
                  return (
                    <div className="color-row" key={key}>
                      <span className="var-name">{label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="color"
                          value={safeValue}
                          onChange={(e) => onColorPickerChange(key, e.target.value)}
                        />
                        <input
                          type="text"
                          className="hex"
                          value={inputValue}
                          onChange={(e) => onHexChange(key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              onHexEnter(key, e.currentTarget.value, safeValue)
                            }
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="editor-card">
            <h4>Tipografia editable</h4>
            <p className="admin-note">Solo: Titulos, Subtitulos, Parrafos y Banner (fuente, tamano y espaciado).</p>

            {[{ key: 'titles', label: 'Titulos' }, { key: 'subtitles', label: 'Subtitulos' }, { key: 'paragraphs', label: 'Parrafos' }].map(({ key, label }) => (
              <div className="text-editor-row" key={key}>
                <div className="text-editor-header"><strong>{label}</strong></div>
                <div className="text-editor-controls stack">
                  <div className="control-line control-line-select">
                    <span>Fuente</span>
                    <select className="word-select" value={themeSettings.typography[key].family} onChange={(e) => updateTypography(key, 'family', e.target.value)}>
                      {allFonts.map((f) => (
                        <option key={f.value} value={f.value} style={{ fontFamily: f.family }}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-line control-line-input">
                    <span>Tamano</span>
                    <input
                      type="number"
                      min="8"
                      max="140"
                      className="word-select"
                      value={pxToNumber(themeSettings.typography[key].size)}
                      onChange={(e) => updateTypography(key, 'size', toPx(e.target.value, 8, 140))}
                    />
                  </div>

                  <div className="control-line control-line-slider">
                    <span>Espaciado</span>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      className="letter-slider"
                      value={pxToNumber(themeSettings.typography[key].spacing, 0)}
                      style={{ '--slider-value': `${(pxToNumber(themeSettings.typography[key].spacing, 0) / 24) * 100}%` }}
                      onChange={(e) => updateTypography(key, 'spacing', toPx(e.target.value, 0, 24))}
                    />
                    <strong>{themeSettings.typography[key].spacing}</strong>
                  </div>
                </div>
              </div>
            ))}

            <div className="text-editor-row">
              <div className="text-editor-header"><strong>Banner</strong></div>
              <div className="text-editor-controls stack">
                <div className="control-line control-line-select">
                  <span>Fuente</span>
                  <select className="word-select" value={themeSettings.typography.banner.family} onChange={(e) => updateTypography('banner', 'family', e.target.value)}>
                    {allFonts.map((f) => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.family }}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="control-line control-line-input">
                  <span>Tamano general</span>
                  <input
                    type="number"
                    min="24"
                    max="200"
                    className="word-select"
                    value={pxToNumber(themeSettings.typography.banner.size, 94)}
                    onChange={(e) => updateTypography('banner', 'size', toPx(e.target.value, 24, 200))}
                  />
                </div>
                <div className="control-line control-line-slider">
                  <span>Espaciado</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    className="letter-slider"
                    value={pxToNumber(themeSettings.typography.banner.spacing, 1)}
                    style={{ '--slider-value': `${(pxToNumber(themeSettings.typography.banner.spacing, 1) / 24) * 100}%` }}
                    onChange={(e) => updateTypography('banner', 'spacing', toPx(e.target.value, 0, 24))}
                  />
                  <strong>{themeSettings.typography.banner.spacing}</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'rgba(128,128,128,.08)' }}>
              <h5 style={{ margin: '0 0 8px 0' }}>Fuentes personalizadas</h5>
              <button className="btn-upload" onClick={() => fileInputRef.current?.click()} disabled={uploadingFont}>
                {uploadingFont ? 'Subiendo...' : 'Subir fuente local (.ttf, .otf, .woff)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff"
                style={{ display: 'none' }}
                onChange={handleFontUpload}
              />

              {customFonts.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {customFonts.map((f) => (
                    <div
                      key={f.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,.04)',
                        marginBottom: 6
                      }}
                    >
                      <span style={{ fontFamily: f.name }}>{f.name}</span>
                      <button className="btn-sm btn-sm-danger" onClick={() => removeCustomFont(f.name)}>
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="preview-panel scroller" style={{ height: 'calc(100vh - 48px)', padding: '0 8px 0 0' }}>
          <div className="editor-card" style={{ marginBottom: 12 }}>
            <h4>Vista previa de pagina</h4>
            <p className="admin-note">Esta vista usa la paleta en edicion y la tipografia configurada.</p>
          </div>
          <div className="preview-frame">
            <div className="preview-frame-inner" style={previewVars}>
              <Landing activeMode="light" onModeChange={() => { }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
