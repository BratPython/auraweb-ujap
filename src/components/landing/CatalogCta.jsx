import React from 'react'
import { useNavigate } from 'react-router-dom'
import img4 from '../../assets/Screenshot 2026-02-25 134902.png'

export default function CatalogCta() {
  const navigate = useNavigate()

  return (
    <section className="catalog-cta">
      <div className="catalog-image" style={{ backgroundImage: `url(${img4})` }}>
        <button className="cta" onClick={() => navigate('/catalogo')}>ver catálogo</button>
      </div>
    </section>
  )
}
