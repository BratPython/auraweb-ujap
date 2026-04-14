import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import Header from '../layout/Header'
import ThemeSelector from '../ui/ThemeSelector'
import ProductGallery from './ProductGallery'
import ProductEditor from './ProductEditor'
import { SkeletonDetail } from '../ui/LoadingSpinner'
import { useAdminMode } from '../../hooks/useAdminMode'
import ImageWithLoader from '../ui/ImageWithLoader'
import { useBcvRate } from '../../hooks/useBcvRate'
import ConfirmModal from '../layout/ConfirmModal'
import { useShop } from '../../hooks/useShop'

export default function ProductDetail({ activeMode, onModeChange }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminMode } = useAdminMode()
  const { bcvRate, loading: bcvLoading } = useBcvRate()
  const { addToCart } = useShop()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageUploadModal, setImageUploadModal] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)
  const [mainIdx, setMainIdx] = useState(0)
  const [confirmDeleteImageIdx, setConfirmDeleteImageIdx] = useState(null)

  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDiscount, setEditDiscount] = useState('0')
  const [editStock, setEditStock] = useState('0')
  const [agotado, setAgotado] = useState(false)
  const [purchaseQty, setPurchaseQty] = useState(1)

  const discount = Math.max(0, Math.min(99, Number.parseInt(product?.is_descuento, 10) || 0))
  const basePrice = Number.parseFloat(product?.precio) || 0
  const finalPrice = discount > 0
    ? Math.max(0, basePrice * (1 - discount / 100))
    : basePrice
  const convertedPriceVes = bcvRate ? finalPrice * bcvRate : null
  const availableStock = Math.max(0, Number.parseInt(product?.stock, 10) || 0)
  const isOutOfStock = !!product?.agotado || availableStock <= 0

  const formatPrice = (value) => {
    const num = Number(value) || 0
    return Number.isInteger(num) ? String(num) : num.toFixed(2)
  }

  const formatVes = (value) => {
    const num = Number(value) || 0
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase.from('productos').select('*').eq('id', id).single()
        if (error) throw error

        setProduct(data)
        setEditName(data.nombre || '')
        setEditDesc(data.descripcion || '')
        setEditPrice(data.precio || '')
        setEditDiscount(String(Math.max(0, Math.min(99, Number.parseInt(data.is_descuento, 10) || 0))))
        setEditStock(String(Math.max(0, Number.parseInt(data.stock, 10) || 0)))
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

  useEffect(() => {
    setPurchaseQty(1)
  }, [product?.id])

  useEffect(() => {
    if (!availableStock) {
      setPurchaseQty(1)
      return
    }

    setPurchaseQty((prev) => Math.max(1, Math.min(prev, availableStock)))
  }, [availableStock])

  function updatePurchaseQty(nextValue) {
    const parsed = Number.parseInt(nextValue, 10)
    if (!Number.isFinite(parsed)) {
      setPurchaseQty(1)
      return
    }

    setPurchaseQty(Math.max(1, Math.min(parsed, Math.max(1, availableStock))))
  }

  async function handleUpdate() {
    setSaving(true)
    try {
      const safeDiscount = Math.max(0, Math.min(99, Number.parseInt(editDiscount, 10) || 0))
      const safeStock = Math.max(0, Number.parseInt(editStock, 10) || 0)
      const computedAgotado = safeStock <= 0 ? true : agotado

      const { error } = await supabase
        .from('productos')
        .update({
          nombre: editName,
          descripcion: editDesc,
          precio: parseFloat(editPrice) || 0,
          is_descuento: safeDiscount,
          stock: safeStock,
          agotado: computedAgotado,
        })
        .eq('id', id)

      if (error) throw error
      setProduct((prev) => (prev ? { ...prev, stock: safeStock, agotado: computedAgotado } : prev))
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
    const nextImages = product.imagenes.filter((_, i) => i !== indexToRemove)

    try {
      setProduct((prev) => ({ ...prev, imagenes: nextImages }))
      if (mainIdx >= nextImages.length) setMainIdx(Math.max(0, nextImages.length - 1))
      const { error } = await supabase.from('productos').update({ imagenes: nextImages }).eq('id', id)
      if (error) throw error
    } catch (err) {
      console.error('Error updating images array:', err)
      throw err
    }
  }

  function requestDeleteImage(indexToRemove) {
    setConfirmDeleteImageIdx(indexToRemove)
  }

  async function confirmDeleteImage() {
    if (confirmDeleteImageIdx === null) return
    try {
      await handleDeleteImage(confirmDeleteImageIdx)
      setImageUploadModal({ type: 'success', message: 'Imagen eliminada correctamente' })
      setTimeout(() => setImageUploadModal(null), 1200)
    } catch {
      setImageUploadModal({ type: 'error', message: 'No se pudo eliminar la imagen' })
      setTimeout(() => setImageUploadModal(null), 1200)
    }
    setConfirmDeleteImageIdx(null)
  }

  function handleAddToCart() {
    if (!product) return

    if (isOutOfStock) {
      setSaveStatus({ type: 'error', message: 'Producto agotado' })
      setTimeout(() => setSaveStatus(null), 1200)
      return
    }

    const stock = availableStock

    const result = addToCart({
      id: product.id,
      code: `PRD-${String(product.id).slice(0, 8)}`,
      name: product.nombre,
      image: Array.isArray(product.imagenes) ? String(product.imagenes[0] || '') : '',
      price: finalPrice,
      stock,
      exentoIva: false,
      discountPct: 0,
    }, purchaseQty)

    if (!result.ok) {
      setSaveStatus({ type: 'error', message: result.error || 'No se pudo agregar al carrito' })
      setTimeout(() => setSaveStatus(null), 1200)
      return
    }

    setSaveStatus({
      type: 'success',
      message: `${purchaseQty} producto${purchaseQty === 1 ? '' : 's'} agregado${purchaseQty === 1 ? '' : 's'} al carrito`,
    })
    setTimeout(() => setSaveStatus(null), 1200)
  }

  return (
    <div className="product-detail-page" style={{ minHeight: '100vh' }}>
      <Header currentPage="product">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>

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
                onDeleteImage={requestDeleteImage}
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
              editDiscount={editDiscount}
              setEditDiscount={setEditDiscount}
              editStock={editStock}
              setEditStock={setEditStock}
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
              {discount > 0 ? (
                <div className="product-detail-price-wrap">
                  <p className="product-detail-price-original">${formatPrice(basePrice)}</p>
                  <p className="product-detail-price product-detail-price-final">${formatPrice(finalPrice)}</p>
                </div>
              ) : (
                <p className="product-detail-price">${formatPrice(basePrice)}</p>
              )}
              {bcvLoading ? (
                <p className="product-detail-price-ves product-detail-price-ves-muted">Calculando en Bs...</p>
              ) : convertedPriceVes ? (
                <>
                  <p className="product-detail-price-ves">Bs. {formatVes(convertedPriceVes)}</p>
                  <p className="product-detail-rate">Tasa BCV oficial: {formatVes(bcvRate)} Bs/USD</p>
                </>
              ) : (
                <p className="product-detail-price-ves product-detail-price-ves-muted">No se pudo obtener la tasa BCV</p>
              )}
              {product.descripcion && (
                <p className="product-detail-desc">{product.descripcion}</p>
              )}
              {isOutOfStock ? (
                <div className="product-detail-status agotado">Este producto está agotado</div>
              ) : (
                <>
                  <div className="product-qty-panel">
                    <span>Cantidad</span>
                    <div className="product-qty-controls">
                      <button
                        type="button"
                        onClick={() => updatePurchaseQty(purchaseQty - 1)}
                        disabled={purchaseQty <= 1}
                        aria-label="Disminuir cantidad"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={availableStock}
                        value={purchaseQty}
                        onChange={(e) => updatePurchaseQty(e.target.value)}
                        aria-label="Cantidad del producto"
                      />
                      <button
                        type="button"
                        onClick={() => updatePurchaseQty(purchaseQty + 1)}
                        disabled={purchaseQty >= availableStock}
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                    <small>{availableStock} disponible(s)</small>
                  </div>

                  <button className="btn-whatsapp" onClick={handleAddToCart}>
                    Agregar al carrito
                  </button>
                </>
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

      {imageUploading ? (
        <div className="status-modal-overlay">
          <div className="status-modal-card">
            <div className="uploading-state" style={{ padding: '8px 8px 2px' }}>
              <div className="spinner"></div>
              <h2>Cargando foto...</h2>
              <p>Por favor no cierres esta ventana.</p>
            </div>
          </div>
        </div>
      ) : null}

      {imageUploadModal && !imageUploading ? (
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

      <ConfirmModal
        open={confirmDeleteImageIdx !== null}
        title="Eliminar foto"
        message="Esta foto se eliminara del producto. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDeleteImage}
        onCancel={() => setConfirmDeleteImageIdx(null)}
      />
    </div>
  )
}
