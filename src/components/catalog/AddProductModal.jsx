import React, { useState, useRef } from 'react'
import Modal from '../layout/Modal'
import { SUB_CATEGORIAS_BOLSOS, SUB_CATEGORIAS_ACCESORIOS } from '../../config/constants'

export default function AddProductModal({ activeTab, onClose, onSubmit }) {
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formSubcategory, setFormSubcategory] = useState('Tote bags')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formName || !formPrice) return

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      alert('Por favor selecciona una imagen para el producto.')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        nombre: formName,
        descripcion: formDesc,
        precio: formPrice,
        subcategoria: formSubcategory,
        imageFile: file,
      })

      setFormName('')
      setFormDesc('')
      setFormPrice('')
      if (fileInputRef.current) fileInputRef.current.value = null
      onClose()
    } catch (err) {
      console.error('Error creating product:', err)
      alert('Uh oh! Hubo un error subiendo el producto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      {isSubmitting ? (
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
            <textarea rows="3" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
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
