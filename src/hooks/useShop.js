import React, { createContext, useContext, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const SHOP_USERS_KEY = 'aura:shopUsers'
const SHOP_SESSION_KEY = 'aura:shopSession'
const SHOP_CART_KEY = 'aura:shopCart'
const SHOP_INVOICES_KEY = 'aura:shopInvoices'
const IVA_RATE = 0.16

const ShopContext = createContext(null)

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures.
  }
}

function normalizeDocumentNumber(value) {
  return String(value || '').replace(/[^0-9A-Za-z]/g, '').trim().toUpperCase()
}

function createInvoiceNumbers() {
  const now = Date.now()
  const base = String(now).slice(-8)
  return {
    numeroFactura: `F-${base}`,
    numeroControl: `C-${String(now + 137).slice(-8)}`,
    rangoAsignado: 'Desde F-00000001 hasta F-99999999',
  }
}

function formatSeniatDate(date) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = String(date.getFullYear())
  return `${d}${m}${y}`
}

function formatSeniatTime(date) {
  const h24 = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  const period = h24 >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h24 % 12 || 12
  return `${String(h12).padStart(2, '0')}.${m}.${s} ${period}`
}

function calculateTotals(cartItems) {
  let baseImponibleIva = 0
  let baseExenta = 0

  const lineItems = cartItems.map((item, index) => {
    const unitPrice = Number(item.price) || 0
    const quantity = Number(item.quantity) || 0
    const discountPct = Math.max(0, Math.min(99, Number(item.discountPct) || 0))
    const discountedUnitPrice = unitPrice * (1 - discountPct / 100)
    const lineSubtotal = discountedUnitPrice * quantity
    const exento = !!item.exentoIva

    if (exento) {
      baseExenta += lineSubtotal
    } else {
      baseImponibleIva += lineSubtotal
    }

    return {
      code: item.code || `P-${index + 1}`,
      description: item.name,
      quantity,
      unitPrice,
      discountPct,
      discountedUnitPrice,
      exento,
      exentoMark: exento ? 'E' : '',
      lineSubtotal,
    }
  })

  const montoIva = baseImponibleIva * IVA_RATE
  const totalOperacion = baseImponibleIva + baseExenta + montoIva

  return {
    lineItems,
    subtotal: baseImponibleIva + baseExenta,
    baseImponibleIva,
    baseExenta,
    ivaRate: IVA_RATE,
    montoIva,
    totalOperacion,
  }
}

