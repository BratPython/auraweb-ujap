import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import Header from '../layout/Header'
import { supabase } from '../../supabaseClient'
import { useShop } from '../../hooks/useShop'

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || ''
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function formatMoney(value) {
  return money(value).toFixed(2)
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
      onPaid({
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
  const { currentUser, cartItems, getCartTotals, buildInvoice } = useShop()

  const totals = useMemo(() => getCartTotals(), [getCartTotals])
  const totalOperacion = useMemo(() => money(totals.totalOperacion), [totals.totalOperacion])

  const [stripeAmount, setStripeAmount] = useState('0.00')
  const [paypalAmount, setPaypalAmount] = useState('0.00')

  const [stripeIntentId, setStripeIntentId] = useState('')
  const [stripeClientSecret, setStripeClientSecret] = useState('')
  const [stripePayment, setStripePayment] = useState(null)
  const [paypalPayment, setPaypalPayment] = useState(null)

  const [creatingStripeIntent, setCreatingStripeIntent] = useState(false)
  const [issuingInvoice, setIssuingInvoice] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const stripeAmountValue = useMemo(() => money(stripeAmount), [stripeAmount])
  const paypalAmountValue = useMemo(() => money(paypalAmount), [paypalAmount])
  const totalAssigned = useMemo(() => money(stripeAmountValue + paypalAmountValue), [stripeAmountValue, paypalAmountValue])
  const remainingAmount = useMemo(() => money(totalOperacion - totalAssigned), [totalAssigned, totalOperacion])
  const balanceOk = Math.abs(remainingAmount) <= 0.009

  useEffect(() => {
    setStripeAmount(formatMoney(totalOperacion))
    setPaypalAmount('0.00')
    setStripeIntentId('')
    setStripeClientSecret('')
    setStripePayment(null)
    setPaypalPayment(null)
    setError('')
    setStatus('')
  }, [totalOperacion])

  useEffect(() => {
    setStripeClientSecret('')
    setStripeIntentId('')
    setStripePayment(null)
  }, [stripeAmountValue])

  useEffect(() => {
    setPaypalPayment(null)
  }, [paypalAmountValue])

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

  if (!cartItems.length) {
    return (
      <>
        <Header currentPage="facturas-cart" />
        <div className="shop-page">
          <div className="shop-card">
            <h2>Pasarela de pago</h2>
            <p>No hay productos en el carrito.</p>
            <button className="btn btn-primary" onClick={() => navigate('/facturas/carrito')}>
              Volver al carrito
            </button>
          </div>
        </div>
      </>
    )
  }

  function onAmountChange(setter) {
    return (event) => {
      const next = event.target.value
      setter(next)
      setError('')
      setStatus('')
    }
  }

  async function prepareStripeIntent() {
    setError('')
    setStatus('')

    if (stripeAmountValue <= 0) {
      setError('El monto Stripe debe ser mayor a 0 para crear el pago.')
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
      setStripePayment(null)
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

  function handleStripePaid(payment) {
    setStripePayment(payment)
    setStatus(`Pago Stripe confirmado. Referencia: ${payment.reference}`)
    setError('')
  }

  async function finalizeInvoice() {
    setError('')
    setStatus('')

    if (!balanceOk) {
      setError('La suma de metodos debe coincidir exactamente con el total de la orden.')
      return
    }

    if (stripeAmountValue > 0 && !stripePayment) {
      setError('Debes completar el pago Stripe del monto asignado.')
      return
    }

    if (paypalAmountValue > 0 && !paypalPayment) {
      setError('Debes completar el pago PayPal del monto asignado.')
      return
    }

    const paymentBreakdown = [
      ...(stripePayment
        ? [
            {
              method: 'stripe',
              amount: stripeAmountValue,
              status: 'paid',
              reference: stripePayment.reference,
              details: {
                ...stripePayment.details,
                stripeIntentId,
              },
            },
          ]
        : []),
      ...(paypalPayment
        ? [
            {
              method: 'paypal',
              amount: paypalAmountValue,
              status: 'paid',
              reference: paypalPayment.reference,
              details: paypalPayment.details,
            },
          ]
        : []),
    ]

    setIssuingInvoice(true)
    try {
      const result = await buildInvoice({ paymentBreakdown })
      if (!result.ok) {
        setError(result.error)
        return
      }

      sessionStorage.setItem('aura:lastInvoice', JSON.stringify(result.invoice))
      navigate(`/facturas/factura/${result.invoice.id}`)
    } finally {
      setIssuingInvoice(false)
    }
  }

  return (
    <>
      <Header currentPage="facturas-cart" />
      <div className="shop-page checkout-gateway-page">
        <div className="shop-card checkout-gateway-card">
          <div className="checkout-gateway-head">
            <h2>Pasarela de pago segura</h2>
            <p>
              Divide tu compra entre Stripe y PayPal si lo deseas. La factura se emite cuando ambos
              pagos esten completos y el total cuadre al centavo.
            </p>
          </div>

          <div className="checkout-gateway-metrics">
            <article>
              <span>Total orden</span>
              <strong>${formatMoney(totalOperacion)}</strong>
            </article>
            <article>
              <span>Asignado</span>
              <strong>${formatMoney(totalAssigned)}</strong>
            </article>
            <article className={balanceOk ? 'ok' : 'warn'}>
              <span>Pendiente</span>
              <strong>${formatMoney(remainingAmount)}</strong>
            </article>
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
                  onChange={onAmountChange(setStripeAmount)}
                />
              </label>

              {!STRIPE_PUBLISHABLE_KEY ? (
                <p className="shop-error">
                  Falta VITE_STRIPE_PUBLISHABLE_KEY en tu entorno para habilitar Stripe.
                </p>
              ) : null}

              {stripeAmountValue > 0 && STRIPE_PUBLISHABLE_KEY ? (
                <>
                  {!stripeClientSecret ? (
                    <button className="btn" onClick={prepareStripeIntent} disabled={creatingStripeIntent}>
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
                        disabled={issuingInvoice}
                        onPaid={handleStripePaid}
                        onError={setError}
                      />
                    </Elements>
                  ) : null}
                </>
              ) : (
                <p className="shop-note">Monto Stripe en 0. Este metodo no se usara.</p>
              )}

              {stripePayment ? (
                <p className="shop-note checkout-method-success">
                  Stripe confirmado: ${formatMoney(stripePayment.amount)} (Ref: {stripePayment.reference}).
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
                  onChange={onAmountChange(setPaypalAmount)}
                />
              </label>

              {!PAYPAL_CLIENT_ID ? (
                <p className="shop-error">
                  Falta VITE_PAYPAL_CLIENT_ID en tu entorno para habilitar PayPal.
                </p>
              ) : null}

              {paypalAmountValue > 0 ? (
                PAYPAL_CLIENT_ID ? (
                  <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
                    <div className="checkout-paypal-box">
                      <PayPalButtons
                        forceReRender={[paypalAmountValue]}
                        style={{ layout: 'vertical', shape: 'pill', label: 'pay' }}
                        createOrder={(data, actions) =>
                          actions.order.create({
                            purchase_units: [
                              {
                                amount: { value: formatMoney(paypalAmountValue), currency_code: 'USD' },
                                description: `AuraWeb orden parcial (${cartItems.length} items)`,
                              },
                            ],
                          })
                        }
                        onApprove={async (data, actions) => {
                          const capture = await actions.order.capture()
                          const captureId =
                            capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id || data.orderID

                          setPaypalPayment({
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
                          })
                          setStatus('Pago PayPal aprobado correctamente.')
                          setError('')
                        }}
                        onCancel={() => {
                          setError('El pago PayPal fue cancelado.')
                        }}
                        onError={(paypalError) => {
                          console.error('PayPal error:', paypalError)
                          setError('No se pudo procesar el pago en PayPal.')
                        }}
                      />
                    </div>
                  </PayPalScriptProvider>
                ) : null
              ) : (
                <p className="shop-note">Monto PayPal en 0. Este metodo no se usara.</p>
              )}

              {paypalPayment ? (
                <p className="shop-note checkout-method-success">
                  PayPal confirmado: ${formatMoney(paypalPayment.amount)} (Ref: {paypalPayment.reference}).
                </p>
              ) : null}
            </section>
          </div>

          {error ? <p className="shop-error">{error}</p> : null}
          {status ? <p className="shop-note">{status}</p> : null}

          <div className="shop-actions checkout-gateway-actions">
            <button className="btn" onClick={() => navigate('/facturas/carrito')}>
              Volver al carrito
            </button>
            <button className="btn btn-primary" onClick={finalizeInvoice} disabled={issuingInvoice || !balanceOk}>
              {issuingInvoice ? 'Emitiendo factura...' : 'Confirmar pago y emitir factura'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
