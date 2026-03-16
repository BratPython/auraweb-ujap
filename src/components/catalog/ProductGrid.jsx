import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageWithLoader from '../ui/ImageWithLoader'
import ConfirmModal from '../layout/ConfirmModal'

export default function ProductGrid({ products, onDelete, canDelete = false, productPathBase = '/producto' }) {
  const navigate = useNavigate()
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState(null)
  const [deleteStatus, setDeleteStatus] = useState(null)

  function requestDeleteProduct(e, product) {
    e.stopPropagation()
    setConfirmDeleteProduct(product)
  }

  async function confirmDelete() {
    if (!confirmDeleteProduct) return
    try {
      await onDelete(confirmDeleteProduct.id)
      setDeleteStatus({ type: 'success', message: 'Producto eliminado correctamente' })
      setTimeout(() => setDeleteStatus(null), 1200)
    } catch {
      setDeleteStatus({ type: 'error', message: 'No se pudo eliminar el producto' })
      setTimeout(() => setDeleteStatus(null), 1200)
    }
    setConfirmDeleteProduct(null)
  }

  return (
    <>
      {products.map((p) => {
        const discount = Math.max(0, Math.min(99, Number.parseInt(p.is_descuento, 10) || 0))
        const basePrice = Number.parseFloat(p.precio) || 0
        const finalPrice = discount > 0
          ? Math.max(0, basePrice * (1 - discount / 100))
          : basePrice

        const formatPrice = (value) => {
          const num = Number(value) || 0
          return Number.isInteger(num) ? String(num) : num.toFixed(2)
        }

        return (
          <div
            key={p.id}
            className="product-card-admin"
            onClick={() => navigate(`${productPathBase}/${p.id}`)}
          >
            {discount > 0 ? (
              <div className="discount-badge" aria-label={`Descuento ${discount}%`}>
                -{discount}%
              </div>
            ) : null}
            {canDelete ? (
              <button
                className="del-btn badge-btn"
                onClick={(e) => requestDeleteProduct(e, p)}
                title="Ocultar/Eliminar"
              >
                ⛔
              </button>
            ) : null}
            <div className="product-image-frame">
              {p.imagenes && p.imagenes.length > 0 ? (
                <ImageWithLoader src={p.imagenes[0]} alt={p.nombre} />
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
              {discount > 0 ? (
                <div className="product-price-wrap">
                  <span className="product-price-original">${formatPrice(basePrice)}</span>
                  <span className="product-price product-price-final">${formatPrice(finalPrice)}</span>
                </div>
              ) : (
                <span className="product-price">${formatPrice(basePrice)}</span>
              )}
            </div>
          </div>
        )
      })}

      <ConfirmModal
        open={!!confirmDeleteProduct}
        title="Eliminar producto"
        message={
          confirmDeleteProduct
            ? `Se eliminara "${confirmDeleteProduct.nombre}" del catalogo. Esta accion no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteProduct(null)}
      />

      {deleteStatus ? (
        <div className="status-modal-overlay">
          <div className={`status-modal-card ${deleteStatus.type}`}>
            <div className="status-icon">
              {deleteStatus.type === 'success' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p>{deleteStatus.message}</p>
          </div>
        </div>
      ) : null}
    </>
  )
}
