import React, { useState, useRef } from 'react'
import Modal from '../layout/Modal'
import { SUB_CATEGORIAS_BOLSOS, SUB_CATEGORIAS_ACCESORIOS } from '../../config/constants'

export default function AddProductModal({ activeTab, onClose, onSubmit }) {
  const allSubcategories = [...SUB_CATEGORIAS_BOLSOS, ...SUB_CATEGORIAS_ACCESORIOS]
  const initialSubcategory = allSubcategories.includes(activeTab) ? activeTab : SUB_CATEGORIAS_BOLSOS[0]

  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDiscount, setFormDiscount] = useState('0')
  const [formSubcategory, setFormSubcategory] = useState(initialSubcategory)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState(null)
  const fileInputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formName || !formPrice) return

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setStatus({ type: 'error', message: 'Selecciona una imagen para el producto' })
      setTimeout(() => setStatus(null), 1000)
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        nombre: formName,
        descripcion: formDesc,
        precio: formPrice,
        is_descuento: Math.max(0, Math.min(99, Number.parseInt(formDiscount, 10) || 0)),
        subcategoria: formSubcategory,
        imageFile: file,
      })

      setFormName('')
      setFormDesc('')
      setFormPrice('')
      setFormDiscount('0')
      if (fileInputRef.current) fileInputRef.current.value = null
      setStatus({ type: 'success', message: 'Producto guardado' })
      setTimeout(() => {
        setStatus(null)
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Error creating product:', err)
      setStatus({ type: 'error', message: 'Error al subir producto' })
      setTimeout(() => {
        setStatus(null)
        onClose()
      }, 1000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      {status ? (
        <div className="status-modal-inline">
          <div className={`status-modal-card ${status.type}`}>
            <div className="status-icon">
              {status.type === 'success' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p>{status.message}</p>
          </div>
        </div>
      ) : isSubmitting ? (
        <div className="uploading-state">
          <div className="spinner"></div>
          <h2>Guardando y subiendo imagen...</h2>
          <p>Por favor no cierres esta ventana.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>Añadir Producto a {activeTab}</h2>
            <button type="button" className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="form-group row-flex">
            <div style={{ flex: 2 }}>
              <label>Nombre del Producto *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Precio ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Descuento (%)</label>
              <input
                type="number"
                min="0"
                max="99"
                value={formDiscount}
                onChange={(e) => setFormDiscount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Subcategoría *</label>
            <select value={formSubcategory} onChange={(e) => setFormSubcategory(e.target.value)}>
              <optgroup label="Bags">
                {SUB_CATEGORIAS_BOLSOS.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </optgroup>
              <optgroup label="Accesorios">
                {SUB_CATEGORIAS_ACCESORIOS.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              rows="3"
              maxLength={75}
              className="fixed-textarea"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Imagen Portada *</label>
            <input type="file" ref={fileInputRef} accept="image/*" required className="file-input" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            Subir Producto
          </button>
        </form>
      )}
    </Modal>
  )
}
