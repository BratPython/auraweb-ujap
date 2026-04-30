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

function authErrorMessage(error) {
  return String(error?.message || '').trim()
}

function isAuth429Error(error) {
  const status = Number(error?.status)
  const code = String(error?.code || '').toLowerCase()
  const message = authErrorMessage(error).toLowerCase()

  return (
    status === 429 ||
    code.includes('429') ||
    message.includes('too many request') ||
    message.includes('rate limit')
  )
}

function isUserAlreadyRegisteredError(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = authErrorMessage(error).toLowerCase()
  return code.includes('already') || message.includes('already registered')
}

function isEmailConfirmationRequiredError(error) {
  const message = authErrorMessage(error).toLowerCase()
  return (
    message.includes('email not confirmed') ||
    message.includes('confirm your email') ||
    message.includes('needs to be confirmed')
  )
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
    coupon: row.coupon,
    printer: row.printer,
    adminSettingsSnapshot: row.admin_settings_snapshot,
  }
}

function normalizeCartSnapshot(items = []) {
  if (!Array.isArray(items)) return []

  return items
    .map((item, index) => {
      const id = item?.id || null
      if (!id) return null

      return {
        id,
        lineKey: String(item?.lineKey || `${id}::default`),
        code: item?.code || `P-${index + 1}`,
        name: item?.name || item?.description || 'Producto',
        selectedColor: String(item?.selectedColor || '').trim(),
        colorOptionsCount: Math.max(0, Number(item?.colorOptionsCount) || 0),
        image: String(item?.image || item?.imageUrl || item?.thumbnail || '').trim(),
        price: Number(item?.price ?? item?.unitPrice) || 0,
        stock: Math.max(0, Number(item?.stock) || 0),
        exentoIva: !!item?.exentoIva || !!item?.exento,
        discountPct: Math.max(0, Math.min(99, Number(item?.discountPct) || 0)),
        quantity: Math.max(1, Number(item?.quantity) || 1),
      }
    })
    .filter(Boolean)
}

function mapCheckoutSessionRow(row) {
  if (!row) return null

  return {
    id: row.id,
    userId: row.auth_user_id,
    status: row.status,
    cartSnapshot: normalizeCartSnapshot(row.cart_snapshot),
    totalsSnapshot: row.totals_snapshot && typeof row.totals_snapshot === 'object' ? row.totals_snapshot : {},
    couponSnapshot:
      row.coupon_snapshot && typeof row.coupon_snapshot === 'object' ? row.coupon_snapshot : null,
    currency: row.currency || 'USD',
    paidTotal: roundMoney(row.paid_total),
    remainingTotal: roundMoney(row.remaining_total),
    invoiceId: row.invoice_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null,
  }
}

