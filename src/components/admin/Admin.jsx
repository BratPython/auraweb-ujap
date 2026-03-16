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
import Header from '../layout/Header'
import ThemeSelector from '../ui/ThemeSelector'
import ConfirmModal from '../layout/ConfirmModal'

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

export default function Admin({ themeSettings, setThemeSettings, activeMode, onModeChange }) {
  const [editingCategory, setEditingCategory] = useState('light')
  const [editingId, setEditingId] = useState('')
  const [newPaletteName, setNewPaletteName] = useState('')
  const [searchByCategory, setSearchByCategory] = useState({ light: '', dark: '', colorblind: '' })
  const [hexDrafts, setHexDrafts] = useState({})
  const [paletteClipboard, setPaletteClipboard] = useState(null)
  const [clipboardNote, setClipboardNote] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [deleteStatus, setDeleteStatus] = useState(null)

  const { customFonts, allFonts, uploadingFont, fontUploadStatus, handleFontUpload, removeCustomFont } = useCustomFonts()

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
    const autoHoverText = pickBlackOrWhiteByContrast(
      paletteValues['--btn-hover'] || paletteValues['--accent'] || '#d96b2d'
    )

    return {
      ...paletteValues,
      ...buildVarsFromTypography(themeSettings.typography),
      '--auto-contrast-on-btn-hover': autoHoverText,
      '--color-btn-hover': autoHoverText,
    }
  }, [editingPalette, themeSettings.typography])

  const previewMode = editingCategory === 'dark' || editingCategory === 'colorblind' ? editingCategory : 'light'

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

  function requestDeletePalette(category, id) {
    const palette = (themeSettings.palettesByMode[category] || []).find((p) => p.id === id)
    if (!palette) return

    setConfirmDialog({
      type: 'palette',
      title: 'Eliminar paleta',
      message: `Se eliminara la paleta "${palette.name}". Esta accion no se puede deshacer.`,
      onConfirm: () => {
        deletePalette(category, id)
        setDeleteStatus({ type: 'success', message: 'Paleta eliminada correctamente' })
        setTimeout(() => setDeleteStatus(null), 1200)
        setConfirmDialog(null)
      },
    })
  }

  function requestRemoveCustomFont(fontName) {
    setConfirmDialog({
      type: 'font',
      title: 'Eliminar tipografia',
      message: `Se eliminara la tipografia "${fontName}". Esta accion no se puede deshacer.`,
      onConfirm: async () => {
        try {
          await removeCustomFont(fontName)
          setDeleteStatus({ type: 'success', message: 'Tipografia eliminada correctamente' })
          setTimeout(() => setDeleteStatus(null), 1200)
        } catch {
          setDeleteStatus({ type: 'error', message: 'No se pudo eliminar la tipografia' })
          setTimeout(() => setDeleteStatus(null), 1200)
        }
        setConfirmDialog(null)
      },
    })
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
        '--color-btn': value,
        '--color-btn-hover': value,
        '--color-footer-title': value,
        '--color-footer': value,
      },
      '--bg': { '--bg': value, '--header-bg': value },
      '--primary-color': { '--banner-color-1': value, '--accent-alt': value },
      '--secondary-color': {
        '--banner-color-2': value,
        '--accent': value,
        '--btn-hover': value,
        '--footer-bg': value,
      },
      '--card': {
        '--card': value,
        '--btn-bg': value,
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
      <Header currentPage="admin-temas">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>
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
            onDeletePalette={requestDeletePalette}
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
              fontUploadStatus={fontUploadStatus}
              onUpload={handleFontUpload}
              onRemove={requestRemoveCustomFont}
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
              <Landing activeMode={previewMode} onModeChange={() => {}} />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title || 'Confirmar accion'}
        message={confirmDialog?.message || ''}
        confirmLabel="Eliminar"
        onConfirm={() => confirmDialog?.onConfirm?.()}
        onCancel={() => setConfirmDialog(null)}
      />

      {deleteStatus ? (
        <div className="status-modal-overlay">
          <div className={`status-modal-card ${deleteStatus.type}`}>
            <div className="status-icon">
              {deleteStatus.type === 'success' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p>{deleteStatus.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
