import React from 'react'

const AURA_COUNT = 6
const auraRow = Array.from({ length: AURA_COUNT }, (_, i) => (
  <span key={i} className="hero-word">aura</span>
))

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-bg-left" />
      <div className="hero-bg-right" />

      <div className="hero-layer hero-layer-left">
        {[0, 1, 2].map((row) => (
          <div key={`L-${row}`} className="hero-marquee-row" style={{ animationDelay: `${row * -6}s` }}>
            <div className="hero-marquee-track">{auraRow}{auraRow}</div>
          </div>
        ))}
      </div>

      <div className="hero-layer hero-layer-right">
        {[0, 1, 2].map((row) => (
          <div key={`R-${row}`} className="hero-marquee-row" style={{ animationDelay: `${row * -6}s` }}>
            <div className="hero-marquee-track">{auraRow}{auraRow}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
