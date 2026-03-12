import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAdminMode } from '../../hooks/useAdminMode'
import ImageWithLoader from '../ui/ImageWithLoader'

export default function DiscoverSection() {
  const [displayProducts, setDisplayProducts] = useState([]) // Products to show in grid
  const [featuredProducts, setFeaturedProducts] = useState([]) // Only destacado=true products (for modal)
  const [allProducts, setAllProducts] = useState([])
  const [showSlotsModal, setShowSlotsModal] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(null)
  const [offset, setOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animDir, setAnimDir] = useState('right')
  const [itemsPerView, setItemsPerView] = useState(3)
  const timerRef = useRef(null)
  const animTimeoutRef = useRef(null)
  const navigate = useNavigate()
  const { adminMode } = useAdminMode()

  const maxDisplay = 9

  function shuffle(items) {
    const next = [...items]
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    return next
  }

  // Fetch featured products (3 selected by admin) and randomize the rest
  const fetchFeatured = useCallback(async () => {
    try {
      const { data: featuredData, error: featuredError } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado')
        .eq('is_active', true)
        .eq('destacado', true)
        .order('created_at', { ascending: false })
        .limit(3)

      if (featuredError) throw featuredError

      // Store actual featured products for the modal
      setFeaturedProducts(featuredData || [])

      const { data: allData, error: allError } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, created_at')
        .eq('is_active', true)

      if (allError) throw allError

      const allItems = allData || []
      if (allItems.length === 0) {
        setDisplayProducts([])
        setOffset(0)
        return
      }

      // If no featured, fall back to 9 most recent products for display
      if (!featuredData || featuredData.length === 0) {
        const recent = [...allItems]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, maxDisplay)
        setDisplayProducts(recent)
        setOffset(0)
        return
      }

      const featuredIds = new Set(featuredData.map((p) => p.id))
      const others = allItems.filter((p) => !featuredIds.has(p.id))
      const randomized = shuffle(others)
      const nextDisplay = [...featuredData, ...randomized].slice(0, maxDisplay)
      setDisplayProducts(nextDisplay)
      setOffset(0)
    } catch {
      setFeaturedProducts([])
      setDisplayProducts([])
      setOffset(0)
    }
  }, [])

  useEffect(() => { fetchFeatured() }, [fetchFeatured])

  useEffect(() => {
    function handleResize() {
      const next = window.innerWidth <= 720 ? 2 : 3
      setItemsPerView(next)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setOffset(0)
  }, [itemsPerView])

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
      setSearch('')
    } catch (err) {
      console.error('Error adding to slot:', err)
    } finally {
      setSaving(null)
    }
  }

  function openProductPicker() {
    setShowProductPicker(true)
    setSearch('')
  }

  const maxOffset = Math.max(0, displayProducts.length - itemsPerView)
  const visible = displayProducts.slice(offset, offset + itemsPerView)

  const advance = useCallback(() => {
    setAnimDir('right')
    setIsAnimating(false)
    requestAnimationFrame(() => setIsAnimating(true))
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    animTimeoutRef.current = setTimeout(() => setIsAnimating(false), 450)
    setOffset((prev) => (prev + itemsPerView > maxOffset ? 0 : prev + itemsPerView))
  }, [maxOffset, itemsPerView])

  useEffect(() => {
    if (displayProducts.length <= itemsPerView) return
    timerRef.current = setInterval(advance, 5000)
    return () => clearInterval(timerRef.current)
  }, [displayProducts.length, itemsPerView, advance])

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    }
  }, [])

  function goLeft() {
    clearInterval(timerRef.current)
    setAnimDir('left')
    setIsAnimating(false)
    requestAnimationFrame(() => setIsAnimating(true))
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    animTimeoutRef.current = setTimeout(() => setIsAnimating(false), 450)
    setOffset((prev) => (prev - itemsPerView < 0 ? maxOffset : prev - itemsPerView))
  }

  function goRight() {
    clearInterval(timerRef.current)
    setAnimDir('right')
    setIsAnimating(false)
    requestAnimationFrame(() => setIsAnimating(true))
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    animTimeoutRef.current = setTimeout(() => setIsAnimating(false), 450)
    setOffset((prev) => (prev + itemsPerView > maxOffset ? 0 : prev + itemsPerView))
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
                          <ImageWithLoader src={product.imagenes[0]} alt={product.nombre} />
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
                      onClick={() => openProductPicker()}
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
        <div className="modal-overlay" onClick={() => { setShowProductPicker(false) }}>
          <div className="product-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seleccionar Producto</h3>
              <button className="modal-close" onClick={() => { setShowProductPicker(false) }}>✕</button>
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
                        <ImageWithLoader src={p.imagenes[0]} alt={p.nombre} />
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
        <div className="discover-carousel-wrapper">
          {displayProducts.length > itemsPerView && (
            <button className="discover-arrow left" onClick={goLeft} aria-label="Anterior">
              ‹
            </button>
          )}

          <div className={`discover-carousel ${isAnimating ? `is-animating ${animDir}` : ''}`}>
            {visible.map((p) => (
              <div
                key={p.id}
                className="discover-card"
                onClick={() => navigate(`/producto/${p.id}`)}
              >
                <div className="discover-card-image">
                  {p.imagenes && p.imagenes.length > 0 ? (
                    <ImageWithLoader src={p.imagenes[0]} alt={p.nombre} loading="lazy" />
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

          {displayProducts.length > itemsPerView && (
            <button className="discover-arrow right" onClick={goRight} aria-label="Siguiente">
              ›
            </button>
          )}
        </div>
      )}
    </section>
  )
}
