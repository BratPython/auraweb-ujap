import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ProductDetail() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)

    // Editable Fields
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [editPrice, setEditPrice] = useState('')
    const [editBg, setEditBg] = useState('#f6f0e6')
    const [editColor, setEditColor] = useState('#2b2318')

    const fileInputRef = useRef(null)

    useEffect(() => {
        async function fetchProduct() {
            try {
                const { data, error } = await supabase.from('productos').select('*').eq('id', id).single()
                if (error) throw error

                setProduct(data)
                setEditName(data.nombre || '')
                setEditDesc(data.descripcion || '')
                setEditPrice(data.precio || '')

                const theme = data.theme_config || { bg: '#f6f0e6', color: '#2b2318' }
                setEditBg(theme.bg)
                setEditColor(theme.color)

            } catch (err) {
                console.error("Error fetching product details:", err)
                alert("Producto no encontrado.")
                navigate('/catalogo')
            } finally {
                setLoading(false)
            }
        }
        fetchProduct()
    }, [id, navigate])

    const handleUpdate = async () => {
        setSaving(true)
        try {
            const { error } = await supabase.from('productos').update({
                nombre: editName,
                descripcion: editDesc,
                precio: parseFloat(editPrice) || 0,
                theme_config: { bg: editBg, color: editColor }
            }).eq('id', id)

            if (error) throw error
            alert("¡Cambios guardados con éxito!")
        } catch (err) {
            console.error("Error updating product:", err)
            alert("Hubo un error al guardar los cambios.")
        } finally {
            setSaving(false)
        }
    }

    const handleAddImage = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingImage(true)
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

            const { error: dbError } = await supabase.from('productos').update({
                imagenes: nextImages
            }).eq('id', id)

            if (dbError) throw dbError

            setProduct(prev => ({ ...prev, imagenes: nextImages }))

        } catch (err) {
            console.error("Error abdiendo imagen:", err)
            alert("Hubo un error al subir la foto adicional.")
        } finally {
            setUploadingImage(false)
            if (fileInputRef.current) fileInputRef.current.value = null
        }
    }

    const handleDeleteImage = async (indexToRemove) => {
        if (!window.confirm("¿Seguro que deseas quitar esta foto?")) return
        const nextImages = product.imagenes.filter((_, i) => i !== indexToRemove)

        try {
            setProduct(prev => ({ ...prev, imagenes: nextImages }))
            await supabase.from('productos').update({ imagenes: nextImages }).eq('id', id)
        } catch (err) {
            console.error("Error updating images array:", err)
        }
    }

    if (loading || !product) {
        return <div className="catalog-loading">Cargando detalles...</div>
    }

    return (
        <div
            className="product-detail-page"
            style={{ backgroundColor: editBg, color: editColor, minHeight: '100vh', transition: 'all 0.3s' }}
        >
            <header className="catalog-header" style={{ background: 'transparent', borderBottom: `1px solid ${editColor}33` }}>
                <button className="back-btn" onClick={() => navigate('/catalogo')} style={{ color: editColor }}>← Volver al Catálogo</button>
            </header>

            <div className="product-detail-container">

                {/* Left Side: Photo Gallery */}
                <div className="product-gallery">
                    <div className="main-image">
                        {product.imagenes && product.imagenes.length > 0 ? (
                            <img src={product.imagenes[0]} alt={product.nombre} />
                        ) : (
                            <div className="placeholder-detail">🖼️ Sin Foto</div>
                        )}
                    </div>
                    <div className="thumbnail-strip">
                        {product.imagenes?.map((imgUrl, i) => (
                            <div key={i} className="thumb-container">
                                <img src={imgUrl} alt={`Thumb ${i}`} />
                                {i > 0 && <button className="del-thumb-btn" onClick={() => handleDeleteImage(i)}>✕</button>}
                            </div>
                        ))}
                        <div className="add-thumb-btn" onClick={() => fileInputRef.current?.click()}>
                            {uploadingImage ? '⏳' : '+'}
                        </div>
                        <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAddImage} />
                    </div>
                </div>

                {/* Right Side: Admin Editor */}
                <div className="product-editor-panel" style={{ backgroundColor: `${editBg}fa` }}>
                    <h2 style={{ marginTop: 0, opacity: 0.5, fontSize: 12, textTransform: 'uppercase' }}>
                        Editando Producto: {product.subcategoria}
                    </h2>

                    <div className="form-group">
                        <label style={{ color: editColor }}>Nombre del producto</label>
                        <input
                            className="detail-input"
                            style={{ color: editColor, borderColor: `${editColor}33` }}
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ color: editColor }}>Precio ($)</label>
                        <input
                            type="number"
                            className="detail-input"
                            style={{ color: editColor, borderColor: `${editColor}33` }}
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ color: editColor }}>Descripción</label>
                        <textarea
                            className="detail-input"
                            rows={4}
                            style={{ color: editColor, borderColor: `${editColor}33` }}
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                        />
                    </div>

                    <div className="theme-override-box" style={{ borderColor: `${editColor}33` }}>
                        <h4 style={{ marginTop: 0 }}>🎨 Tema de esta página</h4>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>Fondo:
                                <input type="color" value={editBg} onChange={e => setEditBg(e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4 }} />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>Texto:
                                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4 }} />
                            </label>
                        </div>
                    </div>

                    <button
                        className="btn btn-save-detail"
                        style={{ background: editColor, color: editBg }}
                        onClick={handleUpdate}
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios Individuales'}
                    </button>
                </div>

            </div>
        </div>
    )
}
