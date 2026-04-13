import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { SUB_CATEGORIAS_ACCESORIOS } from '../config/constants'

const PRODUCTS_CACHE_KEY_PREFIX = 'aura:productsCache:'
const QUERY_TIMEOUT_MS = 8000

function withTimeout(promise, timeoutMs = QUERY_TIMEOUT_MS) {
  let timeoutId
  const requestPromise = Promise.resolve(promise)

  return new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('SUPABASE_PRODUCTS_TIMEOUT')), timeoutMs)

    requestPromise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

function getCacheKey(tab) {
  return `${PRODUCTS_CACHE_KEY_PREFIX}${tab || 'Todos'}`
}

function readCachedProducts(tab) {
  try {
    const raw = localStorage.getItem(getCacheKey(tab))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCachedProducts(tab, products) {
  try {
    localStorage.setItem(getCacheKey(tab), JSON.stringify(Array.isArray(products) ? products : []))
  } catch {
    // Ignore cache write failures.
  }
}

export function useProducts(activeTab) {
  const [products, setProducts] = useState(() => readCachedProducts(activeTab))
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async (tab) => {
    const effectiveTab = tab || 'Todos'
    setLoading(true)
    try {
      let query = supabase.from('productos').select('*').eq('is_active', true)

      if (effectiveTab === 'Todos') {
        // no extra filter — fetch all
      } else {
        // Every tab (except "Todos") maps directly to a subcategory.
        query = query.eq('subcategoria', effectiveTab)
      }

      const { data, error } = await withTimeout(query)
      if (error) throw error
      const nextProducts = data || []
      setProducts(nextProducts)
      writeCachedProducts(effectiveTab, nextProducts)
    } catch (err) {
      console.error('Error fetching products:', err)

      const cachedProducts = readCachedProducts(effectiveTab)
      if (cachedProducts.length) {
        setProducts(cachedProducts)
        return
      }

      try {
        let fallbackQuery = supabase
          .from('productos')
          .select('*')
          .or('is_active.is.null,is_active.eq.true')

        if (effectiveTab !== 'Todos') {
          fallbackQuery = fallbackQuery.eq('subcategoria', effectiveTab)
        }

        const { data: fallbackData, error: fallbackError } = await withTimeout(fallbackQuery)
        if (fallbackError) throw fallbackError

        const fallbackProducts = fallbackData || []
        setProducts(fallbackProducts)
        writeCachedProducts(effectiveTab, fallbackProducts)
      } catch (fallbackErr) {
        console.error('Error fetching products (fallback):', fallbackErr)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cached = readCachedProducts(activeTab)
    if (cached.length) {
      setProducts(cached)
      setLoading(false)
    }

    fetchProducts(activeTab)
  }, [activeTab, fetchProducts])

  async function deleteProduct(id) {
    try {
      const { error } = await supabase.from('productos').update({ is_active: false }).eq('id', id)
      if (error) throw error
      setProducts((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting product:', err)
      throw err
    }
  }

  async function createProduct({ nombre, descripcion, precio, is_descuento = 0, subcategoria, imageFile }) {
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
          is_descuento: Math.max(0, Math.min(99, Number.parseInt(is_descuento, 10) || 0)),
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
