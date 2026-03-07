import React, { useEffect, useMemo, useState } from 'react'
import Landing from '../landing/Landing'
import { useCustomFonts } from '../../hooks/useCustomFonts'
import { CATEGORY_META, PALETTE_CLIPBOARD_KEY } from '../../config/constants'
import { createPaletteId, extractPaletteValues } from '../../utils/palette'
import { normalizeHex } from '../../utils/palette'
import { buildVarsFromTypography } from '../../utils/theme'
import PaletteManager from './PaletteManager'
import PaletteEditor from './PaletteEditor'
import TypographyEditor from './TypographyEditor'
import CustomFontManager from './CustomFontManager'

export default function Admin({ themeSettings, setThemeSettings }) {
  const [editingCategory, setEditingCategory] = useState('light')
  const [editingId, setEditingId] = useState('')
  const [newPaletteName, setNewPaletteName] = useState('')
  const [searchByCategory, setSearchByCategory] = useState({ light: '', dark: '', colorblind: '' })
  const [hexDrafts, setHexDrafts] = useState({})
  const [paletteClipboard, setPaletteClipboard] = useState(null)
  const [clipboardNote, setClipboardNote] = useState('')

  const { customFonts, allFonts, uploadingFont, handleFontUpload, removeCustomFont } = useCustomFonts()

  // Auto-select first palette on load
  useEffect(() => {
    const firstLight = themeSettings?.activePaletteIds?.light
    if (firstLight && !editingId) {
      setEditingCategory('light')
      setEditingId(firstLight)
    }
  }, [themeSettings, editingId])

  // Reset hex drafts on palette/category change
  useEffect(() => {
    setHexDrafts({})
  }, [editingCategory, editingId])

  // Load clipboard from localStorage on mount
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
          values,
        })
      }
    } catch (err) {
      console.warn('No se pudo leer el portapapeles local de paletas:', err)
    }
  }, [])

  const editingPalette = useMemo(() => {
    const list = themeSettings.palettesByMode[editingCategory] || []
    return list.find((p) => p.id === editingId) || list[0] || null
  }, [themeSettings, editingCategory, editingId])

  const previewVars = useMemo(() => {
    const paletteValues = editingPalette?.values || {}
    return {
      ...paletteValues,
      ...buildVarsFromTypography(themeSettings.typography),
    }
  }, [editingPalette, themeSettings.typography])

  // ──── Palette CRUD ────

  function selectPalette(category, id) {
    setEditingCategory(category)
    setEditingId(id)
  }

  function setActivePalette(category, id) {
    setThemeSettings((prev) => ({
      ...prev,
      activePaletteIds: { ...prev.activePaletteIds, [category]: id },
    }))
  }

  function addPalette(category) {
    const source =
      (themeSettings.palettesByMode[category] || []).find(
        (p) => p.id === themeSettings.activePaletteIds[category]
      ) || (themeSettings.palettesByMode[category] || [])[0]

    if (!source) return

    const id = createPaletteId(category)
    const trimmedName = newPaletteName.trim()
    const name = trimmedName || `Nueva ${CATEGORY_META[category].label} ${themeSettings.palettesByMode[category].length + 1}`

    const nextPalette = { id, name, values: { ...source.values } }

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: [...prev.palettesByMode[category], nextPalette],
      },
    }))

    setNewPaletteName('')
    selectPalette(category, id)
  }

  function renamePalette(category, id, name) {
    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: prev.palettesByMode[category].map((p) => (p.id === id ? { ...p, name } : p)),
      },
    }))
  }

  function deletePalette(category, id) {
    const list = themeSettings.palettesByMode[category]
    if (list.length <= 1) return

    const filtered = list.filter((p) => p.id !== id)
    const nextActive =
      themeSettings.activePaletteIds[category] === id ? filtered[0].id : themeSettings.activePaletteIds[category]

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: filtered,
      },
      activePaletteIds: {
        ...prev.activePaletteIds,
        [category]: nextActive,
      },
    }))

    if (editingCategory === category && editingId === id) {
      setEditingId(filtered[0].id)
    }
  }

  // ──── Palette values ────

  function updatePaletteValues(map) {
    if (!editingPalette) return

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [editingCategory]: prev.palettesByMode[editingCategory].map((p) => {
          if (p.id !== editingPalette.id) return p
          return { ...p, values: { ...p.values, ...map } }
        }),
      },
    }))
  }

  function updateEditingPaletteVar(cssVar, value) {
    if (!editingPalette) return

    const compoundMappings = {
      '--text-color': {
        '--color-body': value,
        '--color-title': value,
        '--color-subtitle': value,
        '--color-brand': value,
        '--color-nav': value,
        '--color-card-title': value,
      },
      '--bg': { '--bg': value, '--header-bg': value },
      '--primary-color': { '--banner-color-1': value, '--accent-alt': value },
      '--secondary-color': {
        '--banner-color-2': value,
        '--accent': value,
        '--btn-hover': value,
        '--footer-bg': value,
      },
    }

    const mapping = compoundMappings[cssVar]
    if (mapping) {
      updatePaletteValues(mapping)
    } else {
      updatePaletteValues({ [cssVar]: value })
    }
  }

  // ──── Hex handling ────

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

  // ──── Typography ────

  function updateTypography(group, field, value) {
    setThemeSettings((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        [group]: { ...prev.typography[group], [field]: value },
      },
    }))
  }

  // ──── Clipboard ────

  function persistPaletteClipboard(payload) {
    setPaletteClipboard(payload)
    localStorage.setItem(PALETTE_CLIPBOARD_KEY, JSON.stringify(payload))
  }

  async function copyPalette(category, palette) {
    const payload = {
      sourceCategory: category,
      sourceName: palette.name,
      values: { ...palette.values },
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
      (themeSettings.palettesByMode[category] || []).find(
        (p) => p.id === themeSettings.activePaletteIds[category]
      ) || (themeSettings.palettesByMode[category] || [])[0]

    if (!source) return

    const id = createPaletteId(category)
    const name = `${baseName} ${themeSettings.palettesByMode[category].length + 1}`
    const nextPalette = { id, name, values: { ...source.values, ...values } }

    setThemeSettings((prev) => ({
      ...prev,
      palettesByMode: {
        ...prev.palettesByMode,
        [category]: [...prev.palettesByMode[category], nextPalette],
      },
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
        values,
      }

      persistPaletteClipboard(payload)
      createPaletteFromValues(category, values, 'Pegada desde portapapeles')
      setClipboardNote('Paleta pegada desde portapapeles.')
    } catch (err) {
      setClipboardNote('No se pudo leer el portapapeles del navegador. Usa "Copiar" primero.')
      console.warn('Error pegando desde portapapeles:', err)
    }
  }

  // ──── Render ────

  return (
    <div className="admin-page admin-v2-page">
      <div className="admin-v2-layout">
        <div className="admin-v2-sidebar">
          <div className="editor-card">
            <h2 className="admin-title">Administrador de Paletas y Tipografia</h2>
            <p className="admin-note">
              Siempre hay una paleta activa por categoria y nunca se permite dejar una categoria sin paletas.
            </p>
          </div>

          <PaletteManager
            themeSettings={themeSettings}
            editingCategory={editingCategory}
            editingId={editingId}
            searchByCategory={searchByCategory}
            setSearchByCategory={setSearchByCategory}
            newPaletteName={newPaletteName}
            setNewPaletteName={setNewPaletteName}
            clipboardNote={clipboardNote}
            onSelectPalette={selectPalette}
            onSetActive={setActivePalette}
            onAddPalette={addPalette}
            onRenamePalette={renamePalette}
            onDeletePalette={deletePalette}
            onCopyPalette={copyPalette}
            onPasteLocal={pastePaletteFromLocal}
            onPasteSystem={pastePaletteFromSystem}
          />

          <PaletteEditor
            editingPalette={editingPalette}
            hexDrafts={hexDrafts}
            onColorPickerChange={onColorPickerChange}
            onHexChange={onHexChange}
            onHexEnter={onHexEnter}
          />

          <TypographyEditor
            typography={themeSettings.typography}
            allFonts={allFonts}
            onUpdate={updateTypography}
          />

          <div className="editor-card">
            <CustomFontManager
              customFonts={customFonts}
              uploadingFont={uploadingFont}
              onUpload={handleFontUpload}
              onRemove={removeCustomFont}
            />
          </div>
        </div>

        <div className="preview-panel scroller" style={{ height: 'calc(100vh - 48px)', padding: '0 8px 0 0' }}>
          <div className="editor-card" style={{ marginBottom: 12 }}>
            <h4>Vista previa de pagina</h4>
            <p className="admin-note">Esta vista usa la paleta en edicion y la tipografia configurada.</p>
          </div>
          <div className="preview-frame">
            <div className="preview-frame-inner" style={previewVars}>
              <Landing activeMode="light" onModeChange={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