export function ShopProvider({ children }) {
  const [users, setUsers] = useState(() => readJson(SHOP_USERS_KEY, []))
  const [currentUser, setCurrentUser] = useState(() => readJson(SHOP_SESSION_KEY, null))
  const [cartItems, setCartItems] = useState(() => readJson(SHOP_CART_KEY, []))
  const [invoices, setInvoices] = useState(() => readJson(SHOP_INVOICES_KEY, []))

  function persistUsers(nextUsers) {
    setUsers(nextUsers)
    writeJson(SHOP_USERS_KEY, nextUsers)
  }

  function persistSession(user) {
    setCurrentUser(user)
    writeJson(SHOP_SESSION_KEY, user)
  }

  function persistCart(nextCart) {
    setCartItems(nextCart)
    writeJson(SHOP_CART_KEY, nextCart)
  }

  function persistInvoices(nextInvoices) {
    setInvoices(nextInvoices)
    writeJson(SHOP_INVOICES_KEY, nextInvoices)
  }

  function registerUser(payload) {
    const email = String(payload.email || '').trim().toLowerCase()
    const password = String(payload.password || '')

    if (!email || !password) {
      return { ok: false, error: 'Correo y contraseña son obligatorios.' }
    }

    if (users.some((u) => u.email === email)) {
      return { ok: false, error: 'Ese correo ya está registrado.' }
    }

    const nextUser = {
      id: crypto.randomUUID(),
      customerType: payload.customerType,
      legalName: String(payload.legalName || '').trim(),
      docType: payload.docType,
      docNumber: normalizeDocumentNumber(payload.docNumber),
      fiscalAddress: String(payload.fiscalAddress || '').trim(),
      email,
      password,
    }

    const nextUsers = [...users, nextUser]
    persistUsers(nextUsers)
    persistSession(nextUser)

    return { ok: true, user: nextUser }
  }

  function loginUser({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const user = users.find((u) => u.email === normalizedEmail && u.password === String(password || ''))

    if (!user) {
      return { ok: false, error: 'Credenciales inválidas.' }
    }

    persistSession(user)
    return { ok: true, user }
  }

  function logoutUser() {
    persistSession(null)
  }

  function addToCart(product, quantity = 1) {
    const stock = Number(product.stock) || 0
    if (stock <= 0) {
      return { ok: false, error: 'Producto agotado.' }
    }

    const nextQty = Math.max(1, Number(quantity) || 1)
    const existing = cartItems.find((i) => i.id === product.id)
    const existingQty = existing ? existing.quantity : 0
    const finalQty = existingQty + nextQty

    if (finalQty > stock) {
      return { ok: false, error: `Stock insuficiente. Disponible: ${stock}.` }
    }

    const baseItem = {
      id: product.id,
      code: product.code,
      name: product.name,
      price: Number(product.price) || 0,
      stock,
      exentoIva: !!product.exentoIva,
      discountPct: Math.max(0, Math.min(99, Number(product.discountPct) || 0)),
      quantity: finalQty,
    }

    const nextCart = existing
      ? cartItems.map((i) => (i.id === product.id ? baseItem : i))
      : [...cartItems, baseItem]

    persistCart(nextCart)
    return { ok: true }
  }

  function updateCartQuantity(productId, quantity) {
    const targetQty = Math.max(1, Number(quantity) || 1)
    const nextCart = cartItems.map((item) => {
      if (item.id !== productId) return item
      const safeQty = Math.min(targetQty, item.stock)
      return { ...item, quantity: safeQty }
    })
    persistCart(nextCart)
  }

  function removeFromCart(productId) {
    const nextCart = cartItems.filter((item) => item.id !== productId)
    persistCart(nextCart)
  }

  function clearCart() {
    persistCart([])
  }

  async function buildInvoice() {
    if (!currentUser) {
      return { ok: false, error: 'Debes iniciar sesión para facturar.' }
    }

    if (!cartItems.length) {
      return { ok: false, error: 'No hay productos en el carrito.' }
    }

    try {
      const ids = cartItems.map((i) => i.id)
      const { data: stockRows, error: stockError } = await supabase
        .from('productos')
        .select('id, stock, agotado, is_active')
        .in('id', ids)

      if (stockError) throw stockError

      const stockMap = new Map((stockRows || []).map((row) => [row.id, row]))

      for (const item of cartItems) {
        const row = stockMap.get(item.id)
        if (!row || row.is_active === false) {
          return { ok: false, error: `Producto no disponible: ${item.name}` }
        }

        const dbStock = Math.max(0, Number(row.stock) || 0)
        if (dbStock < item.quantity) {
          return { ok: false, error: `Stock insuficiente para ${item.name}. Disponible: ${dbStock}` }
        }
      }

      for (const item of cartItems) {
        const row = stockMap.get(item.id)
        const dbStock = Math.max(0, Number(row.stock) || 0)
        const nextStock = Math.max(0, dbStock - item.quantity)

        const { error: updateError } = await supabase
          .from('productos')
          .update({
            stock: nextStock,
            agotado: nextStock <= 0,
          })
          .eq('id', item.id)

        if (updateError) throw updateError
      }
    } catch (error) {
      console.error('Error descontando stock:', error)
      return { ok: false, error: 'No se pudo confirmar la compra por un problema de stock.' }
    }

    const now = new Date()
    const numbers = createInvoiceNumbers()
    const totals = calculateTotals(cartItems)

    const invoice = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      createdAt: now.toISOString(),
      title: 'FACTURA',
      issuer: {
        razonSocial: 'Aura Web C.A.',
        domicilio: 'Av. Principal de Valencia, Edo. Carabobo, Venezuela',
        rif: 'J-41234567-8',
      },
      controlFiscal: {
        numeroFactura: numbers.numeroFactura,
        numeroControl: numbers.numeroControl,
        rangoAsignado: numbers.rangoAsignado,
      },
      fecha: formatSeniatDate(now),
      hora: formatSeniatTime(now),
      client: {
        tipoCliente: currentUser.customerType,
        nombreORazonSocial: currentUser.legalName,
        domicilioFiscal: currentUser.fiscalAddress,
        identificacion: `${currentUser.docType}-${currentUser.docNumber}`,
      },
      items: totals.lineItems,
      totals,
      printer: {
        razonSocial: 'Imprenta Fiscal Demo 2026, C.A.',
        rif: 'J-40987654-3',
        nomenclatura: 'NFA-00-123456',
        providencia: 'SNAT/2026/00077',
        fechaAsignacion: '12032026',
      },
    }

    persistInvoices([invoice, ...invoices])

    clearCart()
    return { ok: true, invoice }
  }

  function getUserInvoices() {
    if (!currentUser) return []
    return invoices
      .filter((inv) => inv.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  function getInvoiceById(invoiceId) {
    if (!invoiceId) return null
    return invoices.find((inv) => inv.id === invoiceId) || null
  }

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity * (1 - item.discountPct / 100), 0),
    [cartItems]
  )

  const value = {
    users,
    currentUser,
    cartItems,
    subtotal,
    registerUser,
    loginUser,
    logoutUser,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    buildInvoice,
    getUserInvoices,
    getInvoiceById,
  }

  return React.createElement(ShopContext.Provider, { value }, children)
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) {
    throw new Error('useShop must be used within ShopProvider')
  }
  return ctx
}
