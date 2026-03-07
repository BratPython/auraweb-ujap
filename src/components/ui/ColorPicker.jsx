import React from 'react'
import { normalizeHex } from '../../utils/palette'

export default function ColorPicker({ cssVar, label, value, hexDraft, onColorChange, onHexChange, onHexEnter }) {
  const safeValue = normalizeHex(value)
  const inputValue = hexDraft ?? safeValue

  return (
    <div className="color-row">
      <span className="var-name">{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="color"
          value={safeValue}
          onChange={(e) => onColorChange(cssVar, e.target.value)}
        />
        <input
          type="text"
          className="hex"
          value={inputValue}
          onChange={(e) => onHexChange(cssVar, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onHexEnter(cssVar, e.currentTarget.value, safeValue)
            }
          }}
        />
      </div>
    </div>
  )
}
