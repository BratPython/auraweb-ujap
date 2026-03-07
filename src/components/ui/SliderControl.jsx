import React from 'react'
import { pxToNumber, toPx } from '../../utils/css'

export default function SliderControl({ label, value, min = 0, max = 24, onChange }) {
  const numValue = pxToNumber(value, 0)
  const sliderPercent = `${(numValue / max) * 100}%`

  return (
    <div className="control-line control-line-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        className="letter-slider"
        value={numValue}
        style={{ '--slider-value': sliderPercent }}
        onChange={(e) => onChange(toPx(e.target.value, min, max))}
      />
      <strong>{value}</strong>
    </div>
  )
}
