import React from 'react'
import { CATEGORY_META } from '../../config/constants'

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
  return (
    <>
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
              onChange={(e) =>
                setSearchByCategory((prev) => ({ ...prev, [category]: e.target.value }))
              }
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
