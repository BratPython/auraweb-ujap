import React, { useState, useRef, useEffect } from 'react'
import Landing from './Landing'
import { supabase } from '../supabaseClient'

/* ── built-in fonts ─────────────────────────────────────── */
const BUILTIN_FONTS = [
  { label: 'AuraLogo', value: "'AuraLogo', Georgia, serif", family: 'AuraLogo' },
  { label: 'Georgia', value: 'Georgia, serif', family: 'Georgia' },
  { label: 'Playfair', value: "'Playfair Display', Georgia, serif", family: 'Playfair Display' },
  { label: 'Inter', value: "'Inter', sans-serif", family: 'Inter' },
  { label: 'Arial', value: 'Arial, sans-serif', family: 'Arial' }
]

const FONT_SIZES = [
  '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '64px', '80px', '100px', '120px'
]

function registerFont(name, url) {
  const fontFaceSource = `url('${url}')`

  const face = new FontFace(name, fontFaceSource, {
    display: 'swap'
  })

  face.load()
    .then(loaded => document.fonts.add(loaded))
    .catch(err => console.warn(`Failed loading font ${name} from ${url}:`, err))
}

/* ══════════════════════════════════════════════════════════ */
export default function Admin({ themeSettings, setThemeSettings }) {
  // Local volatile state for the palette currently being edited
  const [local, setLocal] = useState({})
  const [editingId, setEditingId] = useState('')

  const previewRef = useRef(null)
  const [scale, setScale] = useState(0.4)

  const [paletteName, setPaletteName] = useState('')
  const [customFonts, setCustomFonts] = useState([])
  const [uploadingFont, setUploadingFont] = useState(false)
  const fileInputRef = useRef(null)

  const allFonts = [
    ...BUILTIN_FONTS,
    ...customFonts.map(f => ({ label: f.name, value: `'${f.name}', sans-serif`, family: f.name }))
  ]

  // Initialize editor with active Light mode on mount
  useEffect(() => {
    if (themeSettings.activeLightId && themeSettings.savedPalettes[themeSettings.activeLightId]) {
      setLocal(themeSettings.savedPalettes[themeSettings.activeLightId])
      setEditingId(themeSettings.activeLightId)
    }
  }, []) // eslint-disable-line

  // Load custom fonts from Supabase on mount
  useEffect(() => {
    async function fetchFonts() {
      try {
        const { data, error } = await supabase.from('custom_fonts').select('*')
        if (error) throw error
        if (data) {
          setCustomFonts(data)
          data.forEach(f => registerFont(f.name, f.font_url))
        }
      } catch (err) {
        console.error("Error loading custom fonts:", err)
      }
    }
    fetchFonts()
  }, [])

  /* ── handlers ───────────────────────────────────────── */

  // Auto-save any change directly to the currently editing palette in the main settings
  function updateVar(key, value) {
    const nextLocal = { ...local, [key]: value }
    setLocal(nextLocal)

    if (editingId) {
      setThemeSettings(prev => ({
        ...prev,
        savedPalettes: {
          ...prev.savedPalettes,
          [editingId]: nextLocal
        }
      }))
    }
  }

  /* Upload TTF to Supabase Storage & DB */
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

    // FORZAR el type instanciando un nuevo File porque Supabase JS v2 prioriza el tipo interno del Blob
    const forcedFile = new File([file], file.name, { type: mimeType })

    try {
      console.log('Subiendo con mime type:', mimeType)

      // 1. Subir físicamente a Supabase Storage (bucket "recursos_aura")
      const { error: uploadError } = await supabase.storage
        .from('recursos_aura')
        .upload(storageFileName, forcedFile, {
          contentType: mimeType,
          upsert: false
        })

      if (uploadError) throw uploadError

      // 2. Obtener enlace público
      const { data: urlData } = supabase.storage
        .from('recursos_aura')
        .getPublicUrl(storageFileName)

      const fontUrl = urlData.publicUrl

      // 3. Insertar en tabla custom_fonts
      const rootPayload = {
        name: origName,
        font_url: fontUrl,
        created_at: new Date().toISOString()
      }

      const { error: dbError } = await supabase.from('custom_fonts').insert(rootPayload)
      if (dbError) throw dbError

      // 4. Actualizar cliente local
      registerFont(origName, fontUrl)
      setCustomFonts(prev => [...prev, rootPayload])

    } catch (err) {
      console.error("Error al subir fuente a Supabase:", err)
      alert("Hubo un error al guardar la fuente. Verifica que tengas el bucket 'recursos_aura' creado y público.")
    } finally {
      setUploadingFont(false)
      e.target.value = ''
    }
  }

  async function removeCustomFont(fontName) {
    // Note: We are just deleting from the DB here. 
    // To be perfectly tidy, we could also delete the file from storage.
    try {
      const { error } = await supabase.from('custom_fonts').delete().eq('name', fontName)
      if (error) throw error
      setCustomFonts(prev => prev.filter(f => f.name !== fontName))
    } catch (err) {
      console.error("Error eliminando fuente de DB:", err)
    }
  }

  /* Palette Management */
  function saveNewPalette() {
    const name = paletteName.trim()
    if (!name || themeSettings.savedPalettes[name]) return
    const nextSettings = {
      ...themeSettings,
      savedPalettes: { ...themeSettings.savedPalettes, [name]: { ...local } }
    }
    setThemeSettings(nextSettings)
    setEditingId(name)
    setPaletteName('')
  }

  function loadPaletteForEdit(name) {
    const p = themeSettings.savedPalettes[name]
    if (p) {
      setLocal({ ...p })
      setEditingId(name)
    }
  }

  function deletePalette(name) {
    const isSystem = name === 'Modo Claro (Default)' || name === 'Modo Oscuro (Default)'
    if (isSystem) return

    // Fallbacks if deleted active
    let nextLight = themeSettings.activeLightId
    let nextDark = themeSettings.activeDarkId
    if (nextLight === name) nextLight = 'Modo Claro (Default)'
    if (nextDark === name) nextDark = 'Modo Oscuro (Default)'

    const nextSaved = { ...themeSettings.savedPalettes }
    delete nextSaved[name]

    setThemeSettings({
      ...themeSettings,
      savedPalettes: nextSaved,
      activeLightId: nextLight,
      activeDarkId: nextDark
    })

    if (editingId === name) {
      loadPaletteForEdit(nextLight)
    }
  }

  /* Assignments */
  function assignActive(mode, id) {
    setThemeSettings(prev => ({
      ...prev,
      [mode === 'light' ? 'activeLightId' : 'activeDarkId']: id
    }))
  }

  /* Auto-scale preview */
  useEffect(() => {
    function recalc() {
      if (previewRef.current) setScale(Math.min((previewRef.current.offsetWidth - 4) / 1200, 0.55))
    }
    recalc()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [])

  const paletteKeys = Object.keys(themeSettings.savedPalettes)

  /* Helpers for categorized rendering */
  const renderColorRow = (key, label) => (
    <div key={key} className="color-row">
      <span className="var-name">{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="color" value={local[key] || '#000000'} onChange={e => updateVar(key, e.target.value)} />
        <input type="text" className="hex" value={local[key] || ''} onChange={e => updateVar(key, e.target.value)} />
      </div>
    </div>
  )

  /* Text elements dictionary */
  const textElements = [
    { label: 'Logo / Marca', c: '--color-brand', s: '--size-brand', f: '--font-brand' },
    { label: 'Links Header', c: '--color-nav', s: '--size-nav', f: '--font-nav' },
    { label: 'Texto Hero Lado Izq', c: '--color-hero', s: '--size-hero', f: '--font-hero' },
    { label: 'Texto Hero Lado Der', c: '--color-hero-alt', s: '--size-hero-alt', f: '--font-hero-alt' },
    { label: 'Títulos de Sección', c: '--color-title', s: '--size-title', f: '--font-title' },
    { label: 'Subtítulos de Sección', c: '--color-subtitle', s: '--size-subtitle', f: '--font-subtitle' },
    { label: 'Nombres Productos', c: '--color-card-title', s: '--size-card-title', f: '--font-card-title' },
    { label: 'Párrafos Generales', c: '--color-body', s: '--size-body', f: '--font-body' },
    { label: 'Botones', c: '--color-btn', s: '--size-btn', f: '--font-btn' },
    { label: 'Botones (Hover)', c: '--color-btn-hover', s: '--size-btn-hover', f: '--font-btn-hover' },
    { label: 'Títulos Footer', c: '--color-footer-title', s: '--size-footer-title', f: '--font-footer-title' },
    { label: 'Texto Footer', c: '--color-footer', s: '--size-footer', f: '--font-footer' },
  ]

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div className="admin-page">
      <div className="admin-layout" style={{ height: 'calc(100vh - 48px)' }}>

        {/* ──── LEFT: Editor (Independent Scroll) ──── */}
        <div className="editor-sidebar scroller">
          <h2 style={{ fontFamily: 'var(--font-heading)', margin: '0 0 20px 0' }}>Admin — Temas & Tipografía</h2>

          {/* MODE ASSIGNMENT */}
          <div className="editor-card">
            <h4>⚙️ Asignación Global</h4>
            <div className="mode-selectors">
              <div className="mode-sel-box">
                <label>☀️ Tema Claro</label>
                <select value={themeSettings.activeLightId} onChange={e => assignActive('light', e.target.value)}>
                  {paletteKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="mode-sel-box">
                <label>🌙 Tema Oscuro</label>
                <select value={themeSettings.activeDarkId} onChange={e => assignActive('dark', e.target.value)}>
                  {paletteKeys.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* PALETTE MANAGER */}
          <div className="editor-card">
            <h4>📚 Paletas Guardadas (Sincronizado con Supabase)</h4>
            <div className="saved-palette-list">
              {paletteKeys.map(name => {
                const p = themeSettings.savedPalettes[name]
                const isSystem = name === 'Modo Claro (Default)' || name === 'Modo Oscuro (Default)'
                return (
                  <div key={name} className={`saved-palette-item ${editingId === name ? 'active-edit' : ''}`}>
                    <div className="palette-swatches">
                      <div className="palette-swatch" style={{ background: p['--bg'] }} title="BG" />
                      <div className="palette-swatch" style={{ background: p['--accent'] }} title="Accent" />
                    </div>
                    <span className="saved-palette-name" style={{ marginLeft: 8 }}>{name}</span>
                    <div className="saved-palette-actions">
                      <button className="btn-sm" onClick={() => loadPaletteForEdit(name)}>{editingId === name ? 'Editando...' : 'Editar'}</button>
                      {!isSystem && <button className="btn-sm btn-sm-danger" onClick={() => deletePalette(name)}>✕</button>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="palette-save-row" style={{ marginTop: 14 }}>
              <input
                placeholder="Nombre para nueva paleta..."
                value={paletteName}
                onChange={e => setPaletteName(e.target.value)}
              />
              <button className="btn btn-primary" onClick={saveNewPalette} disabled={!paletteName.trim()}>
                Crear Paleta
              </button>
            </div>
          </div>

          {/* GRANULAR EDITOR */}
          <div className="editor-card">
            <h4 style={{ color: 'var(--accent)' }}>🎨 Editando: {editingId}</h4>
            <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>Los cambios se reflejan al instante y se guardan.</p>

            <div className="config-group">
              <h5 style={{ marginBottom: 10 }}>Fondo y Acentos</h5>
              <div className="palette-editor">
                {renderColorRow('--bg', 'Fondo Principal')}
                {renderColorRow('--card', 'Fondo Cards')}
                {renderColorRow('--header-bg', 'Fondo Header')}
                {renderColorRow('--accent', 'Acento 1 (Base)')}
                {renderColorRow('--accent-alt', 'Acento 2 (Alt)')}
              </div>
            </div>

            <div className="config-group">
              <h5 style={{ marginBottom: 10 }}>Botones y UI Base</h5>
              <div className="palette-editor">
                {renderColorRow('--btn-bg', 'Fondo Botones')}
                {renderColorRow('--btn-hover', 'Fondo Hover')}
              </div>
            </div>

            <div className="config-group" style={{ borderBottom: 'none' }}>
              <h5 style={{ marginBottom: 16 }}>Textos (Color, Tamaño, Fuente)</h5>
              <div className="text-editor-grid">
                {textElements.map(t => (
                  <div key={t.label} className="text-editor-row">
                    <div className="text-editor-header">
                      <strong>{t.label}</strong>
                    </div>
                    <div className="text-editor-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
                      {/* Fila 1: Color */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="color" className="color-btn" value={local[t.c] || '#000000'} onChange={e => updateVar(t.c, e.target.value)} title="Color" />
                        <input type="text" className="hex" style={{ width: 80 }} value={local[t.c] || ''} onChange={e => updateVar(t.c, e.target.value)} placeholder="#HEX" />
                      </div>

                      {/* Fila 2: Tamaño y Fuente */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="number"
                          className="word-select"
                          style={{ width: 66, padding: '4px 8px' }}
                          min="2" max="99"
                          value={(local[t.s] || '').replace(/[^0-9]/g, '')}
                          onChange={e => {
                            let v = parseInt(e.target.value);
                            if (isNaN(v)) updateVar(t.s, '');
                            else {
                              if (v > 99) v = 99;
                              updateVar(t.s, v + 'px');
                            }
                          }}
                          onBlur={e => {
                            let v = parseInt(e.target.value);
                            if (!isNaN(v) && v < 2) updateVar(t.s, '2px');
                          }}
                          title="Tamaño (px)"
                        />
                        <span style={{ fontSize: 12, opacity: 0.6 }}>px</span>

                        <select className="word-select" style={{ flex: 1, padding: '4px 8px', fontFamily: local[t.f] }} value={local[t.f]} onChange={e => updateVar(t.f, e.target.value)} title="Fuente">
                          {allFonts.map(f => (
                            <option key={f.value} value={f.value} style={{ fontFamily: f.family }}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TTF Upload Supabase */}
            <div style={{ marginTop: 24, padding: 16, background: 'rgba(128,128,128,0.05)', borderRadius: 8 }}>
              <h5 style={{ marginBottom: 10 }}>Gestionar Tipografías (Supabase)</h5>
              <button className="btn-upload" onClick={() => fileInputRef.current?.click()} disabled={uploadingFont}>
                {uploadingFont ? '⏳ Subiendo a Supabase...' : '📁 Subir fuente local (.ttf, .otf, .woff)'}
              </button>
              <input ref={fileInputRef} type="file" accept=".ttf,.otf,.woff" style={{ display: 'none' }} onChange={handleFontUpload} />
              {customFonts.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {customFonts.map(f => (
                    <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(128,128,128,.1)', borderRadius: 4, marginBottom: 4, fontSize: 14 }}>
                      <span style={{ fontFamily: f.name }}>{f.name}</span>
                      <button style={{ background: 'none', border: 'none', color: '#c44', cursor: 'pointer' }} onClick={() => removeCustomFont(f.name)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ──── RIGHT: Full Landing Preview──── */}
        <div className="preview-panel scroller" style={{ height: '100%', padding: '0', background: 'transparent', boxShadow: 'none', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, background: 'var(--card)', padding: 16, borderRadius: 8, border: '1px solid rgba(128,128,128,.1)', boxShadow: 'var(--shadow-md)' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>👁 Vista Previa</h4>
            <span style={{ fontSize: 12, opacity: 0.6 }}>Editando: {editingId}</span>
          </div>

          <div className="preview-frame" ref={previewRef} style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(128,128,128,.2)' }}>
            <div
              className="preview-frame-inner"
              style={{
                transform: `scale(${scale})`, height: `${100 / scale}%`,
                ...Object.fromEntries(Object.entries(local).map(([k, v]) => [k, v]))
              }}
            >
              <Landing activeMode="light" toggleMode={() => { }} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
