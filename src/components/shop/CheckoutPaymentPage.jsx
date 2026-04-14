import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import Header from '../layout/Header'
import { supabase } from '../../supabaseClient'
import { useShop } from '../../hooks/useShop'

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || ''
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null
const PAYMENT_EPSILON = 0.009

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function formatMoney(value) {
  return money(value).toFixed(2)
}

function mapCouponSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null

  const code = String(raw.code || '').trim().toUpperCase()
  const usageType = String(raw.usageType || raw.usage_type || '').trim().toLowerCase()
  const discountPct = Math.max(0, Math.min(100, Number(raw.discountPct ?? raw.discount_pct) || 0))

  if (!code || !usageType || discountPct <= 0) return null

  return {
    id: raw.id || null,
    code,
    usageType,
    discountPct,
    isActive: raw.isActive ?? raw.is_active ?? true,
    used: raw.used ?? false,
  }
}

function isPaidCheckoutPayment(payment) {
  if (!payment || typeof payment !== 'object') return false
  if (String(payment.status || '').trim().toLowerCase() !== 'paid') return false
  return money(payment.amount) > 0
}

function sumPaymentsByMethod(payments, method) {
  return money(
    (payments || [])
      .filter((payment) => String(payment.method || '').trim().toLowerCase() === method)
      .reduce((acc, payment) => acc + money(payment.amount), 0)
  )
}

function StripePaymentForm({ amount, disabled, onPaid, onError }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  async function handleConfirm(event) {
    event.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {},
    })
    setProcessing(false)

    if (result.error) {
      onError(result.error.message || 'No se pudo confirmar el pago en Stripe.')
      return
    }

    const intent = result.paymentIntent
    if (!intent) {
      onError('Stripe no devolvio informacion del pago.')
      return
    }

    if (intent.status === 'succeeded' || intent.status === 'processing') {
      await onPaid({
        method: 'stripe',
        amount,
        reference: intent.id,
        status: intent.status,
        details: {
          paymentIntentId: intent.id,
          status: intent.status,
        },
      })
      return
    }

    onError(`El pago Stripe quedo en estado ${intent.status}.`)
  }

  return (
    <form className="checkout-gateway-form" onSubmit={handleConfirm}>
      <PaymentElement options={{ layout: 'tabs' }} />
      <button className="btn btn-primary" type="submit" disabled={disabled || processing || !stripe || !elements}>
        {processing ? 'Procesando Stripe...' : `Pagar ${formatMoney(amount)} USD con Stripe`}
      </button>
    </form>
  )
}

