import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { buildNomenclature, loadInvoiceSettings } from '../config/invoiceSettings'

const SHOP_CART_KEY = 'aura:shopCart'
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

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function mapClientRowToUser(row, authUser) {
  return {
    id: authUser.id,
    email: authUser.email || row?.email || '',
    customerType: row?.tipo_persona || 'Natural',
    legalName: row?.nombre_razon_social || authUser.email || 'Cliente',
    docType: row?.tipo_documento || 'V',
    docNumber: row?.numero_documento || '',
    fiscalAddress: row?.domicilio_fiscal || '',
    phone: row?.telefono || '',
  }
}

function mapInvoiceRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.auth_user_id,
    createdAt: row.created_at,
    title: row.title,
    issuer: row.issuer,
    controlFiscal: row.control_fiscal,
    fecha: row.fecha,
    hora: row.hora,
    client: row.customer_profile,
    items: row.items,
    totals: row.totals,
    payments: row.payments,
    printer: row.printer,
    adminSettingsSnapshot: row.admin_settings_snapshot,
  }
}

function normalizeDocumentNumber(value) {
  return String(value || '').replace(/[^0-9A-Za-z]/g, '').trim().toUpperCase()
}

function normalizePaymentBreakdown(entries = []) {
  if (!Array.isArray(entries)) return []

  return entries
    .map((entry) => {
      const method = String(entry?.method || '').trim().toLowerCase()
      const amount = roundMoney(entry?.amount)
      const status = String(entry?.status || (amount > 0 ? 'paid' : 'pending')).trim().toLowerCase()

      return {
        method,
        amount,
        status,
        reference: String(entry?.reference || '').trim(),
        details: entry?.details && typeof entry.details === 'object' ? entry.details : null,
      }
    })
    .filter((entry) => entry.amount > 0)
}

