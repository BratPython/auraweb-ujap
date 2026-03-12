import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProductGrid({ products, onDelete, canDelete = false, productPathBase = '/producto' }) {
  const navigate = useNavigate()

  return (
    <>
      {products.map((p) => (
        <div
          key={p.id}
          className="product-card-admin"
          onClick={() => navigate(`${productPathBase}/${p.id}`)}
        >
          {canDelete ? (
            <button
              className="del-btn badge-btn"
              onClick={(e) => {
                e.stopPropagation()
                if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return
                onDelete(p.id)
              }}
              title="Ocultar/Eliminar"
            >
              ⛔
            </button>
          ) : null}
          <div className="product-image-frame">
            {p.imagenes && p.imagenes.length > 0 ? (
              <img src={p.imagenes[0]} alt={p.nombre} />
            ) : (
              <div className="product-placeholder">👜</div>
            )}
            {p.agotado && (
              <div className="stock-badge-overlay">
                <span className="stock-badge">Agotado</span>
              </div>
            )}
          </div>
          <div className="product-info-bar">
            <span className="product-name">{p.nombre}</span>
            <span className="product-price">${p.precio}</span>
          </div>
        </div>
      ))}
    </>
  )
}
