import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAdminMode } from '../../hooks/useAdminMode'

export default function DiscoverSection() {
  const [displayProducts, setDisplayProducts] = useState([]) // Products to show in grid
  const [featuredProducts, setFeaturedProducts] = useState([]) // Only destacado=true products (for modal)
  const [allProducts, setAllProducts] = useState([])
  const [showSlotsModal, setShowSlotsModal] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [activeSlot, setActiveSlot] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(null)
  const navigate = useNavigate()
  const { adminMode } = useAdminMode()

  // Fetch featured products (up to 3 marked as destacado, or 9 recent as fallback)
  const fetchFeatured = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado')
        .eq('is_active', true)
        .eq('destacado', true)
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) throw error

      // Store actual featured products for the modal
      setFeaturedProducts(data || [])

      // If no featured, fall back to 9 most recent products for display
      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from('productos')
          .select('id, nombre, imagenes, precio')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(9)
        setDisplayProducts(fallback || [])
      } else {
        setDisplayProducts(data)
      }
    } catch {
      // On error, try to get recent products as fallback
      setFeaturedProducts([])
      try {
        const { data: fallback } = await supabase
          .from('productos')
          .select('id, nombre, imagenes, precio')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(9)
        setDisplayProducts(fallback || [])
      } catch {
        setDisplayProducts([])
      }
    }
  }, [])

  useEffect(() => { fetchFeatured() }, [fetchFeatured])

  // Fetch all products for picker (when modal opens)
  useEffect(() => {
    if (!showProductPicker) return
    async function fetchAll() {
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado')
        .eq('is_active', true)
        .order('nombre')
      setAllProducts(data || [])
    }
    fetchAll()
  }, [showProductPicker])

  // Filter products by search
  const filteredProducts = allProducts.filter((p) =>
    p.nombre?.toLowerCase().includes(search.toLowerCase().trim())
  )

  // Build 3 fixed slots for the modal (featured products + empty slots)
  const slots = [
    featuredProducts[0] || null,
    featuredProducts[1] || null,
    featuredProducts[2] || null
  ]

  // Remove product from slot (clear destacado)
  async function removeFromSlot(slotIndex) {
    const product = slots[slotIndex]
    if (!product) return

    setSaving(slotIndex)
    try {
      await supabase.from('productos').update({ destacado: false }).eq('id', product.id)
      await fetchFeatured()
    } catch (err) {
      console.error('Error removing from slot:', err)
    } finally {
      setSaving(null)
    }
  }

  // Add product to slot
  async function addToSlot(product) {
    setSaving('adding')
    try {
      // Mark new product as destacado
      await supabase.from('productos').update({ destacado: true }).eq('id', product.id)

      await fetchFeatured()
      setShowProductPicker(false)
      setActiveSlot(null)
      setSearch('')
    } catch (err) {
      console.error('Error adding to slot:', err)
    } finally {
      setSaving(null)
    }
  }

  function openProductPicker(slotIndex) {
    setActiveSlot(slotIndex)
    setShowProductPicker(true)
    setSearch('')
  }

  return (
    <section className="discover" id="discover">
      <h2 className="section-title">
        Descubre lo nuevo de <span className="brand-inline">aura</span>
      </h2>

      {adminMode && (
        <div className="admin-inline-bar">
          <span>Productos destacados ({featuredProducts.length}/3)</span>
          <button className="btn-sm" onClick={() => setShowSlotsModal(true)}>
            Editar destacados
          </button>
        </div>
      )}

      {/* Featured Slots Modal */}
      {showSlotsModal && (
        <div className="modal-overlay" onClick={() => setShowSlotsModal(false)}>
          <div className="featured-slots-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Productos Destacados</h3>
              <button className="modal-close" onClick={() => setShowSlotsModal(false)}>✕</button>
            </div>
            <p className="modal-hint">Selecciona hasta 3 productos para mostrar en la página principal</p>
            
            <div className="slots-grid">
              {slots.map((product, i) => (
                <div key={i} className="slot-card">
                  {product ? (
                    <>
                      <div className="slot-image">
                        {product.imagenes?.[0] ? (
                          <img src={product.imagenes[0]} alt={product.nombre} />
                        ) : (
                          <span className="slot-placeholder">👜</span>
                        )}
                      </div>
                      <div className="slot-info">
                        <span className="slot-name">{product.nombre}</span>
                        <span className="slot-price">${product.precio}</span>
                      </div>
                      <button
                        className="slot-remove"
                        onClick={() => removeFromSlot(i)}
                        disabled={saving === i}
                        title="Quitar producto"
                      >
                        {saving === i ? '...' : '✕'}
                      </button>
                    </>
                  ) : (
                    <button 
                      className="slot-add"
                      onClick={() => openProductPicker(i)}
                      disabled={featuredProducts.length >= 3}
                    >
                      <span className="slot-add-icon">+</span>
                      <span>Agregar producto</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {showProductPicker && (
        <div className="modal-overlay" onClick={() => { setShowProductPicker(false); setActiveSlot(null) }}>
          <div className="product-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seleccionar Producto</h3>
              <button className="modal-close" onClick={() => { setShowProductPicker(false); setActiveSlot(null) }}>✕</button>
            </div>
            
            <div className="picker-search">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="picker-grid">
              {filteredProducts.map((p) => {
                const isAlreadyFeatured = featuredProducts.some((f) => f?.id === p.id)
                return (
                  <div
                    key={p.id}
                    className={`picker-card ${isAlreadyFeatured ? 'disabled' : ''}`}
                    onClick={() => !isAlreadyFeatured && addToSlot(p)}
                  >
                    <div className="picker-card-image">
                      {p.imagenes?.[0] ? (
                        <img src={p.imagenes[0]} alt={p.nombre} />
                      ) : (
                        <span className="picker-placeholder">👜</span>
                      )}
                      {isAlreadyFeatured && <span className="picker-badge">Ya destacado</span>}
                    </div>
                    <div className="picker-card-info">
                      <span className="picker-card-name">{p.nombre}</span>
                      <span className="picker-card-price">${p.precio}</span>
                    </div>
                  </div>
                )
              })}
              {filteredProducts.length === 0 && (
                <p className="picker-empty">No se encontraron productos</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Cards Display */}
      {displayProducts.length > 0 && (
        <div className="discover-grid">
          {displayProducts.map((p) => (
            <div
              key={p.id}
              className="discover-card"
              onClick={() => navigate(`/producto/${p.id}`)}
            >
              <div className="discover-card-image">
                {p.imagenes && p.imagenes.length > 0 ? (
                  <img src={p.imagenes[0]} alt={p.nombre} loading="lazy" />
                ) : (
                  <div className="discover-card-placeholder">👜</div>
                )}
              </div>
              <div className="discover-card-info">
                <span className="discover-card-name">{p.nombre}</span>
                <span className="discover-card-price">${p.precio}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