function buildAssignedRange(controlFiscal = {}) {
  const min = String(controlFiscal.rangoMin ?? '').replace(/\D/g, '').slice(0, 8) || '00000001'
  const max = String(controlFiscal.rangoMax ?? '').replace(/\D/g, '').slice(0, 8) || '99999999'
  return `Desde F-${min.padStart(8, '0')} hasta F-${max.padStart(8, '0')}`
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
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [cartItems, setCartItems] = useState(() => readJson(SHOP_CART_KEY, []))
  const [invoices, setInvoices] = useState([])

  const persistSession = useCallback((user) => {
    setCurrentUser(user)
  }, [])

  const persistCart = useCallback((nextCart) => {
    setCartItems(nextCart)
    writeJson(SHOP_CART_KEY, nextCart)
  }, [])

  const syncProfileFromAuth = useCallback(async (authUser) => {
    if (!authUser?.id) return null

    let profileRow = null

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    if (error) {
      throw error
    }

    profileRow = data

    if (!profileRow) {
      const insertPayload = {
        auth_user_id: authUser.id,
        email: authUser.email || '',
        tipo_persona: String(authUser.user_metadata?.customerType || 'Natural'),
        tipo_documento: String(authUser.user_metadata?.docType || 'V'),
        numero_documento: normalizeDocumentNumber(authUser.user_metadata?.docNumber || ''),
        nombre_razon_social: String(authUser.user_metadata?.legalName || authUser.email || 'Cliente').trim(),
        domicilio_fiscal: String(authUser.user_metadata?.fiscalAddress || '').trim(),
        telefono: String(authUser.user_metadata?.phone || '').trim(),
      }

      const { data: inserted, error: insertError } = await supabase
        .from('clientes')
        .insert(insertPayload)
        .select('*')
        .single()

      if (insertError) {
        throw insertError
      }

      profileRow = inserted
    }

    const mapped = mapClientRowToUser(profileRow, authUser)
    persistSession(mapped)
    return mapped
  }, [persistSession])

  const loadInvoicesForUser = useCallback(async (authUserId) => {
    if (!authUserId) {
      setInvoices([])
      return []
    }

    setInvoicesLoading(true)
    try {
      const { data, error } = await supabase
        .from('shop_invoices')
        .select('*')
        .eq('auth_user_id', authUserId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const nextInvoices = (data || []).map(mapInvoiceRow).filter(Boolean)
      setInvoices(nextInvoices)
      return nextInvoices
    } finally {
      setInvoicesLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function syncFromSession(session) {
      if (!active) return

      const authUser = session?.user || null

      if (!authUser) {
        setInvoices([])
        persistSession(null)
        setAuthLoading(false)
        return
      }

      setAuthLoading(true)
      try {
        await syncProfileFromAuth(authUser)
        await loadInvoicesForUser(authUser.id)
      } catch (error) {
        console.error('Error sincronizando sesion de cliente:', error)
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    async function bootstrap() {
      setAuthLoading(true)
      try {
        const { data: sessionData, error } = await supabase.auth.getSession()
        if (error) throw error

        const authUser = sessionData?.session?.user || null
        if (!active) return

        if (!authUser) {
          setInvoices([])
          persistSession(null)
          return
        }

        await syncProfileFromAuth(authUser)
        await loadInvoicesForUser(authUser.id)
      } catch (error) {
        console.error('Error iniciando sesion de cliente:', error)
        if (active) {
          setInvoices([])
          persistSession(null)
        }
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep callback sync to avoid GoTrue lock contention; defer async work.
      setTimeout(() => {
        void syncFromSession(session)
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadInvoicesForUser, persistSession, syncProfileFromAuth])

  async function registerUser(payload) {
    const email = String(payload.email || '').trim().toLowerCase()
    const password = String(payload.password || '')

    if (!email || !password) {
      return { ok: false, error: 'Correo y contraseña son obligatorios.' }
    }

    const metadata = {
      customerType: String(payload.customerType || 'Natural'),
      legalName: String(payload.legalName || '').trim(),
      docType: String(payload.docType || 'V'),
      docNumber: normalizeDocumentNumber(payload.docNumber),
      fiscalAddress: String(payload.fiscalAddress || '').trim(),
      phone: String(payload.phone || '').trim(),
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    if (error) {
      return { ok: false, error: error.message || 'No se pudo registrar la cuenta.' }
    }

    if (!data?.user) {
      return { ok: false, error: 'No se pudo crear el usuario en Auth.' }
    }

    if (!data.session) {
      return {
        ok: true,
        pendingVerification: true,
        message: 'Cuenta creada. Revisa tu correo para confirmar y luego iniciar sesion.',
      }
    }

    try {
      const { error: profileError } = await supabase
        .from('clientes')
        .upsert(
          {
            auth_user_id: data.user.id,
            email,
            tipo_persona: metadata.customerType,
            tipo_documento: metadata.docType,
            numero_documento: metadata.docNumber,
            nombre_razon_social: metadata.legalName,
            domicilio_fiscal: metadata.fiscalAddress,
            telefono: metadata.phone,
          },
          { onConflict: 'auth_user_id' }
        )

      if (profileError) throw profileError

      const mapped = await syncProfileFromAuth(data.user)
      await loadInvoicesForUser(data.user.id)
      return { ok: true, user: mapped }
    } catch (profileError) {
      console.error('Error guardando perfil del cliente:', profileError)
      return { ok: false, error: 'Cuenta creada, pero no se pudo guardar el perfil fiscal.' }
    }
  }

  async function loginUser({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: String(password || ''),
    })

    if (error || !data?.user) {
      return { ok: false, error: error?.message || 'Credenciales inválidas.' }
    }

    const mapped = await syncProfileFromAuth(data.user)
    await loadInvoicesForUser(data.user.id)
    return { ok: true, user: mapped }
  }

  async function logoutUser() {
    await supabase.auth.signOut()
    setInvoices([])
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

  const getCartTotals = useCallback(() => {
    return calculateTotals(cartItems)
  }, [cartItems])

  async function buildInvoice({ paymentBreakdown = [] } = {}) {
    if (!currentUser) {
      return { ok: false, error: 'Debes iniciar sesión para facturar.' }
    }

    if (!cartItems.length) {
      return { ok: false, error: 'No hay productos en el carrito.' }
    }

    const totals = calculateTotals(cartItems)
    const normalizedPayments = normalizePaymentBreakdown(paymentBreakdown)
    const expectedTotal = roundMoney(totals.totalOperacion)
    const paidTotal = roundMoney(normalizedPayments.reduce((acc, payment) => acc + payment.amount, 0))

    if (!normalizedPayments.length) {
      return { ok: false, error: 'Debes registrar al menos un pago antes de facturar.' }
    }

    if (Math.abs(expectedTotal - paidTotal) > 0.009) {
      return {
        ok: false,
        error: `El total pagado ($${paidTotal.toFixed(2)}) debe coincidir con el total de la orden ($${expectedTotal.toFixed(2)}).`,
      }
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
    const invoiceSettings = loadInvoiceSettings()
    const nomenclaturaFactura = buildNomenclature({
      date: now,
      dateFormat: invoiceSettings?.printer?.nomenclaturaFormatoFactura,
    })
    const nomenclaturaControl = buildNomenclature({
      date: now,
      dateFormat: invoiceSettings?.printer?.nomenclaturaFormatoControl,
    })

    const invoice = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      createdAt: now.toISOString(),
      title: invoiceSettings.controlFiscal.tituloFactura,
      issuer: {
        razonSocial: invoiceSettings.issuer.razonSocial,
        domicilio: invoiceSettings.issuer.domicilio,
        rif: invoiceSettings.issuer.rif,
        telefono: invoiceSettings.issuer.telefono,
        email: invoiceSettings.issuer.email,
      },
      controlFiscal: {
        numeroFactura: nomenclaturaFactura,
        numeroControl: nomenclaturaControl,
        rangoAsignado: buildAssignedRange(invoiceSettings.controlFiscal),
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
      payments: {
        methods: normalizedPayments,
        totalPaid: paidTotal,
        currency: 'USD',
        status: 'paid',
        paidAt: now.toISOString(),
      },
      printer: {
        razonSocial: invoiceSettings.printer.razonSocial,
        rif: invoiceSettings.printer.rif,
        nomenclaturaFactura,
        nomenclaturaControl,
        providencia: invoiceSettings.printer.providencia,
        fechaAsignacion: invoiceSettings.printer.fechaAsignacion,
        serialFiscal: invoiceSettings.printer.serialFiscal,
      },
      adminSettingsSnapshot: invoiceSettings,
    }

    const { data: insertedInvoice, error: invoiceInsertError } = await supabase
      .from('shop_invoices')
      .insert({
        auth_user_id: currentUser.id,
        title: invoice.title,
        fecha: invoice.fecha,
        hora: invoice.hora,
        customer_profile: invoice.client,
        issuer: invoice.issuer,
        control_fiscal: invoice.controlFiscal,
        printer: invoice.printer,
        totals: invoice.totals,
        items: invoice.items,
        payments: invoice.payments,
        admin_settings_snapshot: invoice.adminSettingsSnapshot,
      })
      .select('*')
      .single()

    if (invoiceInsertError) {
      console.error('Error guardando factura en Supabase:', invoiceInsertError)
      return { ok: false, error: 'No se pudo guardar la factura en la base de datos.' }
    }

    const persistedInvoice = mapInvoiceRow(insertedInvoice)
    setInvoices((prev) => [persistedInvoice, ...prev])

    clearCart()
    return { ok: true, invoice: persistedInvoice }
  }

  function getUserInvoices() {
    if (!currentUser) return []
    return [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  function getInvoiceById(invoiceId) {
    if (!invoiceId) return null
    return invoices.find((inv) => inv.id === invoiceId) || null
  }

  async function fetchInvoiceById(invoiceId) {
    if (!invoiceId || !currentUser?.id) return null

    const fromCache = getInvoiceById(invoiceId)
    if (fromCache) return fromCache

    const { data, error } = await supabase
      .from('shop_invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('auth_user_id', currentUser.id)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    const mapped = mapInvoiceRow(data)
    setInvoices((prev) => {
      if (prev.some((inv) => inv.id === mapped.id)) return prev
      return [mapped, ...prev]
    })
    return mapped
  }

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity * (1 - item.discountPct / 100), 0),
    [cartItems]
  )

  const value = {
    currentUser,
    authLoading,
    invoicesLoading,
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
    getCartTotals,
    getUserInvoices,
    getInvoiceById,
    fetchInvoiceById,
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
