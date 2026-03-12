import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAdminMode } from '../../hooks/useAdminMode'

export default function DiscoverSection() {
  const [products, setProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [offset, setOffset] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(null)
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const { adminMode } = useAdminMode()

  const fetchFeatured = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado')
        .eq('is_active', true)
        .eq('destacado', true)
        .limit(12)

      if (error) throw error

      if (data && data.length > 0) {
        setProducts(data)
      } else {
        const { data: fallback } = await supabase
          .from('productos')
          .select('id, nombre, imagenes, precio')
          .eq('is_active', true)
          .limit(6)
        setProducts(fallback || [])
      }
    } catch {
      const { data: fallback } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio')
        .eq('is_active', true)
        .limit(6)
      setProducts(fallback || [])
    }
  }, [])

  useEffect(() => { fetchFeatured() }, [fetchFeatured])

  // Fetch all products for the admin picker
  useEffect(() => {
    if (!adminMode) return
    async function fetchAll() {
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado')
        .eq('is_active', true)
        .order('nombre')
      setAllProducts(data || [])
    }
    fetchAll()
  }, [adminMode, products])

  const maxOffset = Math.max(0, products.length - 3)

  const advance = useCallback(() => {
    setOffset((prev) => (prev >= maxOffset ? 0 : prev + 3))
  }, [maxOffset])

  useEffect(() => {
    if (products.length <= 3 || adminMode) return
    timerRef.current = setInterval(advance, 7000)
    return () => clearInterval(timerRef.current)
  }, [products, advance, adminMode])

  function goLeft() {
    clearInterval(timerRef.current)
    setOffset((prev) => (prev <= 0 ? maxOffset : prev - 3))
  }

  function goRight() {
    clearInterval(timerRef.current)
    advance()
  }

  async function toggleDestacado(productId, current) {
    setSaving(productId)
    try {
      await supabase.from('productos').update({ destacado: !current }).eq('id', productId)
      await fetchFeatured()
      // Also refresh allProducts list
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, imagenes, precio, destacado')
        .eq('is_active', true)
        .order('nombre')
      setAllProducts(data || [])
    } catch (err) {
      console.error('Error toggling destacado:', err)
    } finally {
      setSaving(null)
    }
  }

  const visible = products.slice(offset, offset + 3)

  return (
    <section className="discover" id="discover">
      <h2 className="section-title">
        Descubre lo nuevo de <span className="brand-inline">aura</span>
      </h2>

      {adminMode && (
        <div className="admin-inline-bar">
          <span>Productos destacados ({products.length})</span>
          <button className="btn-sm" onClick={() => setShowPicker(!showPicker)}>
            {showPicker ? 'Cerrar selector' : '＋ Gestionar productos'}
          </button>
        </div>
      )}

      {adminMode && showPicker && (
        <div className="admin-picker-panel">
          <p className="admin-picker-hint">Marca o desmarca productos para mostrarlos en el carrusel</p>
          <div className="admin-picker-grid">
            {allProducts.map((p) => (
              <div key={p.id} className={`admin-picker-item ${p.destacado ? 'featured' : ''}`}>
                <div className="admin-picker-thumb">
                  {p.imagenes?.[0] ? (
                    <img src={p.imagenes[0]} alt={p.nombre} />
                  ) : (
                    <span>👜</span>
                  )}
                </div>
                <span className="admin-picker-name">{p.nombre}</span>
                <button
                  className={`btn-sm ${p.destacado ? 'btn-sm-active' : ''}`}
                  disabled={saving === p.id}
                  onClick={() => toggleDestacado(p.id, p.destacado)}
                >
                  {saving === p.id ? '...' : p.destacado ? '★' : '☆'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <>
          <div className="carousel-wrapper">
            {products.length > 3 && (
              <button className="carousel-arrow carousel-arrow-left" onClick={goLeft} aria-label="Anterior">
                ‹
              </button>
            )}

            <div className="carousel">
              {visible.map((p) => (
                <figure
                  key={p.id}
                  className="product-card"
                  onClick={() => !adminMode && navigate(`/producto/${p.id}`)}
                  style={{ cursor: adminMode ? 'default' : 'pointer' }}
                >
                  {p.imagenes && p.imagenes.length > 0 ? (
                    <img src={p.imagenes[0]} alt={p.nombre} loading="lazy" />
                  ) : (
                    <div className="card-placeholder">👜</div>
                  )}
                  <figcaption className="card-title">{p.nombre}</figcaption>
                  {adminMode && (
                    <button
                      className="admin-card-remove"
                      title="Quitar de destacados"
                      onClick={(e) => { e.stopPropagation(); toggleDestacado(p.id, true) }}
                      disabled={saving === p.id}
                    >
                      ✕
                    </button>
                  )}
                </figure>
              ))}
            </div>

            {products.length > 3 && (
              <button className="carousel-arrow carousel-arrow-right" onClick={goRight} aria-label="Siguiente">
                ›
              </button>
            )}
          </div>

          {products.length > 3 && (
            <div className="carousel-dots">
              {Array.from({ length: Math.ceil(products.length / 3) }).map((_, i) => (
                <span
                  key={i}
                  className={`carousel-dot ${Math.floor(offset / 3) === i ? 'active' : ''}`}
                  onClick={() => {
                    clearInterval(timerRef.current)
                    setOffset(i * 3)
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