function mapCheckoutPaymentRow(row) {
  if (!row) return null

  return {
    id: row.id,
    checkoutId: row.checkout_session_id,
    userId: row.auth_user_id,
    method: String(row.method || '').trim().toLowerCase(),
    amount: roundMoney(row.amount),
    status: String(row.status || '').trim().toLowerCase(),
    reference: String(row.reference || '').trim(),
    details: row.details && typeof row.details === 'object' ? row.details : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPendingCheckoutSnapshotEntry(raw) {
  if (!raw || typeof raw !== 'object') return null

  const session = mapCheckoutSessionRow(raw.session)
  if (!session) return null

  const payments = Array.isArray(raw.payments)
    ? raw.payments.map(mapCheckoutPaymentRow).filter(Boolean)
    : []

  return { session, payments }
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

function normalizeCouponCode(value) {
  return String(value || '').trim().toUpperCase()
}

function mapCouponPayload(raw) {
  if (!raw || typeof raw !== 'object') return null

  const code = normalizeCouponCode(raw.code)
  const usageType = String(raw.usageType || raw.usage_type || '').trim().toLowerCase()
  const discountPct = Math.max(0, Math.min(100, Number(raw.discountPct ?? raw.discount_pct) || 0))

  if (!code || !usageType || discountPct <= 0) return null

  return {
    id: raw.id || null,
    code,
    discountPct,
    usageType,
    isActive: raw.isActive ?? raw.is_active ?? true,
    used: raw.used ?? false,
  }
}

function couponReasonMessage(reason) {
  switch (String(reason || '').trim().toLowerCase()) {
    case 'empty':
      return 'Ingresa un codigo de cupon.'
    case 'not_found':
      return 'El cupon no existe.'
    case 'inactive':
      return 'Este cupon esta inactivo.'
    case 'used':
    case 'used_or_inactive':
      return 'Este cupon ya fue utilizado o no esta disponible.'
    default:
      return 'No se pudo aplicar el cupon.'
  }
}

function buildCheckoutTotalsSnapshot(cartItems, coupon = null) {
  const rawTotals = calculateTotals(cartItems)
  const selectedCoupon = mapCouponPayload(coupon)
  const discountAmount = selectedCoupon
    ? roundMoney(rawTotals.totalOperacion * (selectedCoupon.discountPct / 100))
    : 0

  const totalToPay = roundMoney(Math.max(0, rawTotals.totalOperacion - discountAmount))

  const snapshot = {
    ...rawTotals,
    totalBeforeCoupon: roundMoney(rawTotals.totalOperacion),
    discountAmount,
    totalToPay,
    totalOperacion: totalToPay,
  }

  if (selectedCoupon) {
    snapshot.coupon = {
      id: selectedCoupon.id,
      code: selectedCoupon.code,
      usageType: selectedCoupon.usageType,
      discountPct: selectedCoupon.discountPct,
    }
  }

  return snapshot
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

    const selectedColor = String(item.selectedColor || '').trim()
    const colorOptionsCount = Math.max(0, Number(item.colorOptionsCount) || 0)
    const lineDescription =
      colorOptionsCount > 1 && selectedColor ? `${item.name} (${selectedColor})` : item.name

    return {
      code: item.code || `P-${index + 1}`,
      description: lineDescription,
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
  const [pendingCheckoutLoading, setPendingCheckoutLoading] = useState(false)
  const [cartItems, setCartItems] = useState(() => readJson(SHOP_CART_KEY, []))
  const [invoices, setInvoices] = useState([])
  const [pendingCheckoutList, setPendingCheckoutList] = useState([])
  const [pendingCheckout, setPendingCheckout] = useState(null)
  const [pendingCheckoutPayments, setPendingCheckoutPayments] = useState([])

  const persistSession = useCallback((user) => {
    setCurrentUser(user)
  }, [])

  const persistCart = useCallback((nextCart) => {
    setCartItems(nextCart)
    writeJson(SHOP_CART_KEY, nextCart)
  }, [])

  const clearPendingCheckoutState = useCallback(() => {
    setPendingCheckoutList([])
    setPendingCheckout(null)
    setPendingCheckoutPayments([])
  }, [])

  const syncPendingCheckout = useCallback(async (options = {}) => {
    const normalizedOptions =
      options && typeof options === 'object'
        ? options
        : { forceUserId: options }

    const { forceUserId = null, selectCheckoutId = null } = normalizedOptions
    const effectiveUserId = forceUserId || currentUser?.id
    if (!effectiveUserId) {
      clearPendingCheckoutState()
      return null
    }

    setPendingCheckoutLoading(true)
    try {
      const { data, error } = await supabase.rpc('list_pending_checkout_snapshots')
      if (error) throw error

      if (!data?.ok) {
        clearPendingCheckoutState()
        return null
      }

      const mappedItems = Array.isArray(data.items)
        ? data.items.map(mapPendingCheckoutSnapshotEntry).filter(Boolean)
        : []

      const mappedSessions = mappedItems.map((entry) => entry.session)
      setPendingCheckoutList(mappedSessions)

      const preferredCheckoutId = selectCheckoutId || pendingCheckout?.id || null
      const selectedEntry = (preferredCheckoutId
        ? mappedItems.find((entry) => entry.session.id === preferredCheckoutId)
        : null) || mappedItems[0] || null

      setPendingCheckout(selectedEntry?.session || null)
      setPendingCheckoutPayments(selectedEntry?.payments || [])

      return {
        items: mappedItems,
        session: selectedEntry?.session || null,
        payments: selectedEntry?.payments || [],
      }
    } catch (error) {
      console.error('Error cargando checkout pendiente:', error)
      clearPendingCheckoutState()
      return null
    } finally {
      setPendingCheckoutLoading(false)
    }
  }, [clearPendingCheckoutState, currentUser?.id, pendingCheckout?.id])

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

  const ensurePendingCheckout = useCallback(async ({
    coupon = undefined,
    cartOverride = null,
    checkoutId = null,
    forceNew = false,
  } = {}) => {
    if (!currentUser?.id) {
      return { ok: false, error: 'Debes iniciar sesion para continuar con el pago.' }
    }

    const targetSession = checkoutId
      ? pendingCheckoutList.find((session) => session.id === checkoutId) || null
      : pendingCheckout

    const normalizedOverride = normalizeCartSnapshot(cartOverride)
    const cartSource = normalizedOverride.length
      ? normalizedOverride
      : targetSession?.cartSnapshot?.length
        ? normalizeCartSnapshot(targetSession.cartSnapshot)
        : normalizeCartSnapshot(cartItems)

    if (!cartSource.length) {
      return { ok: false, error: 'No hay productos en el carrito para iniciar checkout.' }
    }

    const couponSource = coupon === undefined ? targetSession?.couponSnapshot : coupon
    const selectedCoupon = mapCouponPayload(couponSource)
    const totalsSnapshot = buildCheckoutTotalsSnapshot(cartSource, selectedCoupon)
    const couponSnapshot = selectedCoupon

    try {
      const shouldCreate = forceNew || !targetSession?.id

      if (!shouldCreate && checkoutId && targetSession?.id !== checkoutId) {
        return { ok: false, error: 'La cuenta por pagar seleccionada no existe o ya no esta disponible.' }
      }

      if (shouldCreate) {
        const { data, error } = await supabase.rpc('create_checkout_session', {
          cart_snapshot: cartSource,
          totals_snapshot: totalsSnapshot,
          coupon_snapshot: couponSnapshot,
          currency: 'USD',
        })

        if (error) throw error
        if (!data?.ok || !data?.session) {
          return { ok: false, error: 'No se pudo crear la cuenta por pagar.' }
        }

        const mappedSession = mapCheckoutSessionRow(data.session)
        if (!mappedSession) {
          return { ok: false, error: 'La cuenta por pagar no devolvio datos validos.' }
        }

        await syncPendingCheckout({ forceUserId: currentUser.id, selectCheckoutId: mappedSession.id })
        return { ok: true, session: mappedSession }
      }

      const { data, error } = await supabase.rpc('update_pending_checkout_session', {
        checkout_id: targetSession.id,
        cart_snapshot: cartSource,
        totals_snapshot: totalsSnapshot,
        coupon_snapshot: couponSnapshot,
        currency: 'USD',
      })

      if (error) throw error

      if (!data?.ok) {
        if (data?.reason === 'has_paid_payments') {
          return { ok: false, error: 'Esta cuenta por pagar ya tiene pagos y no puede editarse.' }
        }
        if (data?.reason === 'not_found') {
          return { ok: false, error: 'La cuenta por pagar seleccionada ya no esta disponible.' }
        }
        return { ok: false, error: 'No se pudo actualizar la cuenta por pagar.' }
      }

      const mappedSession = mapCheckoutSessionRow(data.session)
      if (!mappedSession) {
        return { ok: false, error: 'No se pudo procesar la cuenta por pagar actualizada.' }
      }

      await syncPendingCheckout({ forceUserId: currentUser.id, selectCheckoutId: mappedSession.id })
      return { ok: true, session: mappedSession }
    } catch (checkoutError) {
      console.error('Error creando/reanudando checkout pendiente:', checkoutError)
      return {
        ok: false,
        error: checkoutError?.message || 'No se pudo crear/actualizar la cuenta por pagar.',
      }
    }
  }, [cartItems, currentUser?.id, pendingCheckout, pendingCheckoutList, syncPendingCheckout])

  const recordCheckoutPayment = useCallback(async ({
    checkoutId,
    method,
    amount,
    reference = '',
    details = null,
    status = 'paid',
  }) => {
    if (!currentUser?.id) {
      return { ok: false, error: 'Debes iniciar sesion para registrar pagos.' }
    }

    if (!checkoutId) {
      return { ok: false, error: 'No hay checkout pendiente activo.' }
    }

    const safeAmount = roundMoney(amount)
    if (safeAmount <= 0) {
      return { ok: false, error: 'El monto a registrar debe ser mayor a cero.' }
    }

    try {
      const { data, error } = await supabase.rpc('record_checkout_payment', {
        checkout_id: checkoutId,
        payment_method: method,
        payment_amount: safeAmount,
        payment_reference: String(reference || '').trim() || null,
        payment_details: details && typeof details === 'object' ? details : {},
        payment_status: status,
      })

      if (error) throw error

  await syncPendingCheckout({ forceUserId: currentUser.id, selectCheckoutId: checkoutId })
      return { ok: true, result: data }
    } catch (paymentError) {
      console.error('Error registrando pago de checkout:', paymentError)
      return {
        ok: false,
        error: paymentError?.message || 'No se pudo registrar el pago en la base de datos.',
      }
    }
  }, [currentUser?.id, syncPendingCheckout])

  const completeCheckoutSession = useCallback(async ({ checkoutId, invoiceId }) => {
    if (!currentUser?.id) {
      return { ok: false, error: 'Debes iniciar sesion para completar el checkout.' }
    }

    if (!checkoutId) {
      return { ok: false, error: 'No hay checkout pendiente para finalizar.' }
    }

    try {
      const { data, error } = await supabase.rpc('complete_checkout_session', {
        checkout_id: checkoutId,
        invoice_id: invoiceId || null,
      })

      if (error) throw error

      if (!data?.ok) {
        return {
          ok: false,
          error: 'El checkout aun no esta completamente pagado para emitir factura.',
        }
      }

      await syncPendingCheckout({ forceUserId: currentUser.id })
      return { ok: true, result: data }
    } catch (checkoutError) {
      console.error('Error completando checkout pendiente:', checkoutError)
      return {
        ok: false,
        error: checkoutError?.message || 'No se pudo completar el checkout pendiente.',
      }
    }
  }, [currentUser?.id, syncPendingCheckout])

  useEffect(() => {
    let active = true

    async function syncFromSession(session) {
      if (!active) return

      const authUser = session?.user || null

      if (!authUser) {
        setInvoices([])
        persistSession(null)
        clearPendingCheckoutState()
        setAuthLoading(false)
        return
      }

      setAuthLoading(true)
      try {
        await syncProfileFromAuth(authUser)
        await loadInvoicesForUser(authUser.id)
        await syncPendingCheckout(authUser.id)
      } catch (error) {
        console.error('Error sincronizando sesion de cliente:', error)
        if (active) clearPendingCheckoutState()
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
          clearPendingCheckoutState()
          return
        }

        await syncProfileFromAuth(authUser)
        await loadInvoicesForUser(authUser.id)
        await syncPendingCheckout(authUser.id)
      } catch (error) {
        console.error('Error iniciando sesion de cliente:', error)
        if (active) {
          setInvoices([])
          persistSession(null)
          clearPendingCheckoutState()
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
  }, [clearPendingCheckoutState, loadInvoicesForUser, persistSession, syncPendingCheckout, syncProfileFromAuth])

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

    async function attemptImmediateLogin() {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        return { ok: false, error: loginError }
      }

      if (!loginData?.user || !loginData?.session) {
        return {
          ok: false,
          error: { message: 'No fue posible abrir sesion luego del registro.' },
        }
      }

      return {
        ok: true,
        user: loginData.user,
        session: loginData.session,
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    let authUser = data?.user || null
    let authSession = data?.session || null

    if (error) {
      if (isAuth429Error(error)) {
        return {
          ok: false,
          error: 'Supabase devolvio 429 (Too Many Requests). La app no aplica espera local, pero ese limite viene del servidor.',
        }
      }

      if (isUserAlreadyRegisteredError(error)) {
        const existingLogin = await attemptImmediateLogin()

        if (!existingLogin.ok) {
          if (isAuth429Error(existingLogin.error)) {
            return {
              ok: false,
              error: 'Supabase devolvio 429 (Too Many Requests) al iniciar sesion. La app no aplica espera local, pero ese limite viene del servidor.',
            }
          }

          return {
            ok: false,
            error: 'El correo ya esta registrado y la contraseña no coincide.',
          }
        }

        authUser = existingLogin.user
        authSession = existingLogin.session
      } else {
        return { ok: false, error: authErrorMessage(error) || 'No se pudo registrar la cuenta.' }
      }
    }

    if (!authUser) {
      return { ok: false, error: 'No se pudo crear el usuario en Auth.' }
    }

    if (!authSession) {
      const immediateLogin = await attemptImmediateLogin()

      if (!immediateLogin.ok) {
        if (isAuth429Error(immediateLogin.error)) {
          return {
            ok: false,
            error: 'Supabase devolvio 429 (Too Many Requests) al activar sesion. La app no aplica espera local, pero ese limite viene del servidor.',
          }
        }

        if (isEmailConfirmationRequiredError(immediateLogin.error)) {
          return {
            ok: false,
            error:
              'Tu proyecto aun exige confirmar correo. Desactiva Confirm email en Supabase > Authentication > Providers > Email para activar cuentas al instante.',
          }
        }

        return {
          ok: false,
          error: authErrorMessage(immediateLogin.error) || 'No se pudo activar la sesion luego del registro.',
        }
      }

      authUser = immediateLogin.user
      authSession = immediateLogin.session
    }

    try {
      const { error: profileError } = await supabase
        .from('clientes')
        .upsert(
          {
            auth_user_id: authUser.id,
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

      const mapped = await syncProfileFromAuth(authUser)
      await loadInvoicesForUser(authUser.id)
      await syncPendingCheckout(authUser.id)
      return {
        ok: true,
        user: mapped,
        message: 'Cuenta creada y activa automaticamente.',
      }
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
    await syncPendingCheckout(data.user.id)
    return { ok: true, user: mapped }
  }

  async function logoutUser() {
    await supabase.auth.signOut()
    setInvoices([])
    clearPendingCheckoutState()
    persistCart([])
    persistSession(null)
  }

  async function inspectCoupon(couponCode) {
    if (!currentUser?.id) {
      return { ok: false, error: 'Debes iniciar sesion para usar cupones.' }
    }

    const normalizedCode = normalizeCouponCode(couponCode)
    if (!normalizedCode) {
      return { ok: false, error: 'Ingresa un codigo de cupon.' }
    }

    const { data, error } = await supabase.rpc('inspect_coupon_for_checkout', {
      coupon_code: normalizedCode,
    })

    if (error) {
      console.error('Error validando cupon:', error)
      return { ok: false, error: 'No se pudo validar el cupon en este momento.' }
    }

    if (!data?.ok) {
      return { ok: false, error: couponReasonMessage(data?.reason) }
    }

    const coupon = mapCouponPayload(data?.coupon)
    if (!coupon) {
      return { ok: false, error: 'El cupon no tiene una configuracion valida.' }
    }

    return { ok: true, coupon }
  }

  const hasPendingCheckout = pendingCheckoutList.length > 0

  function addToCart(product, quantity = 1) {
    const stock = Number(product.stock) || 0
    if (stock <= 0) {
      return { ok: false, error: 'Producto agotado.' }
    }

    const nextQty = Math.max(1, Number(quantity) || 1)
    const selectedColor = String(product.selectedColor || '').trim()
    const colorOptionsCount = Math.max(0, Number(product.colorOptionsCount) || 0)
    const lineKey = `${product.id}::${selectedColor || 'default'}`
    const existing = cartItems.find((i) => String(i.lineKey || '') === lineKey)
    const existingQty = existing ? existing.quantity : 0
    const finalQty = existingQty + nextQty

    if (finalQty > stock) {
      return { ok: false, error: `Stock insuficiente. Disponible: ${stock}.` }
    }

    const baseItem = {
      id: product.id,
      lineKey,
      code: product.code,
      name: product.name,
      selectedColor,
      colorOptionsCount,
      image: String(product.image || existing?.image || '').trim(),
      price: Number(product.price) || 0,
      stock,
      exentoIva: !!product.exentoIva,
      discountPct: Math.max(0, Math.min(99, Number(product.discountPct) || 0)),
      quantity: finalQty,
    }

    const nextCart = existing
      ? cartItems.map((i) => (String(i.lineKey || '') === lineKey ? baseItem : i))
      : [...cartItems, baseItem]

    persistCart(nextCart)
    return { ok: true }
  }

  function resolveCartItemRef(itemRef) {
    if (itemRef && typeof itemRef === 'object') {
      const lineRef = String(itemRef.lineKey || '').trim()
      if (lineRef) return lineRef
      return String(itemRef.id || '').trim()
    }
    return String(itemRef || '').trim()
  }

  function updateCartQuantity(itemRef, quantity) {
    const targetQty = Math.max(1, Number(quantity) || 1)
    const ref = resolveCartItemRef(itemRef)
    const hasLineMatch = cartItems.some((item) => String(item.lineKey || '') === ref)

    const nextCart = cartItems.map((item) => {
      const matches = hasLineMatch
        ? String(item.lineKey || '') === ref
        : String(item.id || '') === ref

      if (!matches) return item
      const safeQty = Math.min(targetQty, item.stock)
      return { ...item, quantity: safeQty }
    })
    persistCart(nextCart)
    return { ok: true }
  }

  function removeFromCart(itemRef) {
    const ref = resolveCartItemRef(itemRef)
    if (!ref) return { ok: false, error: 'No se pudo identificar el item a eliminar.' }

    const hasLineMatch = cartItems.some((item) => String(item.lineKey || '') === ref)
    const nextCart = hasLineMatch
      ? cartItems.filter((item) => String(item.lineKey || '') !== ref)
      : cartItems.filter((item) => String(item.id || '') !== ref)

    persistCart(nextCart)
    return { ok: true }
  }

  function clearCart() {
    persistCart([])
    return { ok: true }
  }

  const getCartTotals = useCallback((items = null) => {
    if (Array.isArray(items)) {
      return calculateTotals(items)
    }
    return calculateTotals(cartItems)
  }, [cartItems])

  async function selectPendingCheckout(checkoutId) {
    if (!currentUser?.id) {
      return { ok: false, error: 'Debes iniciar sesion para gestionar cuentas por pagar.' }
    }

    const targetId = String(checkoutId || '').trim()
    if (!targetId) {
      const synced = await syncPendingCheckout({ forceUserId: currentUser.id })
      return { ok: true, session: synced?.session || null, payments: synced?.payments || [] }
    }

    const synced = await syncPendingCheckout({
      forceUserId: currentUser.id,
      selectCheckoutId: targetId,
    })

    if (!synced?.session || synced.session.id !== targetId) {
      return { ok: false, error: 'La cuenta por pagar seleccionada no esta disponible.' }
    }

    return { ok: true, session: synced.session, payments: synced.payments || [] }
  }

  async function buildInvoice({
    paymentBreakdown = [],
    coupon = null,
    checkoutSessionId = null,
    checkoutSnapshot = null,
    cartData = null,
  } = {}) {
    if (!currentUser) {
      return { ok: false, error: 'Debes iniciar sesión para facturar.' }
    }

    let activeCheckoutId = checkoutSessionId || null
    let resolvedCheckout = null

    if (activeCheckoutId) {
      try {
        const { data, error } = await supabase.rpc('get_checkout_snapshot', {
          checkout_id: activeCheckoutId,
        })

        if (error) throw error

        if (!data?.ok || !data?.session) {
          return { ok: false, error: 'La cuenta por pagar seleccionada no esta disponible.' }
        }

        resolvedCheckout = {
          session: mapCheckoutSessionRow(data.session),
          payments: Array.isArray(data.payments)
            ? data.payments.map(mapCheckoutPaymentRow).filter(Boolean)
            : [],
        }
      } catch (snapshotError) {
        console.error('Error consultando cuenta por pagar:', snapshotError)
        return {
          ok: false,
          error: snapshotError?.message || 'No se pudo cargar la cuenta por pagar seleccionada.',
        }
      }
    }

    const sessionCart = normalizeCartSnapshot(resolvedCheckout?.session?.cartSnapshot)
    const snapshotCart = normalizeCartSnapshot(checkoutSnapshot?.items)
    const providedCart = normalizeCartSnapshot(cartData)
    const sourceCart = sessionCart.length
      ? sessionCart
      : snapshotCart.length
      ? snapshotCart
      : providedCart.length
        ? providedCart
        : normalizeCartSnapshot(cartItems)

    if (!sourceCart.length) {
      return { ok: false, error: 'No hay productos en el carrito.' }
    }

    const selectedCoupon = mapCouponPayload(
      coupon ?? resolvedCheckout?.session?.couponSnapshot ?? checkoutSnapshot?.coupon ?? pendingCheckout?.couponSnapshot
    )
    const rawTotals = calculateTotals(sourceCart)
    const discountAmount = selectedCoupon
      ? roundMoney(rawTotals.totalOperacion * (selectedCoupon.discountPct / 100))
      : 0

    const totals = {
      ...rawTotals,
      totalBeforeCoupon: roundMoney(rawTotals.totalOperacion),
      discountAmount,
      totalOperacion: roundMoney(Math.max(0, rawTotals.totalOperacion - discountAmount)),
    }

    if (selectedCoupon) {
      totals.coupon = {
        id: selectedCoupon.id || null,
        code: selectedCoupon.code,
        usageType: selectedCoupon.usageType,
        discountPct: selectedCoupon.discountPct,
      }
    }

    if (!activeCheckoutId) {
      const checkoutSeed = await ensurePendingCheckout({
        coupon: selectedCoupon,
        cartOverride: sourceCart,
        forceNew: true,
      })

      if (!checkoutSeed.ok) {
        return { ok: false, error: checkoutSeed.error || 'No se pudo crear la cuenta por pagar.' }
      }

      activeCheckoutId = checkoutSeed.session?.id || null
    }

    const fallbackPayments = resolvedCheckout?.payments || (Array.isArray(checkoutSnapshot?.payments)
      ? checkoutSnapshot.payments
      : pendingCheckoutPayments)

    const normalizedPayments = normalizePaymentBreakdown(
      paymentBreakdown.length ? paymentBreakdown : fallbackPayments
    )
    const expectedTotal = roundMoney(totals.totalOperacion)
    const paidTotal = roundMoney(normalizedPayments.reduce((acc, payment) => acc + payment.amount, 0))

    if (!normalizedPayments.length && expectedTotal > 0) {
      return { ok: false, error: 'Debes registrar al menos un pago antes de facturar.' }
    }

    if (Math.abs(expectedTotal - paidTotal) > 0.009) {
      return {
        ok: false,
        error: `El total pagado ($${paidTotal.toFixed(2)}) debe coincidir con el total de la orden ($${expectedTotal.toFixed(2)}).`,
      }
    }

    let claimedCoupon = null

    if (selectedCoupon) {
      const { data: claimData, error: claimError } = await supabase.rpc('claim_coupon_for_checkout', {
        coupon_code: selectedCoupon.code,
      })

      if (claimError) {
        console.error('Error reclamando cupon:', claimError)
        return { ok: false, error: 'No se pudo reservar el cupon para esta compra.' }
      }

      if (!claimData?.ok) {
        return { ok: false, error: couponReasonMessage(claimData?.reason) }
      }

      claimedCoupon = mapCouponPayload(claimData?.coupon)
      if (!claimedCoupon) {
        return { ok: false, error: 'El cupon no tiene una configuracion valida.' }
      }
    }

    try {
      const ids = sourceCart.map((i) => i.id)
      const { data: stockRows, error: stockError } = await supabase
        .from('productos')
        .select('id, stock, agotado, is_active')
        .in('id', ids)

      if (stockError) throw stockError

      const stockMap = new Map((stockRows || []).map((row) => [String(row.id), row]))

      const orderedQtyById = sourceCart.reduce((acc, item) => {
        const key = String(item.id)
        acc.set(key, (acc.get(key) || 0) + Math.max(0, Number(item.quantity) || 0))
        return acc
      }, new Map())

      for (const [id, requiredQty] of orderedQtyById.entries()) {
        const row = stockMap.get(id)
        if (!row || row.is_active === false) {
          const missingName = sourceCart.find((item) => String(item.id) === id)?.name || 'Producto'
          return { ok: false, error: `Producto no disponible: ${missingName}` }
        }

        const dbStock = Math.max(0, Number(row.stock) || 0)
        if (dbStock < requiredQty) {
          const limitedName = sourceCart.find((item) => String(item.id) === id)?.name || 'Producto'
          return { ok: false, error: `Stock insuficiente para ${limitedName}. Disponible: ${dbStock}` }
        }
      }

      for (const [id, requiredQty] of orderedQtyById.entries()) {
        const row = stockMap.get(id)
        if (!row || row.is_active === false) {
          continue
        }

        const dbStock = Math.max(0, Number(row.stock) || 0)
        const nextStock = Math.max(0, dbStock - requiredQty)

        const { error: updateError } = await supabase
          .from('productos')
          .update({
            stock: nextStock,
            agotado: nextStock <= 0,
          })
          .eq('id', id)

        if (updateError) throw updateError
      }
    } catch (error) {
      console.error('Error descontando stock:', error)

      if (claimedCoupon?.usageType === 'single_use' && claimedCoupon?.id) {
        await supabase.rpc('release_claimed_coupon', { coupon_id: claimedCoupon.id })
      }

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
      coupon: claimedCoupon
        ? {
            id: claimedCoupon.id,
            code: claimedCoupon.code,
            usageType: claimedCoupon.usageType,
            discountPct: claimedCoupon.discountPct,
            discountAmount,
          }
        : null,
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
        coupon: invoice.coupon,
        admin_settings_snapshot: invoice.adminSettingsSnapshot,
      })
      .select('*')
      .single()

    if (invoiceInsertError) {
      console.error('Error guardando factura en Supabase:', invoiceInsertError)

      if (claimedCoupon?.usageType === 'single_use' && claimedCoupon?.id) {
        await supabase.rpc('release_claimed_coupon', { coupon_id: claimedCoupon.id })
      }

      return { ok: false, error: 'No se pudo guardar la factura en la base de datos.' }
    }

    const persistedInvoice = mapInvoiceRow(insertedInvoice)

    if (activeCheckoutId) {
      const completion = await completeCheckoutSession({
        checkoutId: activeCheckoutId,
        invoiceId: persistedInvoice.id,
      })

      if (!completion.ok) {
        console.error('No se pudo completar la sesion de checkout:', completion.error)

        const { error: rollbackError } = await supabase
          .from('shop_invoices')
          .delete()
          .eq('id', persistedInvoice.id)
          .eq('auth_user_id', currentUser.id)

        if (rollbackError) {
          console.error('No se pudo revertir la factura tras fallo de checkout:', rollbackError)
        }

        if (claimedCoupon?.usageType === 'single_use' && claimedCoupon?.id) {
          await supabase.rpc('release_claimed_coupon', { coupon_id: claimedCoupon.id })
        }

        return {
          ok: false,
          error: completion.error || 'El checkout pendiente no pudo cerrarse correctamente.',
        }
      }
    }

    if (claimedCoupon?.usageType === 'single_use' && claimedCoupon?.id) {
      const { error: attachCouponError } = await supabase.rpc('attach_coupon_to_invoice', {
        coupon_id: claimedCoupon.id,
        invoice_id: persistedInvoice.id,
      })

      if (attachCouponError) {
        console.error('No se pudo enlazar el cupon con la factura:', attachCouponError)
      }
    }

    setInvoices((prev) => [persistedInvoice, ...prev])

    await syncPendingCheckout({ forceUserId: currentUser.id })
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
    pendingCheckoutLoading,
    cartItems,
    subtotal,
    pendingCheckoutList,
    pendingCheckout,
    pendingCheckoutPayments,
    hasPendingCheckout,
    registerUser,
    loginUser,
    logoutUser,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    buildInvoice,
    inspectCoupon,
    syncPendingCheckout,
    ensurePendingCheckout,
    selectPendingCheckout,
    recordCheckoutPayment,
    completeCheckoutSession,
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
