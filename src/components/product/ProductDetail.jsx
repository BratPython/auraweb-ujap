import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import Header from '../layout/Header'
import ProductGallery from './ProductGallery'
import ProductEditor from './ProductEditor'
import { SkeletonDetail } from '../ui/LoadingSpinner'
import { useAdminMode } from '../../hooks/useAdminMode'
import ImageWithLoader from '../ui/ImageWithLoader'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminMode } = useAdminMode()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadModal, setImageUploadModal] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)
  const [mainIdx, setMainIdx] = useState(0)

  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [agotado, setAgotado] = useState(false)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase.from('productos').select('*').eq('id', id).single()
        if (error) throw error

        setProduct(data)
        setEditName(data.nombre || '')
        setEditDesc(data.descripcion || '')
        setEditPrice(data.precio || '')
        setAgotado(!!data.agotado)
      } catch (err) {
        console.error('Error fetching product details:', err)
        setSaveStatus({ type: 'error', message: 'Producto no encontrado' })
        setTimeout(() => {
          setSaveStatus(null)
          navigate('/catalogo')
        }, 1000)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id, navigate])

  async function handleUpdate() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('productos')
        .update({
          nombre: editName,
          descripcion: editDesc,
          precio: parseFloat(editPrice) || 0,
          agotado,
        })
        .eq('id', id)

      if (error) throw error
      setSaveStatus({ type: 'success', message: 'Cambios guardados' })
      setTimeout(() => setSaveStatus(null), 1000)
    } catch (err) {
      console.error('Error updating product:', err)
      setSaveStatus({ type: 'error', message: 'Error al guardar cambios' })
      setTimeout(() => setSaveStatus(null), 1000)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddImage(file) {
    setImageUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_img.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('recursos_aura')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('recursos_aura')
        .getPublicUrl(fileName)

      const newImageUrl = urlData.publicUrl
      const currentImages = product.imagenes || []
      const nextImages = [...currentImages, newImageUrl]

      const { error: dbError } = await supabase
        .from('productos')
        .update({ imagenes: nextImages })
        .eq('id', id)

      if (dbError) throw dbError

      setProduct((prev) => ({ ...prev, imagenes: nextImages }))
      setImageUploadModal({ type: 'success', message: 'Imagen cargada correctamente' })
      setTimeout(() => setImageUploadModal(null), 1000)
    } catch (err) {
      console.error('Error añadiendo imagen:', err)
      setImageUploadModal({ type: 'error', message: 'Error al cargar imagen' })
      setTimeout(() => setImageUploadModal(null), 1000)
    } finally {
      setImageUploading(false)
    }
  }

  async function handleDeleteImage(indexToRemove) {
    if (!window.confirm('¿Seguro que deseas quitar esta foto?')) return
    const nextImages = product.imagenes.filter((_, i) => i !== indexToRemove)

    try {
      setProduct((prev) => ({ ...prev, imagenes: nextImages }))
      if (mainIdx >= nextImages.length) setMainIdx(Math.max(0, nextImages.length - 1))
      await supabase.from('productos').update({ imagenes: nextImages }).eq('id', id)
    } catch (err) {
      console.error('Error updating images array:', err)
    }
  }

  return (
    <div className="product-detail-page" style={{ minHeight: '100vh' }}>
      <Header currentPage="product" />

      {loading ? (
        <SkeletonDetail />
      ) : product ? (
        <div className="product-detail-container">
          {/* Gallery */}
          <div className="product-gallery">
            <div className="main-image">
              {product.imagenes && product.imagenes.length > 0 ? (
                <ImageWithLoader src={product.imagenes[mainIdx] || product.imagenes[0]} alt={product.nombre} />
              ) : (
                <div className="placeholder-detail">🖼️ Sin Foto</div>
              )}
              {product.imagenes && product.imagenes.length > 1 ? (
                <>
                  <button
                    className="gallery-arrow left"
                    onClick={() => setMainIdx((prev) => (prev - 1 + product.imagenes.length) % product.imagenes.length)}
                    aria-label="Anterior"
                  >
                    ‹
                  </button>
                  <button
                    className="gallery-arrow right"
                    onClick={() => setMainIdx((prev) => (prev + 1) % product.imagenes.length)}
                    aria-label="Siguiente"
                  >
                    ›
                  </button>
                </>
              ) : null}
              {agotado && (
                <div className="detail-agotado-overlay">
                  <span className="detail-agotado-badge">Agotado</span>
                </div>
              )}
            </div>

            {product.imagenes && product.imagenes.length > 1 && (
              <div className="thumbnail-strip">
                {product.imagenes.map((imgUrl, i) => (
                  <div
                    key={i}
                    className={`thumb-container ${mainIdx === i ? 'thumb-active' : ''}`}
                    onClick={() => setMainIdx(i)}
                  >
                    <ImageWithLoader src={imgUrl} alt={`Thumbnail ${i}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Admin: image management */}
            {adminMode && (
              <ProductGallery
                images={product.imagenes}
                isAdmin
                uploading={imageUploading}
                onAddImage={handleAddImage}
                onDeleteImage={handleDeleteImage}
                hideMainImage
              />
            )}
          </div>

          {/* Info / Editor panel */}
          {adminMode ? (
            <ProductEditor
              isAdmin
              editName={editName}
              setEditName={setEditName}
              editDesc={editDesc}
              setEditDesc={setEditDesc}
              editPrice={editPrice}
              setEditPrice={setEditPrice}
              agotado={agotado}
              setAgotado={setAgotado}
              subcategoria={product.subcategoria}
              saving={saving}
              onSave={handleUpdate}
            />
          ) : (
            <div className="product-info-panel">
              <span className="product-detail-sub">{product.subcategoria}</span>
              <h1 className="product-detail-name">{product.nombre}</h1>
              <p className="product-detail-price">${product.precio}</p>
              {product.descripcion && (
                <p className="product-detail-desc">{product.descripcion}</p>
              )}
              {agotado ? (
                <div className="product-detail-status agotado">Este producto está agotado</div>
              ) : (
                <a
                  href="https://wa.link/ajq4wy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp"
                >
                  Consultar disponibilidad
                </a>
              )}
              <button className="back-link" onClick={() => navigate('/catalogo')}>
                ← Volver al catálogo
              </button>
            </div>
          )}
        </div>
      ) : null}

      {saveStatus ? (
        <div className="status-modal-overlay">
          <div className={`status-modal-card ${saveStatus.type}`}>
            <div className="status-icon">
              {saveStatus.type === 'success' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p>{saveStatus.message}</p>
          </div>
        </div>
      ) : null}

      {imageUploadModal ? (
        <div className="status-modal-overlay">
          <div className={`status-modal-card ${imageUploadModal.type}`}>
            <div className="status-icon">
              {imageUploadModal.type === 'success' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p>{imageUploadModal.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
