import React from 'react'

function formatCurrency(value) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export default function FiscalInvoiceDetail({ invoice, showPrint = true, onBack }) {
  if (!invoice) return null

  return (
    <div className="shop-card invoice-card" id="invoice-print-area">
      <div className="invoice-toolbar no-print">
        <button className="btn" onClick={typeof onBack === 'function' ? onBack : () => window.history.back()}>
          Volver atras
        </button>
        {showPrint ? (
          <button className="btn btn-primary" onClick={() => window.print()}>
            Imprimir factura
          </button>
        ) : null}
      </div>

      <h1 className="invoice-title">{invoice.title}</h1>

      <section className="invoice-section">
        <h3>Emisor</h3>
        <div className="invoice-meta-grid">
          <p><strong>Razon Social:</strong> {invoice.issuer.razonSocial}</p>
          <p><strong>Domicilio:</strong> {invoice.issuer.domicilio}</p>
          <p><strong>RIF:</strong> {invoice.issuer.rif}</p>
          <p><strong>N Factura:</strong> {invoice.controlFiscal.numeroFactura}</p>
          <p><strong>N Control:</strong> {invoice.controlFiscal.numeroControl}</p>
          <p><strong>Rango asignado:</strong> {invoice.controlFiscal.rangoAsignado}</p>
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
            {invoice.items.map((item) => (
              <tr key={`${invoice.id}-${item.code}`}>
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
          <div className="invoice-total-row invoice-total-row-final">
            <span>Valor Total de la Operacion</span>
            <strong>{formatCurrency(invoice.totals.totalOperacion)}</strong>
          </div>
        </div>
      </section>

      <section className="invoice-section">
        <h3>Pie de Imprenta</h3>
        <div className="invoice-meta-grid">
          <p><strong>Razon social:</strong> {invoice.printer.razonSocial}</p>
          <p><strong>RIF:</strong> {invoice.printer.rif}</p>
          <p><strong>Nomenclatura:</strong> {invoice.printer.nomenclatura}</p>
          <p><strong>Providencia:</strong> {invoice.printer.providencia}</p>
          <p><strong>Fecha de asignacion:</strong> {invoice.printer.fechaAsignacion}</p>
        </div>
      </section>
    </div>
  )
}
