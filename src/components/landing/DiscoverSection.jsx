import React from 'react'
import img1 from '../../assets/Screenshot 2026-02-25 134106.png'
import img2 from '../../assets/Screenshot 2026-02-25 134419.png'
import img3 from '../../assets/Screenshot 2026-02-25 134542.png'

const FEATURED_PRODUCTS = [
  { id: 1, title: 'hobbo bag', img: img1 },
  { id: 2, title: 'tAsK bRoWn BaG', img: img2 },
  { id: 3, title: 'Silver bag', img: img3 },
]

export default function DiscoverSection() {
  return (
    <section className="discover" id="discover">
      <h2 className="section-title">
        Descubre lo nuevo de <span className="brand-inline">aura</span>
      </h2>
      <div className="carousel">
        {FEATURED_PRODUCTS.map((p) => (
          <figure key={p.id} className="product-card">
            <img src={p.img} alt={p.title} loading="lazy" />
            <figcaption className="card-title">{p.title}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
