import React from 'react'
import { MODE_OPTIONS } from '../../config/constants'

export default function ThemeSelector({ activeMode, onModeChange }) {
  return (
    <div className="theme-toggle-wrapper">
      <div className="theme-segment" role="tablist" aria-label="Seleccion de modo de color">
        {MODE_OPTIONS.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={activeMode === mode.id}
            className={`theme-segment-btn${activeMode === mode.id ? ' active' : ''}`}
            onClick={() => onModeChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <span className="theme-label">
        Modo: {MODE_OPTIONS.find((m) => m.id === activeMode)?.label || 'Claro'}
      </span>
    </div>
  )
}
