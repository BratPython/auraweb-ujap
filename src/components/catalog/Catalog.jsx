import React, { useState, useMemo } from 'react'
import Header from '../layout/Header'
import ThemeSelector from '../ui/ThemeSelector'
import ProductGrid from './ProductGrid'
import AddProductModal from './AddProductModal'
import { SkeletonCard } from '../ui/LoadingSpinner'
import { useProducts } from '../../hooks/useProducts'
import { useAdminMode } from '../../hooks/useAdminMode'
import { CATALOG_TABS } from '../../config/constants'

const SORT_OPTIONS = [
  { value: 'default', label: 'Ordenar' },
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
  { value: 'price-asc', label: 'Precio ↑' },
  { value: 'price-desc', label: 'Precio ↓' },
]

export default function Catalog({ activeMode, onModeChange }) {
  const { adminMode } = useAdminMode()
  const [activeTab, setActiveTab] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('default')

  const { products, loading, fetchProducts, deleteProduct, createProduct } = useProducts(activeTab)

  const filteredProducts = useMemo(() => {
    let items = [...products]

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      items = items.filter((p) => p.nombre?.toLowerCase().includes(q))
    }

    switch (sort) {
      case 'az':
        items.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
        break
      case 'za':
        items.sort((a, b) => (b.nombre || '').localeCompare(a.nombre || ''))
        break
      case 'price-asc':
        items.sort((a, b) => (a.precio || 0) - (b.precio || 0))
        break
      case 'price-desc':
        items.sort((a, b) => (b.precio || 0) - (a.precio || 0))
        break
      default:
        break
    }

    const available = items.filter((p) => !p.agotado)
    const agotados = items.filter((p) => p.agotado)

    return [...available, ...agotados]
  }, [products, search, sort])

  async function handleCreateProduct(formData) {
    await createProduct(formData)

    if (
      activeTab === 'Todos' ||
      activeTab === formData.subcategoria
    ) {
      fetchProducts(activeTab)
    }
  }

  return (
    <div className="page catalog-page">
      <Header currentPage="catalog">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>

      <div className="catalog-tabs">
        {CATALOG_TABS.map((tab) => (
          <button
            key={tab}
            className={`catalog-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="catalog-toolbar">
        <div className="catalog-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <select
          className="catalog-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="catalog-container">
        {loading ? (
          <div className="catalog-grid">
            <SkeletonCard count={6} />
          </div>
        ) : (
          filteredProducts.length ? (
            <div className="catalog-grid">
              <ProductGrid
                products={filteredProducts}
                onDelete={deleteProduct}
                canDelete={adminMode}
              />

              {adminMode ? (
                <div className="product-card-admin add-new-card" onClick={() => setShowModal(true)}>
                  <div className="add-icon">+</div>
                  <span>Añadir Nuevo</span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="shop-card" style={{ marginTop: 8 }}>
              <p>No hay productos disponibles para esta categoria por ahora.</p>
            </div>
          )
        )}
      </div>

      {adminMode && showModal && (
        <AddProductModal
          activeTab={activeTab}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateProduct}
        />
      )}
    </div>
  )
}
