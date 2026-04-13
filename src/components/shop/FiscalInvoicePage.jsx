import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FiscalInvoiceDetail from './FiscalInvoiceDetail'
import Header from '../layout/Header'
import { useShop } from '../../hooks/useShop'

export default function FiscalInvoicePage() {
  const navigate = useNavigate()
  const { invoiceId } = useParams()
  const { getInvoiceById, fetchInvoiceById, authLoading } = useShop()
  const [remoteInvoice, setRemoteInvoice] = useState(null)
  const [loadingRemoteInvoice, setLoadingRemoteInvoice] = useState(false)
  const [remoteLookupDone, setRemoteLookupDone] = useState(false)

  const cachedInvoice = useMemo(() => {
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

  useEffect(() => {
    let active = true

    async function loadRemoteInvoice() {
      if (!invoiceId || cachedInvoice || authLoading) {
        if (invoiceId && cachedInvoice && active) {
          setRemoteInvoice(cachedInvoice)
          setRemoteLookupDone(true)
        }
        return
      }

      setLoadingRemoteInvoice(true)
      try {
        const found = await fetchInvoiceById(invoiceId)
        if (active) {
          setRemoteInvoice(found)
          setRemoteLookupDone(true)
        }
      } finally {
        if (active) setLoadingRemoteInvoice(false)
      }
    }

    loadRemoteInvoice()

    return () => {
      active = false
    }
  }, [authLoading, cachedInvoice, fetchInvoiceById, invoiceId])

  const invoice = cachedInvoice || remoteInvoice

  if (invoiceId && (authLoading || loadingRemoteInvoice || (!remoteLookupDone && !invoice))) {
    return (
      <>
        <Header currentPage="facturas-auth" />
        <div className="shop-page">
          <div className="shop-card">
            <h2>Factura Fiscal</h2>
            <p>Cargando factura...</p>
          </div>
        </div>
      </>
    )
  }

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
