import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const TABS = ['Tote bags', 'Carteras', 'Uni bags', 'Bandoleras', 'Accesorios']
const SUB_CATEGORIAS_BOLSOS = ['Tote bags', 'Carteras', 'Uni bags', 'Bandoleras']
const SUB_CATEGORIAS_ACCESORIOS = ['Cinturones', 'Lentes', 'Extras']

export default function Catalog() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('Tote bags')
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [alertMsg, setAlertMsg] = useState('')

    // Form State
    const [formName, setFormName] = useState('')
    const [formDesc, setFormDesc] = useState('')
    const [formPrice, setFormPrice] = useState('')
    const [formSubcategory, setFormSubcategory] = useState('Tote bags')
    const fileInputRef = useRef(null)

    const fetchProducts = async (tab) => {
        setLoading(true)
        try {
            let query = supabase.from('productos').select('*').eq('is_active', true)

            if (tab === 'Accesorios') {
                query = query.eq('categoria', 'Accesorios')
            } else {
                query = query.eq('categoria', 'Bags').eq('subcategoria', tab)
            }

            const { data, error } = await query
            if (error) throw error
            setProducts(data || [])
        } catch (err) {
            console.error("Error fetching products:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProducts(activeTab)
    }, [activeTab])

    const handleDelete = async (e, id) => {
        e.stopPropagation() // Prevent navigating to detail
        if (!window.confirm("¿Estás seguro de que deseas eliminar este producto?")) return

        try {
            const { error } = await supabase.from('productos').update({ is_active: false }).eq('id', id)
            if (error) throw error
            setProducts(prev => prev.filter(p => p.id !== id))
        } catch (err) {
            console.error("Error deleting product:", err)
        }
    }

    const handleAddSubmit = async (e) => {
        e.preventDefault()
        if (!formName || !formPrice) return

        const file = fileInputRef.current?.files?.[0]
        if (!file) {
            alert("Por favor selecciona una imagen para el producto.")
            return
        }

        setIsSubmitting(true)

        try {
            // 1. Upload image
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('recursos_aura')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('recursos_aura')
                .getPublicUrl(fileName)

            const imageUrl = urlData.publicUrl

            // 2. Determine main category
            let category = 'Bags'
            if (SUB_CATEGORIAS_ACCESORIOS.includes(formSubcategory)) {
                category = 'Accesorios'
            }

            // 3. Insert into DB
            const { data, error: dbError } = await supabase.from('productos').insert([{
                nombre: formName,
                descripcion: formDesc,
                categoria: category,
                subcategoria: formSubcategory,
                precio: parseFloat(formPrice) || 0,
                imagenes: [imageUrl],
                theme_config: { bg: '#f6f0e6', color: '#2b2318' }, // Default detail view theme
                is_active: true
            }]).select()

            if (dbError) throw dbError

            // Show success, reset and refresh
            setAlertMsg('¡Producto creado exitosamente!')
            setTimeout(() => setAlertMsg(''), 3000)

            setFormName('')
            setFormDesc('')
            setFormPrice('')
            if (fileInputRef.current) {
                fileInputRef.current.value = null
            }
            setShowModal(false)

            if (activeTab === formSubcategory || (activeTab === 'Accesorios' && category === 'Accesorios')) {
                fetchProducts(activeTab)
            }

        } catch (err) {
            console.error("Error creating product:", err)
            alert("Uh oh! Hubo un error subiendo el producto.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="page catalog-page">
            <header className="catalog-header">
                <h1 className="catalog-logo" onClick={() => navigate('/')}>Catálogo</h1>
            </header>

            <div className="catalog-tabs">
                {TABS.map(tab => (
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
                        {products.map(p => (
                            <div
                                key={p.id}
                                className="product-card-admin"
                                onClick={() => navigate(`/producto/${p.id}`)}
                            >
                                <button className="del-btn badge-btn" onClick={(e) => handleDelete(e, p.id)} title="Culta/Eliminar">
                                    ⛔
                                </button>
                                <div className="product-image-frame">
                                    {p.imagenes && p.imagenes.length > 0 ? (
                                        <img src={p.imagenes[0]} alt={p.nombre} />
                                    ) : (
                                        <div className="product-placeholder">👜</div>
                                    )}
                                </div>
                                <div className="product-info-bar">
                                    <span className="product-name">{p.nombre}</span>
                                    <span className="product-price">${p.precio}</span>
                                </div>
                            </div>
                        ))}

                        {/* Add New Card Slot */}
                        <div className="product-card-admin add-new-card" onClick={() => setShowModal(true)}>
                            <div className="add-icon">+</div>
                            <span>Añadir Nuevo</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        {isSubmitting ? (
                            <div className="uploading-state">
                                <div className="spinner"></div>
                                <h2>Guardando y subiendo imagen...</h2>
                                <p>Por favor no cierres esta ventana.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAddSubmit}>
                                <div className="modal-header">
                                    <h2>Añadir Producto a {activeTab}</h2>
                                    <button type="button" className="close-btn" onClick={() => setShowModal(false)}>✕</button>
                                </div>

                                <div className="form-group row-flex">
                                    <div style={{ flex: 2 }}>
                                        <label>Nombre del Producto *</label>
                                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Precio ($) *</label>
                                        <input type="number" step="0.01" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value)} required />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Subcategoría *</label>
                                    <select value={formSubcategory} onChange={e => setFormSubcategory(e.target.value)}>
                                        <optgroup label="Bags">
                                            {SUB_CATEGORIAS_BOLSOS.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                        </optgroup>
                                        <optgroup label="Accesorios">
                                            {SUB_CATEGORIAS_ACCESORIOS.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                        </optgroup>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Descripción</label>
                                    <textarea rows="3" value={formDesc} onChange={e => setFormDesc(e.target.value)}></textarea>
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
                    </div>
                </div>
            )}
        </div>
    )
}
