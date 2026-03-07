import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import ProductGallery from './ProductGallery'
import ProductEditor from './ProductEditor'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editBg, setEditBg] = useState('#f6f0e6')
  const [editColor, setEditColor] = useState('#2b2318')

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
        console.error('Error fetching product details:', err)
        alert('Producto no encontrado.')
        navigate('/catalogo')
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
          theme_config: { bg: editBg, color: editColor },
        })
        .eq('id', id)

      if (error) throw error
      alert('¡Cambios guardados con éxito!')
    } catch (err) {
      console.error('Error updating product:', err)
      alert('Hubo un error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddImage(file) {
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

      const { error: dbError } = await supabase
        .from('productos')
        .update({ imagenes: nextImages })
        .eq('id', id)

      if (dbError) throw dbError

      setProduct((prev) => ({ ...prev, imagenes: nextImages }))
    } catch (err) {
      console.error('Error añadiendo imagen:', err)
      alert('Hubo un error al subir la foto adicional.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleDeleteImage(indexToRemove) {
    if (!window.confirm('¿Seguro que deseas quitar esta foto?')) return
    const nextImages = product.imagenes.filter((_, i) => i !== indexToRemove)

    try {
      setProduct((prev) => ({ ...prev, imagenes: nextImages }))
      await supabase.from('productos').update({ imagenes: nextImages }).eq('id', id)
    } catch (err) {
      console.error('Error updating images array:', err)
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
      <header
        className="catalog-header"
        style={{ background: 'transparent', borderBottom: `1px solid ${editColor}33` }}
      >
        <button className="back-btn" onClick={() => navigate('/catalogo')} style={{ color: editColor }}>
          ← Volver al Catálogo
        </button>
      </header>

      <div className="product-detail-container">
        <ProductGallery
          images={product.imagenes}
          uploadingImage={uploadingImage}
          onAddImage={handleAddImage}
          onDeleteImage={handleDeleteImage}
        />

        <ProductEditor
          editName={editName}
          setEditName={setEditName}
          editDesc={editDesc}
          setEditDesc={setEditDesc}
          editPrice={editPrice}
          setEditPrice={setEditPrice}
          editBg={editBg}
          setEditBg={setEditBg}
          editColor={editColor}
          setEditColor={setEditColor}
          subcategoria={product.subcategoria}
          saving={saving}
          onSave={handleUpdate}
        />
      </div>
    </div>
  )
}