export default function CheckoutPaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    currentUser,
    pendingCheckoutList,
    pendingCheckout,
    pendingCheckoutPayments,
    hasPendingCheckout,
    pendingCheckoutLoading,
    getCartTotals,
    buildInvoice,
    inspectCoupon,
    ensurePendingCheckout,
    selectPendingCheckout,
    recordCheckoutPayment,
  } = useShop()

  const requestedCheckoutId = useMemo(
    () => String(new URLSearchParams(location.search).get('checkout') || '').trim(),
    [location.search]
  )

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponFeedback, setCouponFeedback] = useState('')

  const [stripePercentage, setStripePercentage] = useState(100)
  const [stripeAmount, setStripeAmount] = useState('0.00')
  const [paypalAmount, setPaypalAmount] = useState('0.00')

  const [stripeIntentId, setStripeIntentId] = useState('')
  const [stripeClientSecret, setStripeClientSecret] = useState('')

  const [creatingStripeIntent, setCreatingStripeIntent] = useState(false)
  const [recordingStripePayment, setRecordingStripePayment] = useState(false)
  const [recordingPaypalPayment, setRecordingPaypalPayment] = useState(false)
  const [issuingInvoice, setIssuingInvoice] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const checkoutCartItems = useMemo(() => {
    if (Array.isArray(pendingCheckout?.cartSnapshot)) {
      return pendingCheckout.cartSnapshot
    }
    return []
  }, [pendingCheckout?.cartSnapshot])

  const pendingTotals = pendingCheckout?.totalsSnapshot || null
  const totals = useMemo(() => getCartTotals(checkoutCartItems), [checkoutCartItems, getCartTotals])
  const effectiveCoupon = useMemo(
    () => mapCouponSnapshot(pendingCheckout?.couponSnapshot) || appliedCoupon,
    [appliedCoupon, pendingCheckout?.couponSnapshot]
  )

  const totalOperacion = useMemo(
    () => money(pendingTotals?.totalBeforeCoupon ?? totals.totalOperacion),
    [pendingTotals?.totalBeforeCoupon, totals.totalOperacion]
  )

  const couponDiscountAmount = useMemo(() => {
    if (pendingTotals && pendingTotals.discountAmount !== undefined && pendingTotals.discountAmount !== null) {
      return money(pendingTotals.discountAmount)
    }
    if (!effectiveCoupon?.discountPct) return 0
    return money(totalOperacion * (Number(effectiveCoupon.discountPct) / 100))
  }, [effectiveCoupon, pendingTotals, totalOperacion])

  const totalToPay = useMemo(() => {
    if (pendingTotals && pendingTotals.totalToPay !== undefined && pendingTotals.totalToPay !== null) {
      return money(pendingTotals.totalToPay)
    }
    return money(Math.max(0, totalOperacion - couponDiscountAmount))
  }, [couponDiscountAmount, pendingTotals, totalOperacion])

  const paidPayments = useMemo(
    () => (pendingCheckoutPayments || []).filter(isPaidCheckoutPayment),
    [pendingCheckoutPayments]
  )

  const totalPaidConfirmed = useMemo(
    () => money(paidPayments.reduce((acc, payment) => acc + money(payment.amount), 0)),
    [paidPayments]
  )

  const remainingToPay = useMemo(() => {
    if (pendingCheckout) {
      return money(Math.max(0, pendingCheckout.remainingTotal))
    }
    return money(Math.max(0, totalToPay - totalPaidConfirmed))
  }, [pendingCheckout, totalPaidConfirmed, totalToPay])

  const stripePaidTotal = useMemo(() => sumPaymentsByMethod(paidPayments, 'stripe'), [paidPayments])
  const paypalPaidTotal = useMemo(() => sumPaymentsByMethod(paidPayments, 'paypal'), [paidPayments])

  const stripeAmountValue = useMemo(() => money(stripeAmount), [stripeAmount])
  const paypalAmountValue = useMemo(() => money(paypalAmount), [paypalAmount])
  const totalAssigned = useMemo(() => money(stripeAmountValue + paypalAmountValue), [stripeAmountValue, paypalAmountValue])
  const remainingToAssign = useMemo(() => money(remainingToPay - totalAssigned), [remainingToPay, totalAssigned])
  const balanceOk = Math.abs(remainingToAssign) <= PAYMENT_EPSILON

  useEffect(() => {
    const pendingCoupon = mapCouponSnapshot(pendingCheckout?.couponSnapshot)
    if (pendingCoupon) {
      setAppliedCoupon(pendingCoupon)
      setCouponCode(pendingCoupon.code)
      return
    }

    setAppliedCoupon(null)
    setCouponCode('')
  }, [pendingCheckout?.couponSnapshot, pendingCheckout?.id])

  useEffect(() => {
    if (!pendingCheckoutList.length) return

    if (requestedCheckoutId) {
      const requestedExists = pendingCheckoutList.some((session) => session.id === requestedCheckoutId)

      if (!requestedExists) {
        const fallbackId = pendingCheckoutList[0]?.id || ''
        if (fallbackId) {
          if (pendingCheckout?.id !== fallbackId) {
            void selectPendingCheckout(fallbackId)
          }
          navigate(`/facturas/pago?checkout=${fallbackId}`, { replace: true })
        }
        return
      }

      if (pendingCheckout?.id !== requestedCheckoutId) {
        void selectPendingCheckout(requestedCheckoutId)
      }
      return
    }

    if (!pendingCheckout?.id) {
      void selectPendingCheckout(pendingCheckoutList[0].id)
    }
  }, [navigate, pendingCheckout?.id, pendingCheckoutList, requestedCheckoutId, selectPendingCheckout])

  useEffect(() => {
    const hasStripePaid = stripePaidTotal > PAYMENT_EPSILON
    const hasPayPalPaid = paypalPaidTotal > PAYMENT_EPSILON

    let safePct = remainingToPay <= 0 ? 0 : Math.max(0, Math.min(100, stripePercentage))

    // Si ya hubo un pago parcial en un solo metodo, favorece automaticamente el metodo opuesto
    // para el siguiente intento (sin bloquear que luego el usuario lo vuelva a mover).
    if (remainingToPay > PAYMENT_EPSILON) {
      if (hasPayPalPaid && !hasStripePaid) {
        safePct = 100
      } else if (hasStripePaid && !hasPayPalPaid) {
        safePct = 0
      }
    }

    const nextStripe = remainingToPay <= 0 ? 0 : money((remainingToPay * safePct) / 100)
    const nextPayPal = money(Math.max(0, remainingToPay - nextStripe))

    setStripePercentage(safePct)
    setStripeAmount(formatMoney(nextStripe))
    setPaypalAmount(formatMoney(nextPayPal))
    setStripeIntentId('')
    setStripeClientSecret('')
    setError('')
    setStatus('')
  }, [paypalPaidTotal, remainingToPay, stripePaidTotal, stripePercentage])

  useEffect(() => {
    setStripeClientSecret('')
    setStripeIntentId('')
  }, [stripeAmountValue, pendingCheckout?.id])

  function clampSplitAmount(rawValue) {
    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) return 0
    return money(Math.max(0, Math.min(parsed, remainingToPay)))
  }

  function applySplitByStripeAmount(nextStripeRaw) {
    const nextStripe = clampSplitAmount(nextStripeRaw)
    const nextPayPal = money(Math.max(0, remainingToPay - nextStripe))
    const nextPct = remainingToPay <= 0 ? 0 : Math.round((nextStripe / remainingToPay) * 100)

    setStripePercentage(nextPct)
    setStripeAmount(formatMoney(nextStripe))
    setPaypalAmount(formatMoney(nextPayPal))
    setError('')
    setStatus('')
  }

  function applySplitByPercentage(nextPctRaw) {
    const nextPct = Math.max(0, Math.min(100, Math.round(Number(nextPctRaw) || 0)))
    const nextStripe = remainingToPay <= 0 ? 0 : money((remainingToPay * nextPct) / 100)
    const nextPayPal = money(Math.max(0, remainingToPay - nextStripe))

    setStripePercentage(nextPct)
    setStripeAmount(formatMoney(nextStripe))
    setPaypalAmount(formatMoney(nextPayPal))
    setError('')
    setStatus('')
  }

  function onStripeAmountChange(event) {
    applySplitByStripeAmount(event.target.value)
  }

  function onPayPalAmountChange(event) {
    const nextPayPal = clampSplitAmount(event.target.value)
    const nextStripe = money(Math.max(0, remainingToPay - nextPayPal))
    applySplitByStripeAmount(nextStripe)
  }

  async function applyCoupon() {
    setError('')
    setStatus('')
    setCouponFeedback('')

    const checkoutId = pendingCheckout?.id
    if (!checkoutId) {
      setCouponFeedback('Selecciona una cuenta por pagar desde Por pagar para aplicar cupon.')
      return
    }

    const normalizedCode = String(couponCode || '').trim().toUpperCase()
    if (!normalizedCode) {
      setCouponFeedback('Ingresa un cupon para validarlo.')
      return
    }

    if (totalPaidConfirmed > PAYMENT_EPSILON) {
      setCouponFeedback('No puedes cambiar el cupon despues de registrar pagos parciales.')
      return
    }

    setCouponLoading(true)
    try {
      const result = await inspectCoupon(normalizedCode)
      if (!result.ok) {
        setAppliedCoupon(null)
        setCouponFeedback(result.error)
        return
      }

      const ensured = await ensurePendingCheckout({
        checkoutId,
        coupon: result.coupon,
        cartOverride: checkoutCartItems,
      })

      if (!ensured.ok) {
        setAppliedCoupon(null)
        setCouponFeedback(ensured.error || 'No se pudo aplicar el cupon a esta cuenta por pagar.')
        return
      }

      await selectPendingCheckout(checkoutId)
      setAppliedCoupon(result.coupon)
      setCouponCode(result.coupon.code)
      setCouponFeedback(
        `Cupon aplicado: ${result.coupon.code} (${Number(result.coupon.discountPct).toFixed(2)}% de descuento).`
      )
    } finally {
      setCouponLoading(false)
    }
  }

  async function removeCoupon() {
    const checkoutId = pendingCheckout?.id
    if (!checkoutId) {
      setCouponFeedback('Selecciona una cuenta por pagar para remover el cupon.')
      return
    }

    if (totalPaidConfirmed > PAYMENT_EPSILON) {
      setCouponFeedback('No puedes remover el cupon despues de registrar pagos parciales.')
      return
    }

    const ensured = await ensurePendingCheckout({
      checkoutId,
      coupon: null,
      cartOverride: checkoutCartItems,
    })

    if (!ensured.ok) {
      setCouponFeedback(ensured.error || 'No se pudo remover el cupon de esta cuenta por pagar.')
      return
    }

    await selectPendingCheckout(checkoutId)
    setAppliedCoupon(null)
    setCouponCode('')
    setCouponFeedback('Cupon removido.')
  }

  async function prepareStripeIntent() {
    setError('')
    setStatus('')

    if (!pendingCheckout?.id) {
      setError('Selecciona una cuenta por pagar desde Por pagar antes de preparar Stripe.')
      return
    }

    if (remainingToPay <= PAYMENT_EPSILON) {
      setError('Esta cuenta por pagar ya esta totalmente pagada.')
      return
    }

    if (stripeAmountValue <= 0) {
      setError('El monto Stripe debe ser mayor a 0 para crear el pago.')
      return
    }

    if (stripeAmountValue - remainingToPay > PAYMENT_EPSILON) {
      setError('El monto Stripe supera el saldo restante por pagar.')
      return
    }

    setCreatingStripeIntent(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('create_stripe_payment_intent', {
        amount_cents: Math.round(stripeAmountValue * 100),
        currency: 'usd',
      })

      if (rpcError) {
        throw rpcError
      }

      if (!data?.client_secret || !data?.id) {
        throw new Error('Stripe no devolvio client_secret para procesar el pago.')
      }

      setStripeIntentId(String(data.id))
      setStripeClientSecret(String(data.client_secret))
      setStatus('Intent de Stripe creado. Completa el formulario de tarjeta para confirmar.')
    } catch (stripeError) {
      console.error('Error preparando Stripe:', stripeError)
      setError(
        stripeError?.message ||
          'No se pudo inicializar Stripe. Verifica la configuracion de secretos en Supabase.'
      )
    } finally {
      setCreatingStripeIntent(false)
    }
  }

  async function handleStripePaid(payment) {
    if (!pendingCheckout?.id || recordingStripePayment) return

    setRecordingStripePayment(true)
    try {
      const recorded = await recordCheckoutPayment({
        checkoutId: pendingCheckout.id,
        method: 'stripe',
        amount: payment.amount,
        reference: payment.reference,
        details: {
          ...payment.details,
          stripeIntentId,
        },
        status: 'paid',
      })

      if (!recorded.ok) {
        setError(recorded.error)
        return
      }

      await selectPendingCheckout(pendingCheckout.id)
      setStripeClientSecret('')
      setStripeIntentId('')
      setStatus(`Pago Stripe registrado. Referencia: ${payment.reference}`)
      setError('')
    } finally {
      setRecordingStripePayment(false)
    }
  }

  async function finalizeInvoice() {
    if (issuingInvoice) return

    setError('')
    setStatus('')

    if (!pendingCheckout?.id) {
      setError('No hay cuenta por pagar activa. Entra desde Por pagar.')
      return
    }

    if (remainingToPay > PAYMENT_EPSILON) {
      setError('Aun falta saldo por pagar antes de emitir la factura.')
      return
    }

    if (totalToPay > 0 && !paidPayments.length) {
      setError('Debes registrar al menos un pago antes de facturar.')
      return
    }

    const paymentBreakdown = paidPayments.map((payment) => ({
      method: payment.method,
      amount: money(payment.amount),
      status: 'paid',
      reference: payment.reference,
      details: payment.details,
    }))

    setIssuingInvoice(true)
    setStatus('Pagos completos. Generando factura...')
    try {
      const result = await buildInvoice({
        checkoutSessionId: pendingCheckout.id,
        paymentBreakdown,
        coupon: effectiveCoupon,
        cartData: checkoutCartItems,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      sessionStorage.setItem('aura:lastInvoice', JSON.stringify(result.invoice))
      navigate(`/facturas/factura/${result.invoice.id}`)
    } catch (issueError) {
      console.error('Error emitiendo factura:', issueError)
      setError('No se pudo emitir la factura en este momento.')
    } finally {
      setIssuingInvoice(false)
    }
  }

  if (!currentUser) {
    return (
      <>
        <Header currentPage="facturas-auth" />
        <div className="shop-page">
          <div className="shop-card">
            <h2>Pasarela de pago</h2>
            <p className="shop-error">Debes iniciar sesion para continuar.</p>
            <button className="btn btn-primary" onClick={() => navigate('/facturas/auth')}>
              Ir a iniciar sesion
            </button>
          </div>
        </div>
      </>
    )
  }

  if (pendingCheckoutLoading && !hasPendingCheckout) {
    return (
      <>
        <Header currentPage="facturas-cart" />
        <div className="shop-page">
          <div className="shop-card">
            <h2>Pasarela de pago</h2>
            <p>Cargando cuentas por pagar...</p>
          </div>
        </div>
      </>
    )
  }

  if (!hasPendingCheckout) {
    return (
      <>
        <Header currentPage="facturas-cart" />
        <div className="shop-page">
          <div className="shop-card">
            <h2>Pasarela de pago</h2>
            <p>No tienes cuentas por pagar activas.</p>
            <button className="btn btn-primary" onClick={() => navigate('/facturas/carrito')}>
              Ir a Por pagar
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header currentPage="facturas-cart" />
      <div className="shop-page checkout-gateway-page">
        <div className="shop-card checkout-gateway-card">
          <div className="checkout-gateway-head">
            <h2>Pasarela de pago segura</h2>
            <p>
              Completa el pago de la cuenta seleccionada desde Por pagar.
              Los pagos parciales quedan guardados automaticamente.
            </p>
          </div>

          {pendingCheckout?.id ? (
            <p className="shop-note">
              Cuenta activa: #{String(pendingCheckout.id).slice(0, 8)}. Si deseas cambiarla, usa la vista Por pagar.
            </p>
          ) : null}

          <div className="shop-payment-block">
            <h3>Cupon de descuento</h3>
            <div className="shop-actions">
              <input
                type="text"
                className="coupon-code-input"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Ingresa tu cupon"
                disabled={couponLoading || issuingInvoice || totalPaidConfirmed > PAYMENT_EPSILON || !pendingCheckout?.id}
              />
              <button
                className="btn"
                onClick={applyCoupon}
                disabled={couponLoading || issuingInvoice || totalPaidConfirmed > PAYMENT_EPSILON || !pendingCheckout?.id}
              >
                {couponLoading ? 'Validando...' : 'Aplicar cupon'}
              </button>
              {appliedCoupon ? (
                <button
                  className="btn"
                  onClick={() => {
                    void removeCoupon()
                  }}
                  disabled={issuingInvoice || totalPaidConfirmed > PAYMENT_EPSILON || !pendingCheckout?.id}
                >
                  Quitar cupon
                </button>
              ) : null}
            </div>
            {couponFeedback ? <p className="shop-note">{couponFeedback}</p> : null}
          </div>

          <div className="checkout-gateway-metrics">
            <article>
              <span>Total orden</span>
              <strong>${formatMoney(totalOperacion)}</strong>
            </article>
            <article className={couponDiscountAmount > 0 ? 'ok' : ''}>
              <span>Descuento</span>
              <strong>${formatMoney(couponDiscountAmount)}</strong>
            </article>
            <article>
              <span>Total a pagar</span>
              <strong>${formatMoney(totalToPay)}</strong>
            </article>
            <article className={totalPaidConfirmed > 0 ? 'ok' : ''}>
              <span>Total pagado</span>
              <strong>${formatMoney(totalPaidConfirmed)}</strong>
            </article>
            <article className={remainingToPay <= PAYMENT_EPSILON ? 'ok' : 'warn'}>
              <span>Por pagar</span>
              <strong>${formatMoney(remainingToPay)}</strong>
            </article>
          </div>

          <div className="checkout-allocation-panel">
            <div className="checkout-allocation-head">
              <h3>Distribucion entre metodos</h3>
              <p>Mueve el slider o escribe montos para distribuir el saldo restante de esta cuenta.</p>
            </div>

            <div className="checkout-split-values">
              <div className="checkout-split-pill stripe">
                <span>Stripe</span>
                <strong>{stripePercentage}%</strong>
                <small>${formatMoney(stripeAmountValue)}</small>
              </div>
              <div className="checkout-split-pill paypal">
                <span>PayPal</span>
                <strong>{Math.max(0, 100 - stripePercentage)}%</strong>
                <small>${formatMoney(paypalAmountValue)}</small>
              </div>
            </div>

            <p className={`shop-note ${balanceOk ? 'checkout-method-success' : ''}`}>
              Monto por asignar en este paso: ${formatMoney(remainingToAssign)}
            </p>

            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={stripePercentage}
              onChange={(e) => applySplitByPercentage(e.target.value)}
              disabled={issuingInvoice || remainingToPay <= PAYMENT_EPSILON || !pendingCheckout?.id}
              className="checkout-big-slider"
              style={{
                background: `linear-gradient(90deg, #d96b2d 0%, #d96b2d ${stripePercentage}%, #0f6f8f ${stripePercentage}%, #0f6f8f 100%)`,
              }}
            />
          </div>

          <div className="checkout-gateway-grid">
            <section className="checkout-method-card">
              <header>
                <h3>Stripe (tarjeta real)</h3>
                <p>Pago con tarjeta mediante PaymentIntent seguro.</p>
              </header>

              <label>
                Monto para Stripe (USD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stripeAmount}
                  onChange={onStripeAmountChange}
                  disabled={issuingInvoice || remainingToPay <= PAYMENT_EPSILON || !pendingCheckout?.id}
                />
              </label>

              <p className="shop-note">Asignado por slider: {stripePercentage}%</p>

              {!STRIPE_PUBLISHABLE_KEY ? (
                <p className="shop-error">
                  Falta VITE_STRIPE_PUBLISHABLE_KEY en tu entorno para habilitar Stripe.
                </p>
              ) : null}

              {stripeAmountValue > 0 && remainingToPay > PAYMENT_EPSILON && STRIPE_PUBLISHABLE_KEY ? (
                <>
                  {!stripeClientSecret ? (
                    <button
                      className="btn"
                      onClick={prepareStripeIntent}
                      disabled={creatingStripeIntent || !balanceOk || recordingStripePayment || !pendingCheckout?.id}
                    >
                      {creatingStripeIntent ? 'Preparando Stripe...' : 'Preparar pago con Stripe'}
                    </button>
                  ) : null}

                  {stripeClientSecret && stripePromise ? (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret: stripeClientSecret,
                        appearance: {
                          theme: 'stripe',
                          variables: {
                            colorPrimary: '#d96b2d',
                            borderRadius: '10px',
                          },
                        },
                      }}
                    >
                      <StripePaymentForm
                        amount={stripeAmountValue}
                        disabled={issuingInvoice || !balanceOk || recordingStripePayment}
                        onPaid={handleStripePaid}
                        onError={setError}
                      />
                    </Elements>
                  ) : null}
                </>
              ) : (
                <p className="shop-note">Monto Stripe en 0. Este metodo no se usara.</p>
              )}

              {stripePaidTotal > 0 ? (
                <p className="shop-note checkout-method-success">
                  Stripe acumulado pagado: ${formatMoney(stripePaidTotal)}.
                </p>
              ) : null}
            </section>

            <section className="checkout-method-card">
              <header>
                <h3>PayPal (pago real)</h3>
                <p>Pago en linea con captura inmediata en PayPal.</p>
              </header>

              <label>
                Monto para PayPal (USD)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paypalAmount}
                  onChange={onPayPalAmountChange}
                  disabled={issuingInvoice || remainingToPay <= PAYMENT_EPSILON || !pendingCheckout?.id}
                />
              </label>

              <p className="shop-note">Asignado por slider: {Math.max(0, 100 - stripePercentage)}%</p>

              {!PAYPAL_CLIENT_ID ? (
                <p className="shop-error">
                  Falta VITE_PAYPAL_CLIENT_ID en tu entorno para habilitar PayPal.
                </p>
              ) : null}

              {paypalAmountValue > 0 && remainingToPay > PAYMENT_EPSILON ? (
                PAYPAL_CLIENT_ID ? (
                  <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
                    <div className="checkout-paypal-box">
                      <PayPalButtons
                        forceReRender={[paypalAmountValue, pendingCheckout?.id || '']}
                        style={{ layout: 'vertical', shape: 'pill', label: 'pay' }}
                        createOrder={(data, actions) =>
                          actions.order.create({
                            purchase_units: [
                              {
                                amount: { value: formatMoney(paypalAmountValue), currency_code: 'USD' },
                                description: `AuraWeb orden pendiente (${checkoutCartItems.length} items)`,
                              },
                            ],
                          })
                        }
                        onApprove={async (data, actions) => {
                          if (!pendingCheckout?.id || recordingPaypalPayment) {
                            return
                          }

                          setRecordingPaypalPayment(true)
                          try {
                            const capture = await actions.order.capture()
                            const captureId =
                              capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id || data.orderID

                            const recorded = await recordCheckoutPayment({
                              checkoutId: pendingCheckout.id,
                              method: 'paypal',
                              amount: paypalAmountValue,
                              reference: captureId,
                              details: {
                                orderId: data.orderID,
                                payerEmail: capture?.payer?.email_address || '',
                                payerName: [capture?.payer?.name?.given_name, capture?.payer?.name?.surname]
                                  .filter(Boolean)
                                  .join(' '),
                              },
                              status: 'paid',
                            })

                            if (!recorded.ok) {
                              setError(recorded.error)
                              return
                            }

                            await selectPendingCheckout(pendingCheckout.id)
                            setStatus('Pago PayPal aprobado y registrado correctamente.')
                            setError('')
                          } finally {
                            setRecordingPaypalPayment(false)
                          }
                        }}
                        onCancel={() => {
                          setError('El pago PayPal fue cancelado.')
                        }}
                        onError={(paypalError) => {
                          console.error('PayPal error:', paypalError)
                          setError('No se pudo procesar el pago en PayPal.')
                        }}
                        disabled={issuingInvoice || !balanceOk || recordingPaypalPayment || !pendingCheckout?.id}
                      />
                    </div>
                  </PayPalScriptProvider>
                ) : null
              ) : (
                <p className="shop-note">Monto PayPal en 0. Este metodo no se usara.</p>
              )}

              {paypalPaidTotal > 0 ? (
                <p className="shop-note checkout-method-success">
                  PayPal acumulado pagado: ${formatMoney(paypalPaidTotal)}.
                </p>
              ) : null}
            </section>
          </div>

          {paidPayments.length ? (
            <div className="shop-payment-block">
              <h3>Pagos registrados</h3>
              <div className="shop-list">
                {paidPayments.map((payment) => (
                  <div className="shop-item" key={payment.id || `${payment.method}-${payment.reference}`}>
                    <div>
                      <strong>{String(payment.method || '').toUpperCase()}</strong>
                      <p>Monto: ${formatMoney(payment.amount)}</p>
                      <p>Referencia: {payment.reference || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="shop-error">{error}</p> : null}
          {status ? <p className="shop-note">{status}</p> : null}

          <div className="shop-actions checkout-gateway-actions">
            <button className="btn" onClick={() => navigate('/facturas/carrito')}>
              Ir a Por pagar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                void finalizeInvoice()
              }}
              disabled={issuingInvoice || remainingToPay > PAYMENT_EPSILON || !pendingCheckout?.id}
            >
              {issuingInvoice ? 'Emitiendo factura...' : 'Confirmar pago y emitir factura'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
