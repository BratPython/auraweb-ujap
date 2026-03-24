import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FiscalInvoiceDetail from './FiscalInvoiceDetail'
import Header from '../layout/Header'
import { useShop } from '../../hooks/useShop'

export default function FiscalInvoicePage() {
  const navigate = useNavigate()
  const { invoiceId } = useParams()
  const { getInvoiceById } = useShop()

  const invoice = useMemo(() => {
    if (invoiceId) {
      return getInvoiceById(invoiceId)
    }

    try {
      const raw = sessionStorage.getItem('aura:lastInvoice')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [getInvoiceById, invoiceId])

  if (!invoice) {
    return (
      <>
        <Header currentPage="facturas-auth" />
        <div className="shop-page">
          <div className="shop-card">
            <h2>Factura Fiscal</h2>
            <p>No hay factura disponible. Vuelve al checkout y presiona Pagar.</p>
            <button className="btn" onClick={() => navigate('/facturas/carrito')}>
              Volver al carrito
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header currentPage="facturas-auth" />
      <div className="shop-page">
        <FiscalInvoiceDetail
          invoice={invoice}
          showPrint
          onBack={() => navigate(-1)}
        />
      </div>
    </>
  )
}
