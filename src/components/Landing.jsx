import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import img1 from '../assets/Screenshot 2026-02-25 134106.png'
import img2 from '../assets/Screenshot 2026-02-25 134419.png'
import img3 from '../assets/Screenshot 2026-02-25 134542.png'
import img4 from '../assets/Screenshot 2026-02-25 134902.png'

const products = [
  { id: 1, title: 'hobbo bag', img: img1 },
  { id: 2, title: 'tAsK bRoWn BaG', img: img2 },
  { id: 3, title: 'Silver bag', img: img3 }
]

const AURA_COUNT = 6
const auraRow = Array.from({ length: AURA_COUNT }, (_, i) => (
  <span key={i} className="hero-word">aura</span>
))

const MODE_OPTIONS = [
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
  { id: 'colorblind', label: 'Daltonico' }
]

export default function Landing({ activeMode, onModeChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <main className="page">
      <div
        className={`nav-overlay${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <header className="site-header">
        <div className="header-left">
          <div className="brand">aura</div>
          <nav className="nav-desktop">
            <a className="nav-link-btn" onClick={() => navigate('/catalogo')}>Catálogo</a>
            <a href="#services">Servicios</a>
            <a href="https://wa.link/ajq4wy" target="_blank" rel="noreferrer">WhatsApp</a>
          </nav>
        </div>

        <div className="header-right">
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
            <span className="theme-label">Modo: {MODE_OPTIONS.find(m => m.id === activeMode)?.label || 'Claro'}</span>
          </div>

          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile menu */}
        <nav className={`nav-mobile${menuOpen ? ' open' : ''}`}>
          <a href="#discover" onClick={(e) => { e.preventDefault(); setMenuOpen(false); navigate('/catalogo'); }}>Catálogo</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>Servicios</a>
          <a href="https://wa.link/ajq4wy" onClick={() => setMenuOpen(false)} target="_blank" rel="noreferrer">WhatsApp</a>
        </nav>
      </header>

      {/* ---- HERO: Dynamic Invert Effect ---- */}
      <section className="hero">
        <div className="hero-bg-left" />
        <div className="hero-bg-right" />

        {/* Layer 1: Left Side Clipper (Visible only on left half) */}
        <div className="hero-layer hero-layer-left">
          {[0, 1, 2].map(row => (
            <div key={`L-${row}`} className="hero-marquee-row" style={{ animationDelay: `${row * -6}s` }}>
              <div className="hero-marquee-track">{auraRow}{auraRow}</div>
            </div>
          ))}
        </div>

        {/* Layer 2: Right Side Clipper (Visible only on right half, perfectly overlaps layer 1) */}
        <div className="hero-layer hero-layer-right">
          {[0, 1, 2].map(row => (
            <div key={`R-${row}`} className="hero-marquee-row" style={{ animationDelay: `${row * -6}s` }}>
              <div className="hero-marquee-track">{auraRow}{auraRow}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="discover" id="discover">
        <h2 className="section-title">Descubre lo nuevo de <span className="brand-inline">aura</span></h2>
        <div className="carousel">
          {products.map((p) => (
            <figure key={p.id} className="product-card">
              <img src={p.img} alt={p.title} loading="lazy" />
              <figcaption className="card-title">{p.title}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="catalog-cta">
        <div className="catalog-image" style={{ backgroundImage: `url(${img4})` }}>
          <button className="cta" onClick={() => navigate('/catalogo')}>ver catálogo</button>
        </div>
      </section>

      <section className="services" id="services">
        <h3 className="section-subtitle">Servicios</h3>
        <div className="service-list">
          <div className="service">
            <div className="icon">🚚</div>
            <p className="body-text">Contamos con envíos a nivel nacional y servicios de pick-up delivery en las ciudades de Valencia y Caracas</p>
          </div>
          <div className="service">
            <div className="icon">🏦</div>
            <p className="body-text">Absolutamente todos nuestros precios estan cotizados a la tasa del banco central de venezuela</p>
          </div>
          <div className="service">
            <div className="icon">💲</div>
            <p className="body-text">Contamos con la posibilidad de cancelar sus sus compras en diferentes cuotas para mayor comodidad económica </p>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="footer-col">
          <strong className="footer-title">Información</strong>
          <span className="footer-text">Todos nuestros
            precios<br></br> se rigen
            por la tasa oficial<br></br> del BCV.
            Realizamos<br></br> entregas personales
            en<br></br> Valencia y Caracas.</span>
        </div>
        <div className="footer-col">
          <strong className="footer-title">Contacto</strong>
          <span className="footer-text"><a href="https://wa.link/ajq4wy" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>WhatsApp: 0424-4405113</a><br></br>
            <a href="https://www.instagram.com/theaura.a/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Instagram: @theaura.a</a><br></br>
            Horario<br></br>
            Lun - Vie: 8:00am - 6:00pm<br></br>
            Sab: 10:00am - 3:00pm<br></br>
            Dom: Cerrado</span>
        </div>
        <div className="footer-col">
          <strong className="footer-title">Enlaces</strong>
          <span className="footer-text">
            <a onClick={() => navigate('/catalogo')} style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}>
              Ver catálogo completo
            </a><br></br>
            Cómo comprar<br></br>
            FaQ
          </span>
        </div>
      </footer>
    </main >
  )
}
