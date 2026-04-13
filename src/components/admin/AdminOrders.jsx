import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import Header from '../layout/Header'
import ThemeSelector from '../ui/ThemeSelector'
import FiscalInvoiceDetail from '../shop/FiscalInvoiceDetail'

function formatMoney(value) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function normalizeInvoiceDetail(row, customerProfile = {}) {
  const invoiceClient = row.customer_profile || {}

  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title || 'FACTURA',
    issuer: {
      razonSocial: row.issuer?.razonSocial || '-',
      domicilio: row.issuer?.domicilio || '-',
      rif: row.issuer?.rif || '-',
      telefono: row.issuer?.telefono || '',
      email: row.issuer?.email || '',
    },
    controlFiscal: {
      numeroFactura: row.control_fiscal?.numeroFactura || '-',
      numeroControl: row.control_fiscal?.numeroControl || '-',
      rangoAsignado: row.control_fiscal?.rangoAsignado || '',
    },
    fecha: row.fecha || '-',
    hora: row.hora || '-',
    client: {
      nombreORazonSocial:
        invoiceClient.nombreORazonSocial || customerProfile.nombre_razon_social || 'Cliente',
      domicilioFiscal: invoiceClient.domicilioFiscal || '-',
      identificacion: invoiceClient.identificacion || '-',
    },
    items: Array.isArray(row.items) ? row.items : [],
    totals: {
      baseImponibleIva: Number(row.totals?.baseImponibleIva) || 0,
      baseExenta: Number(row.totals?.baseExenta) || 0,
      montoIva: Number(row.totals?.montoIva) || 0,
      ivaRate: Number(row.totals?.ivaRate) || 0,
      totalOperacion: Number(row.totals?.totalOperacion) || 0,
      discountAmount: Number(row.totals?.discountAmount) || 0,
    },
    payments: row.payments || { methods: [], totalPaid: 0 },
    coupon: row.coupon || null,
    printer: {
      razonSocial: row.printer?.razonSocial || '-',
      rif: row.printer?.rif || '-',
      nomenclaturaFactura: row.printer?.nomenclaturaFactura || '-',
      nomenclaturaControl: row.printer?.nomenclaturaControl || '-',
      providencia: row.printer?.providencia || '-',
      fechaAsignacion: row.printer?.fechaAsignacion || '-',
      serialFiscal: row.printer?.serialFiscal || '',
    },
  }
}

