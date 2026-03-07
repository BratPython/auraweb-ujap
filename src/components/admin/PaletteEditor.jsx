import React from 'react'
import ColorPicker from '../ui/ColorPicker'
import { EDITABLE_COLORS } from '../../config/constants'

export default function PaletteEditor({ editingPalette, hexDrafts, onColorPickerChange, onHexChange, onHexEnter }) {
  if (!editingPalette) return null

  return (
    <div className="editor-card">
      <h4>Editando paleta: {editingPalette.name}</h4>
      <p className="admin-note" style={{ marginBottom: 10 }}>
        Colores editables: primario, secundario, fondo, cards y textos. El fondo tambien aplica al header.
      </p>
      <div className="palette-editor">
        {EDITABLE_COLORS.map(({ cssVar, label, resolve }) => {
          const value = resolve(editingPalette.values)
          return (
            <ColorPicker
              key={cssVar}
              cssVar={cssVar}
              label={label}
              value={value}
              hexDraft={hexDrafts[cssVar]}
              onColorChange={onColorPickerChange}
              onHexChange={onHexChange}
              onHexEnter={onHexEnter}
            />
          )
        })}
      </div>
    </div>
  )
}
