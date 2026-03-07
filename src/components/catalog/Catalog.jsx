import React, { useState } from 'react'
import Header from '../layout/Header'
import ProductGrid from './ProductGrid'
import AddProductModal from './AddProductModal'
import { useProducts } from '../../hooks/useProducts'
import { CATALOG_TABS } from '../../config/constants'

export default function Catalog() {
  const [activeTab, setActiveTab] = useState('Tote bags')
  const [showModal, setShowModal] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')

  const { products, loading, fetchProducts, deleteProduct, createProduct } = useProducts(activeTab)

  async function handleCreateProduct(formData) {
    const { category } = await createProduct(formData)

    setAlertMsg('¡Producto creado exitosamente!')
    setTimeout(() => setAlertMsg(''), 3000)

    if (
      activeTab === formData.subcategoria ||
      (activeTab === 'Accesorios' && category === 'Accesorios')
    ) {
      fetchProducts(activeTab)
    }
  }

  return (
    <div className="page catalog-page">
      <Header currentPage="catalog" />

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

      <div className="catalog-container">
        {alertMsg && <div className="catalog-alert success">{alertMsg}</div>}

        {loading ? (
          <div className="catalog-loading">Cargando productos...</div>
        ) : (
          <div className="catalog-grid">
            <ProductGrid products={products} onDelete={deleteProduct} />

            <div className="product-card-admin add-new-card" onClick={() => setShowModal(true)}>
              <div className="add-icon">+</div>
              <span>Añadir Nuevo</span>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddProductModal
          activeTab={activeTab}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateProduct}
        />
      )}
    </div>
  )
}
