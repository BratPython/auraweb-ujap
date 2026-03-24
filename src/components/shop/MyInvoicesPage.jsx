import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../hooks/useShop'
import Header from '../layout/Header'

function formatDate(isoDate) {
  try {
    return new Date(isoDate).toLocaleString('es-VE')
  } catch {
    return isoDate || '-'
  }
}

export default function MyInvoicesPage() {
  const navigate = useNavigate()
  const { currentUser, getUserInvoices } = useShop()
  const [selectedId, setSelectedId] = useState('')

  const invoices = useMemo(() => getUserInvoices(), [getUserInvoices])
  const selectedInvoice = useMemo(() => invoices.find((inv) => inv.id === selectedId) || null, [invoices, selectedId])

  if (!currentUser) {
    return (
      <>
        <Header currentPage="facturas-auth" />
        <div className="shop-page">
          <div className="shop-card">
            <h2>Mis facturas</h2>
            <p className="shop-error">Debes iniciar sesion para ver tu historial.</p>
            <button className="btn btn-primary" onClick={() => navigate('/facturas/auth')}>Ir a iniciar sesion</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header currentPage="facturas-orders" />
      <div className="shop-page">
        <div className="shop-card">
          <h2>Mis facturas</h2>
          <p>Historial de facturas emitidas para {currentUser.legalName}.</p>

          {!invoices.length ? (
            <p>No tienes facturas emitidas aun.</p>
          ) : (
            <div className="shop-list">
              {invoices.map((invoice) => (
                <div className="shop-item" key={invoice.id}>
                  <div>
                    <strong>{invoice.controlFiscal.numeroFactura}</strong>
                    <p>Control: {invoice.controlFiscal.numeroControl}</p>
                    <p>Fecha: {formatDate(invoice.createdAt)}</p>
                  </div>
                  <div className="shop-actions">
                    <button className="btn" onClick={() => setSelectedId(invoice.id)}>
                      Seleccionar
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate(`/facturas/factura/${invoice.id}`)}>
                      Ver detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedInvoice ? (
            <p className="shop-note">
              Seleccionada: {selectedInvoice.controlFiscal.numeroFactura}.
            </p>
          ) : null}
        </div>
      </div>
    </>
  )
}
