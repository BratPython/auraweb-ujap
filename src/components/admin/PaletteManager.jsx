import React, { useEffect, useState } from 'react'
import { CATEGORY_META } from '../../config/constants'

const PALETTES_PER_PAGE = 6

export default function PaletteManager({
  themeSettings,
  editingCategory,
  editingId,
  searchByCategory,
  setSearchByCategory,
  newPaletteName,
  setNewPaletteName,
  clipboardNote,
  onSelectPalette,
  onSetActive,
  onAddPalette,
  onRenamePalette,
  onDeletePalette,
  onCopyPalette,
  onPasteLocal,
  onPasteSystem,
}) {
  const [pageByCategory, setPageByCategory] = useState({ light: 1, dark: 1, colorblind: 1 })

  useEffect(() => {
    setPageByCategory((prev) => {
      let changed = false
      const next = { ...prev }

      Object.keys(CATEGORY_META).forEach((category) => {
        const list = themeSettings.palettesByMode[category] || []
        const query = (searchByCategory[category] || '').toLowerCase().trim()
        const filtered = list.filter((p) => p.name.toLowerCase().includes(query))
        const totalPages = Math.max(1, Math.ceil(filtered.length / PALETTES_PER_PAGE))
        const currentPage = next[category] || 1

        if (currentPage > totalPages) {
          next[category] = totalPages
          changed = true
        }

        if (currentPage < 1) {
          next[category] = 1
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [searchByCategory, themeSettings.palettesByMode])

  useEffect(() => {
    if (!editingCategory || !editingId) return

    const list = themeSettings.palettesByMode[editingCategory] || []
    const query = (searchByCategory[editingCategory] || '').toLowerCase().trim()
    const filtered = list.filter((p) => p.name.toLowerCase().includes(query))
    const selectedIndex = filtered.findIndex((p) => p.id === editingId)

    if (selectedIndex < 0) return

    const neededPage = Math.floor(selectedIndex / PALETTES_PER_PAGE) + 1
    setPageByCategory((prev) => {
      if (prev[editingCategory] === neededPage) return prev
      return { ...prev, [editingCategory]: neededPage }
    })
  }, [editingCategory, editingId, searchByCategory, themeSettings.palettesByMode])

  return (
    <>
      {Object.keys(CATEGORY_META).map((category) => {
        const list = themeSettings.palettesByMode[category]
        const query = searchByCategory[category].toLowerCase().trim()
        const filtered = list.filter((p) => p.name.toLowerCase().includes(query))
        const totalPages = Math.max(1, Math.ceil(filtered.length / PALETTES_PER_PAGE))
        const currentPage = Math.min(pageByCategory[category] || 1, totalPages)
        const start = (currentPage - 1) * PALETTES_PER_PAGE
        const end = start + PALETTES_PER_PAGE
        const paginated = filtered.slice(start, end)
        const hasPagination = filtered.length > PALETTES_PER_PAGE
        const activeId = themeSettings.activePaletteIds[category]

        return (
          <div key={category} className="editor-card">
            <h4>{CATEGORY_META[category].label}</h4>

            <input
              className="palette-search"
              placeholder="Buscar paleta por nombre..."
              value={searchByCategory[category]}
              onChange={(e) => {
                const value = e.target.value
                setSearchByCategory((prev) => ({ ...prev, [category]: value }))
                setPageByCategory((prev) => ({ ...prev, [category]: 1 }))
              }}
            />

            <div className={`saved-palette-list${hasPagination ? ' is-paginated' : ''}`}>
              {paginated.map((palette) => {
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
                      onChange={(e) => onRenamePalette(category, palette.id, e.target.value)}
                    />

                    <div className="saved-palette-actions">
                      <button className="btn-sm" onClick={() => onSelectPalette(category, palette.id)}>
                        {isEditing ? 'Editando' : 'Editar'}
                      </button>
                      <button className="btn-sm" onClick={() => onCopyPalette(category, palette)}>
                        Copiar
                      </button>
                      <button
                        className={`btn-sm ${isActive ? 'btn-sm-active' : ''}`}
                        onClick={() => onSetActive(category, palette.id)}
                      >
                        {isActive ? 'Activa' : 'Activar'}
                      </button>
                      <button
                        className="btn-sm btn-sm-danger"
                        disabled={!canDelete}
                        title={canDelete ? 'Eliminar paleta' : 'Debe quedar al menos una paleta por categoria'}
                        onClick={() => onDeletePalette(category, palette.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="admin-note">No hay paletas con ese nombre.</p>}
            </div>

            {hasPagination ? (
              <div className="palette-pagination">
                <button
                  className="btn-sm"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setPageByCategory((prev) => ({
                      ...prev,
                      [category]: Math.max(1, (prev[category] || 1) - 1),
                    }))
                  }
                >
                  Anterior
                </button>
                <span className="palette-page-indicator">Pagina {currentPage}/{totalPages}</span>
                <button
                  className="btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPageByCategory((prev) => ({
                      ...prev,
                      [category]: Math.min(totalPages, (prev[category] || 1) + 1),
                    }))
                  }
                >
                  Siguiente
                </button>
              </div>
            ) : null}

            <div className="palette-save-row">
              <input
                placeholder="Nombre de nueva paleta"
                value={newPaletteName}
                onChange={(e) => setNewPaletteName(e.target.value)}
              />
              <button className="btn btn-primary" onClick={() => onAddPalette(category)}>
                Crear
              </button>
            </div>

            <div className="palette-save-row" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => onPasteLocal(category)}>
                Pegar Copia
              </button>
              <button className="btn" onClick={() => onPasteSystem(category)}>
                Pegar Portapapeles
              </button>
            </div>

            {clipboardNote ? (
              <p className="admin-note" style={{ marginTop: 8 }}>{clipboardNote}</p>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
