import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { SUB_CATEGORIAS_ACCESORIOS } from '../config/constants'

export function useProducts(activeTab) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async (tab) => {
    setLoading(true)
    try {
      let query = supabase.from('productos').select('*').eq('is_active', true)

      if (tab === 'Todos') {
        // no extra filter — fetch all
      } else if (tab === 'Accesorios') {
        query = query.eq('categoria', 'Accesorios')
      } else {
        query = query.eq('categoria', 'Bags').eq('subcategoria', tab)
      }

      const { data, error } = await query
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts(activeTab)
  }, [activeTab, fetchProducts])

  async function deleteProduct(id) {
    try {
      const { error } = await supabase.from('productos').update({ is_active: false }).eq('id', id)
      if (error) throw error
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  async function createProduct({ nombre, descripcion, precio, subcategoria, imageFile }) {
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('recursos_aura')
      .upload(fileName, imageFile)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('recursos_aura')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl

    let category = 'Bags'
    if (SUB_CATEGORIAS_ACCESORIOS.includes(subcategoria)) {
      category = 'Accesorios'
    }

    const { data, error: dbError } = await supabase
      .from('productos')
      .insert([
        {
          nombre,
          descripcion,
          categoria: category,
          subcategoria,
          precio: parseFloat(precio) || 0,
          imagenes: [imageUrl],
          theme_config: { bg: '#f6f0e6', color: '#2b2318' },
          is_active: true,
        },
      ])
      .select()

    if (dbError) throw dbError
    return { data, category }
  }

  return { products, loading, fetchProducts, deleteProduct, createProduct }
}
