import React from 'react'
import SliderControl from '../ui/SliderControl'
import { TYPOGRAPHY_GROUPS } from '../../config/constants'
import { pxToNumber, toPx } from '../../utils/css'

export default function TypographyEditor({ typography, allFonts, onUpdate }) {
  return (
    <div className="editor-card">
      <h4>Tipografia editable</h4>
      <p className="admin-note">Solo: Titulos, Subtitulos, Parrafos y Banner (fuente, tamano y espaciado).</p>

      {TYPOGRAPHY_GROUPS.map(({ key, label, minSize, maxSize }) => (
        <div className="text-editor-row" key={key}>
          <div className="text-editor-header"><strong>{label}</strong></div>
          <div className="text-editor-controls stack">
            <div className="control-line control-line-select">
              <span>Fuente</span>
              <select
                className="word-select"
                value={typography[key].family}
                onChange={(e) => onUpdate(key, 'family', e.target.value)}
              >
                {allFonts.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.family }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-line control-line-input">
              <span>Tamaño</span>
              <input
                type="number"
                min={minSize}
                max={maxSize}
                className="word-select"
                value={pxToNumber(typography[key].size)}
                onChange={(e) => onUpdate(key, 'size', toPx(e.target.value, minSize, maxSize))}
              />
            </div>

            <SliderControl
              label="Espaciado"
              value={typography[key].spacing}
              min={0}
              max={24}
              onChange={(val) => onUpdate(key, 'spacing', val)}
            />
          </div>
        </div>
      ))}

      {/* Banner — special case with larger size range */}
      <div className="text-editor-row">
        <div className="text-editor-header"><strong>Banner</strong></div>
        <div className="text-editor-controls stack">
          <div className="control-line control-line-select">
            <span>Fuente</span>
            <select
              className="word-select"
              value={typography.banner.family}
              onChange={(e) => onUpdate('banner', 'family', e.target.value)}
            >
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
              min={24}
              max={200}
              className="word-select"
              value={pxToNumber(typography.banner.size, 94)}
              onChange={(e) => onUpdate('banner', 'size', toPx(e.target.value, 24, 200))}
            />
          </div>
          <SliderControl
            label="Espaciado"
            value={typography.banner.spacing}
            min={0}
            max={24}
            onChange={(val) => onUpdate('banner', 'spacing', val)}
          />
        </div>
      </div>
    </div>
  )
}
