import React from 'react'
import { downloadInvoicePdf } from '../../utils/invoicePdf'

function formatCurrency(value) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export default function FiscalInvoiceDetail({ invoice, showPrint = true, onBack, showToolbar = true }) {
  if (!invoice) return null

  const nomenclaturaFactura = invoice?.printer?.nomenclaturaFactura || invoice?.printer?.nomenclatura || '-'
  const nomenclaturaControl = invoice?.printer?.nomenclaturaControl || invoice?.printer?.nomenclatura || '-'
  const paymentMethods = invoice?.payments?.methods || []
  const coupon = invoice?.coupon || invoice?.totals?.coupon || null

  return (
    <div className="shop-card invoice-card" id="invoice-print-area">
      {showToolbar ? (
        <div className="invoice-toolbar no-print">
          <button className="btn" onClick={typeof onBack === 'function' ? onBack : () => window.history.back()}>
            Volver atras
          </button>
          {showPrint ? (
            <button className="btn btn-primary" onClick={() => window.print()}>
              Imprimir factura
            </button>
          ) : null}
          <button className="btn" onClick={() => downloadInvoicePdf(invoice)}>
            Descargar PDF
          </button>
        </div>
      ) : null}

      <h1 className="invoice-title">{invoice.title}</h1>

      <section className="invoice-section">
        <h3>Emisor</h3>
        <div className="invoice-meta-grid">
          <p><strong>Razon Social:</strong> {invoice.issuer.razonSocial}</p>
          <p><strong>Domicilio:</strong> {invoice.issuer.domicilio}</p>
          <p><strong>RIF:</strong> {invoice.issuer.rif}</p>
          {invoice.issuer.telefono ? <p><strong>Telefono:</strong> {invoice.issuer.telefono}</p> : null}
          {invoice.issuer.email ? <p><strong>Correo:</strong> {invoice.issuer.email}</p> : null}
          <p><strong>N Factura:</strong> {invoice.controlFiscal.numeroFactura}</p>
          <p><strong>N Control:</strong> {invoice.controlFiscal.numeroControl}</p>
          <p><strong>Fecha:</strong> {invoice.fecha}</p>
          <p><strong>Hora:</strong> {invoice.hora}</p>
        </div>
      </section>

      <section className="invoice-section">
        <h3>Cliente</h3>
        <div className="invoice-meta-grid">
          <p><strong>Nombre/Razon Social:</strong> {invoice.client.nombreORazonSocial}</p>
          <p><strong>Domicilio Fiscal:</strong> {invoice.client.domicilioFiscal}</p>
          <p><strong>RIF/Cedula:</strong> {invoice.client.identificacion}</p>
        </div>
      </section>

      <section className="invoice-section">
        <h3>Items</h3>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Descripcion</th>
              <th>Cant.</th>
              <th>Precio Unitario</th>
              <th>Desc.</th>
              <th>Marca</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={`${invoice.id}-${item.code}-${item.description}-${index}`}>
                <td>{item.code}</td>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{item.discountPct ? `${item.discountPct}%` : '-'}</td>
                <td>{item.exentoMark || '-'}</td>
                <td>{formatCurrency(item.lineSubtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="invoice-section invoice-section-totals">
        <h3>Totales</h3>
        <div className="invoice-totals">
          <div className="invoice-total-row">
            <span>Base Imponible (IVA)</span>
            <strong>{formatCurrency(invoice.totals.baseImponibleIva)}</strong>
          </div>
          <div className="invoice-total-row">
            <span>Base Exenta</span>
            <strong>{formatCurrency(invoice.totals.baseExenta)}</strong>
          </div>
          <div className="invoice-total-row">
            <span>Monto IVA ({Math.round(invoice.totals.ivaRate * 100)}%)</span>
            <strong>{formatCurrency(invoice.totals.montoIva)}</strong>
          </div>
          {coupon ? (
            <div className="invoice-total-row">
              <span>Cupon {coupon.code} ({Number(coupon.discountPct || 0).toFixed(2)}%)</span>
              <strong>-{formatCurrency(invoice.totals.discountAmount || coupon.discountAmount || 0)}</strong>
            </div>
          ) : null}
          <div className="invoice-total-row invoice-total-row-final">
            <span>Valor Total de la Operacion</span>
            <strong>{formatCurrency(invoice.totals.totalOperacion)}</strong>
          </div>
        </div>
      </section>

      <section className="invoice-section">
        <h3>Pagos</h3>
        {!paymentMethods.length ? (
          <p>No hay metodos de pago registrados.</p>
        ) : (
          <div className="invoice-meta-grid">
            {paymentMethods.map((payment, index) => (
              <p key={`${payment.method}-${payment.reference || index}`}>
                <strong>{payment.method === 'pago_movil' ? 'Pago Movil' : String(payment.method || 'online').toUpperCase()}:</strong>{' '}
                {formatCurrency(payment.amount)} (Ref: {payment.reference || '-'})
              </p>
            ))}
            <p>
              <strong>Total pagado:</strong>{' '}
              {formatCurrency(invoice?.payments?.totalPaid || 0)}
            </p>
          </div>
        )}
      </section>

      <section className="invoice-section">
        <h3>Pie de Imprenta</h3>
        <div className="invoice-meta-grid">
          <p><strong>Razon social:</strong> {invoice.printer.razonSocial}</p>
          <p><strong>RIF:</strong> {invoice.printer.rif}</p>
          <p><strong>Nomenclatura factura:</strong> {nomenclaturaFactura}</p>
          <p><strong>Nomenclatura control:</strong> {nomenclaturaControl}</p>
          <p><strong>Providencia:</strong> {invoice.printer.providencia}</p>
          <p><strong>Fecha de asignacion:</strong> {invoice.printer.fechaAsignacion}</p>
          {invoice.printer.serialFiscal ? <p><strong>Serial fiscal:</strong> {invoice.printer.serialFiscal}</p> : null}
        </div>
      </section>
    </div>
  )
}
