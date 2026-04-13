import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../hooks/useShop'

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function formatMoney(value) {
  return money(value).toFixed(2)
}

export default function CartSideDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const {
    currentUser,
    cartItems,
    subtotal,
    ensurePendingCheckout,
    clearCart,
  } = useShop()

  const [creatingOrder, setCreatingOrder] = useState(false)
  const [message, setMessage] = useState('')

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cartItems]
  )

  async function handleCreatePayableAndGoCheckout() {
    setMessage('')

    if (!currentUser) {
      onClose()
      navigate('/facturas/auth')
      return
    }

    if (!cartItems.length) {
      setMessage('Tu carrito esta vacio.')
      return
    }

    setCreatingOrder(true)
    try {
      const created = await ensurePendingCheckout({
        forceNew: true,
        cartOverride: cartItems,
        coupon: null,
      })

      if (!created.ok || !created.session?.id) {
        setMessage(created.error || 'No se pudo crear la cuenta por pagar.')
        return
      }

      clearCart()
      onClose()
      navigate(`/facturas/pago?checkout=${created.session.id}`)
    } finally {
      setCreatingOrder(false)
    }
  }

  return (
    <>
      <div
        className={`cart-drawer-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`cart-drawer${open ? ' open' : ''}`}
        aria-hidden={!open}
        aria-label="Carrito lateral"
      >
        <div className="cart-drawer-head">
          <div>
            <h3>Carrito</h3>
            <p>{totalItems} item(s)</p>
          </div>
          <button type="button" className="cart-drawer-close" onClick={onClose} aria-label="Cerrar carrito">
            ×
          </button>
        </div>

        <div className="cart-drawer-body">
          {cartItems.length ? null : <p className="shop-note">Aun no agregas productos.</p>}

          {cartItems.map((item) => (
            <article className="cart-drawer-item" key={item.id}>
              <div className="cart-drawer-item-image">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <div className="cart-drawer-item-placeholder">🛍️</div>
                )}
              </div>
              <div className="cart-drawer-item-info">
                <strong>{item.name}</strong>
                <p>Cantidad: {item.quantity}</p>
                <p>${formatMoney((Number(item.price) || 0) * (Number(item.quantity) || 0))}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="cart-drawer-footer">
          <div className="cart-drawer-total">
            <span>Subtotal</span>
            <strong>${formatMoney(subtotal)}</strong>
          </div>

          {message ? <p className="shop-note">{message}</p> : null}

          <button
            type="button"
            className="btn btn-primary cart-drawer-pay-btn"
            onClick={handleCreatePayableAndGoCheckout}
            disabled={creatingOrder || !cartItems.length}
          >
            {creatingOrder ? 'Creando cuenta por pagar...' : 'Pagar para crear cuenta por pagar'}
          </button>
        </div>
      </aside>
    </>
  )
}
