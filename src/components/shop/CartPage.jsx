import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../hooks/useShop'
import Header from '../layout/Header'

export default function CartPage() {
  const navigate = useNavigate()
  const {
    currentUser,
    cartItems,
    subtotal,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    buildInvoice,
  } = useShop()

  const [message, setMessage] = useState('')

  const formattedSubtotal = useMemo(() => subtotal.toFixed(2), [subtotal])

  async function handleCheckout() {
    const result = await buildInvoice()
    if (!result.ok) {
      setMessage(result.error)
      return
    }

    sessionStorage.setItem('aura:lastInvoice', JSON.stringify(result.invoice))
    navigate('/facturas/factura')
  }

  return (
    <>
      <Header currentPage="facturas-cart" />
      <div className="shop-page">
        <div className="shop-card">
          <h2>Carrito y Checkout</h2>
          {!currentUser ? <p className="shop-error">Debes iniciar sesion para pagar.</p> : null}

          <h3>Items en carrito</h3>
          <div className="shop-list">
            {cartItems.length === 0 ? <p>Carrito vacio.</p> : null}
            {cartItems.map((item) => (
              <div className="shop-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>Precio: ${item.price.toFixed(2)}</p>
                  <p>Descuento: {item.discountPct}%</p>
                </div>
                <div className="shop-actions">
                  <input
                    type="number"
                    min={1}
                    max={item.stock}
                    value={item.quantity}
                    onChange={(e) => updateCartQuantity(item.id, e.target.value)}
                  />
                  <button className="btn btn-sm-danger" onClick={() => removeFromCart(item.id)}>
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p><strong>Subtotal:</strong> ${formattedSubtotal}</p>

          {message ? <p className="shop-note">{message}</p> : null}

          <div className="shop-actions">
            <button className="btn" onClick={() => navigate('/catalogo')}>
              Seguir comprando
            </button>
            <button className="btn btn-primary" onClick={handleCheckout}>
              Pagar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