export default function AdminOrders({ activeMode, onModeChange }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')

  async function loadOrders() {
    setLoading(true)
    setFeedback('')

    try {
      const { data, error } = await supabase
        .from('shop_invoices')
        .select('id, auth_user_id, created_at, title, fecha, hora, issuer, control_fiscal, customer_profile, items, totals, payments, coupon, printer')
        .order('created_at', { ascending: false })

      if (error) throw error

      const invoiceRows = data || []
      const userIds = [...new Set(invoiceRows.map((row) => row.auth_user_id).filter(Boolean))]

      const customerMap = new Map()

      if (userIds.length) {
        const { data: customerRows, error: customerError } = await supabase
          .from('clientes')
          .select('auth_user_id, email, nombre_razon_social')
          .in('auth_user_id', userIds)

        if (customerError) {
          console.error('Error cargando perfiles de clientes para pedidos admin:', customerError)
        } else {
          ;(customerRows || []).forEach((row) => {
            customerMap.set(row.auth_user_id, row)
          })
        }
      }

      const nextOrders = invoiceRows.map((row) => {
        const customerFromInvoice = row.customer_profile || {}
        const customerFromProfile = customerMap.get(row.auth_user_id) || {}

        return {
          id: row.id,
          createdAt: row.created_at,
          userId: row.auth_user_id,
          invoiceNumber: row.control_fiscal?.numeroFactura || '-',
          controlNumber: row.control_fiscal?.numeroControl || '-',
          customerName:
            customerFromInvoice.nombreORazonSocial ||
            customerFromProfile.nombre_razon_social ||
            'Cliente',
          customerDoc: customerFromInvoice.identificacion || '-',
          customerEmail: customerFromProfile.email || '-',
          total: Number(row.totals?.totalOperacion) || 0,
          totalPaid: Number(row.payments?.totalPaid) || 0,
          paymentStatus: row.payments?.status || '-',
          couponCode: row.coupon?.code || '-',
          couponDiscountPct: Number(row.coupon?.discountPct) || 0,
          invoiceDetail: normalizeInvoiceDetail(row, customerFromProfile),
        }
      })

      setOrders(nextOrders)
      setSelectedInvoiceId((prev) => {
        if (!prev) return nextOrders[0]?.id || ''
        return nextOrders.some((order) => order.id === prev) ? prev : nextOrders[0]?.id || ''
      })
    } catch (loadError) {
      console.error('Error cargando pedidos administrativos:', loadError)
      setFeedback('No se pudieron cargar los pedidos de facturacion.')
      setOrders([])
      setSelectedInvoiceId('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    const query = String(search || '').trim().toLowerCase()
    if (!query) return orders

    return orders.filter((order) => {
      const bucket = [
        order.invoiceNumber,
        order.controlNumber,
        order.customerName,
        order.customerEmail,
        order.customerDoc,
        order.userId,
      ]
        .join(' ')
        .toLowerCase()

      return bucket.includes(query)
    })
  }, [orders, search])

  const selectedOrder = useMemo(() => {
    if (!selectedInvoiceId) return null
    return orders.find((order) => order.id === selectedInvoiceId) || null
  }, [orders, selectedInvoiceId])

  return (
    <div className="admin-page">
      <Header currentPage="admin-pedidos">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>

      <section className="admin-users-page" style={{ padding: 20 }}>
        <div className="admin-users-card admin-orders-card-wide">
          <h2>Pedidos y facturas</h2>
          <p>
            Vista global de facturas emitidas. Puedes buscar por numero de factura/control o por
            usuario (nombre, email o identificacion).
          </p>

          <div className="admin-orders-toolbar">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por factura o usuario"
            />
            <button type="button" onClick={loadOrders}>
              Recargar
            </button>
          </div>

          {feedback ? <div className="admin-users-feedback">{feedback}</div> : null}

          {loading ? (
            <p>Cargando pedidos...</p>
          ) : (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table admin-orders-table">
                <thead>
                  <tr>
                    <th>Creada</th>
                    <th>Usuario</th>
                    <th>N Factura</th>
                    <th>N Control</th>
                    <th>Total</th>
                    <th>Pagado</th>
                    <th>Cupon</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <div className="admin-order-user-cell">
                          <strong>{order.customerName}</strong>
                          <span>{order.customerEmail}</span>
                          <span>{order.customerDoc}</span>
                        </div>
                      </td>
                      <td>{order.invoiceNumber}</td>
                      <td>{order.controlNumber}</td>
                      <td>${formatMoney(order.total)}</td>
                      <td>${formatMoney(order.totalPaid)}</td>
                      <td>
                        {order.couponCode !== '-' ? (
                          <span>
                            {order.couponCode} ({order.couponDiscountPct.toFixed(2)}%)
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{order.paymentStatus}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-orders-view-btn"
                          onClick={() => setSelectedInvoiceId(order.id)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filteredOrders.length ? <p>No hay resultados para tu busqueda.</p> : null}
            </div>
          )}

          {selectedOrder ? (
            <div className="admin-order-detail-panel">
              <div className="admin-order-detail-head">
                <h3>Detalle de factura: {selectedOrder.invoiceNumber}</h3>
                <button type="button" onClick={() => setSelectedInvoiceId('')}>
                  Cerrar
                </button>
              </div>
              <FiscalInvoiceDetail
                invoice={selectedOrder.invoiceDetail}
                showPrint={false}
                showToolbar={false}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
