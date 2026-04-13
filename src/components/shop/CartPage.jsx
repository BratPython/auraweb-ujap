import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../hooks/useShop'
import Header from '../layout/Header'

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function formatMoney(value) {
  return money(value).toFixed(2)
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default function CartPage() {
  const navigate = useNavigate()
  const {
    currentUser,
    pendingCheckoutList,
    pendingCheckoutLoading,
  } = useShop()

  const sortedPending = useMemo(
    () => [...pendingCheckoutList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [pendingCheckoutList]
  )

  return (
    <>
      <Header currentPage="facturas-cart" />
      <div className="shop-page">
        <div className="shop-card">
          <h2>Por pagar</h2>
          {!currentUser ? <p className="shop-error">Debes iniciar sesion para ver tus cuentas por pagar.</p> : null}

          {currentUser && pendingCheckoutLoading ? <p>Cargando cuentas por pagar...</p> : null}

          {currentUser && !pendingCheckoutLoading ? (
            <div className="shop-payables-list">
              {sortedPending.length ? null : (
                <p className="shop-note">No tienes cuentas por pagar activas en este momento.</p>
              )}

              {sortedPending.map((order) => {
                const totalToPay = money(
                  order?.totalsSnapshot?.totalToPay ?? (Number(order.remainingTotal || 0) + Number(order.paidTotal || 0))
                )
                const paidTotal = money(order.paidTotal)
                const remainingTotal = money(order.remainingTotal)
                const couponCode = order?.couponSnapshot?.code || ''

                return (
                  <article className="shop-payable-card" key={order.id}>
                    <div className="shop-payable-head">
                      <h3>Cuenta #{String(order.id).slice(0, 8)}</h3>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>

                    <div className="shop-payable-grid">
                      <p><strong>Total:</strong> ${formatMoney(totalToPay)}</p>
                      <p><strong>Pagado:</strong> ${formatMoney(paidTotal)}</p>
                      <p><strong>Por pagar:</strong> ${formatMoney(remainingTotal)}</p>
                      <p><strong>Items:</strong> {Array.isArray(order.cartSnapshot) ? order.cartSnapshot.length : 0}</p>
                      {couponCode ? <p><strong>Cupon:</strong> {couponCode}</p> : null}
                    </div>

                    <div className="shop-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/facturas/pago?checkout=${order.id}`)}
                      >
                        Terminar pago
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}

          <div className="shop-actions" style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => navigate('/catalogo')}>
              Volver al catalogo
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
