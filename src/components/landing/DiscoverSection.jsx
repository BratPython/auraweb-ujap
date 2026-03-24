import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { supabase } from '../../supabaseClient'
import { useAdminMode } from '../../hooks/useAdminMode'
import ImageWithLoader from '../ui/ImageWithLoader'

export default function DiscoverSection() {
  const [displayProducts, setDisplayProducts] = useState([]) // Products to show in grid
  const [featuredProducts, setFeaturedProducts] = useState([]) // Only destacado=true products (for modal)
  const [allProducts, setAllProducts] = useState([])
  const [showFeaturedModal, setShowFeaturedModal] = useState(false)
  const [search, setSearch] = useState('')
  const [savingProductId, setSavingProductId] = useState(null)
  const [offset, setOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animDir, setAnimDir] = useState('right')
  const [itemsPerView, setItemsPerView] = useState(3)
  const timerRef = useRef(null)
  const animTimeoutRef = useRef(null)
  const navigate = useNavigate()
  const { adminMode } = useAdminMode()

  const maxDisplay = 12

  function shuffle(items) {
    const next = [...items]
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    return next
  }

  // Fetch featured products (3 selected by admin) and randomize the rest.
  const fetchFeatured = useCallback(async () => {
    try {
      const { data: featuredData, error: featuredError } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado, created_at')
        .eq('is_active', true)
        .eq('destacado', true)
        .order('created_at', { ascending: false })
        .limit(3)

      if (featuredError) throw featuredError

      // Store actual featured products for the modal
      setFeaturedProducts(featuredData || [])

      const { data: allData, error: allError } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado, created_at')
        .eq('is_active', true)

      if (allError) throw allError

      const allItems = allData || []
      setAllProducts(allItems)

      if (allItems.length === 0) {
        setDisplayProducts([])
        setOffset(0)
        return
      }

      const fixedFeatured = (featuredData || []).slice(0, 3)
      const featuredIds = new Set(fixedFeatured.map((p) => p.id))
      const others = allItems.filter((p) => !featuredIds.has(p.id))
      const randomized = shuffle(others)
      const nextDisplay = [...fixedFeatured, ...randomized].slice(0, maxDisplay)
      setDisplayProducts(nextDisplay)
      setOffset(0)
    } catch {
      setFeaturedProducts([])
      setAllProducts([])
      setDisplayProducts([])
      setOffset(0)
    }
  }, [maxDisplay])

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

  // Refresh products when featured modal opens.
  useEffect(() => {
    if (!showFeaturedModal) return
    fetchFeatured()
  }, [showFeaturedModal, fetchFeatured])

  useEffect(() => {
    if (!showFeaturedModal) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [showFeaturedModal])

  // Filter products by search
  const filteredProducts = allProducts.filter((p) =>
    p.nombre?.toLowerCase().includes(search.toLowerCase().trim())
  )

  async function toggleFeatured(product) {
    const isFeatured = featuredProducts.some((f) => f.id === product.id)
    if (!isFeatured && featuredProducts.length >= 3) return

    setSavingProductId(product.id)
    try {
      await supabase
        .from('productos')
        .update({ destacado: !isFeatured })
        .eq('id', product.id)

      await fetchFeatured()
    } catch (err) {
      console.error('Error toggling destacado:', err)
    } finally {
      setSavingProductId(null)
    }
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

  const featuredModal = showFeaturedModal && typeof document !== 'undefined'
    ? createPortal(
      <div className="discover-featured-overlay" onClick={() => setShowFeaturedModal(false)}>
        <div className="discover-featured-modal" onClick={(e) => e.stopPropagation()}>
          <div className="discover-featured-header">
            <h3>Productos Destacados</h3>
            <button className="discover-featured-close" onClick={() => setShowFeaturedModal(false)}>✕</button>
          </div>

          <p className="discover-featured-hint">
            Selecciona hasta 3 productos destacados. El resto del carrusel se llena aleatoriamente hasta 12 productos.
          </p>

          <div className="discover-featured-search">
            <span className="discover-featured-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="discover-featured-grid">
            {filteredProducts.map((p) => {
              const isAlreadyFeatured = featuredProducts.some((f) => f?.id === p.id)
              const canSelect = isAlreadyFeatured || featuredProducts.length < 3
              return (
                <div
                  key={p.id}
                  className={`discover-featured-card ${!canSelect ? 'is-disabled' : ''}`}
                >
                  <div className="discover-featured-card-image">
                    {p.imagenes?.[0] ? (
                      <ImageWithLoader src={p.imagenes[0]} alt={p.nombre} />
                    ) : (
                      <span className="discover-featured-placeholder">👜</span>
                    )}
                    {isAlreadyFeatured && <span className="discover-featured-badge">Destacado</span>}
                  </div>
                  <div className="discover-featured-card-info">
                    <span className="discover-featured-card-name">{p.nombre}</span>
                    <span className="discover-featured-card-price">${p.precio}</span>
                    <button
                      className="btn-sm"
                      onClick={() => toggleFeatured(p)}
                      disabled={!canSelect || savingProductId === p.id}
                    >
                      {savingProductId === p.id
                        ? 'Guardando...'
                        : isAlreadyFeatured
                          ? 'Quitar'
                          : 'Destacar'}
                    </button>
                  </div>
                </div>
              )
            })}
            {filteredProducts.length === 0 && (
              <p className="discover-featured-empty">No se encontraron productos</p>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
    : null

  return (
    <section className="discover" id="discover">
      <h2 className="section-title">
        Descubre lo nuevo de <span className="brand-inline">aura</span>
      </h2>

      {adminMode && (
        <div className="admin-inline-bar">
          <span>Productos destacados ({featuredProducts.length}/3)</span>
          <button className="btn-sm" onClick={() => { setShowFeaturedModal(true); setSearch('') }}>
            Editar destacados
          </button>
        </div>
      )}

      {featuredModal}

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
