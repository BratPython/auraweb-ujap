import jsPDF from 'jspdf'

function fmtMoney(value) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function lineValue(doc, label, value, y) {
  doc.setFont('helvetica', 'bold')
  doc.text(`${label}:`, 40, y)
  doc.setFont('helvetica', 'normal')
  doc.text(String(value ?? '-'), 160, y)
}

export function downloadInvoicePdf(invoice) {
  if (!invoice) return

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = 40

  const next = (step = 16) => {
    y += step
    if (y > 780) {
      doc.addPage()
      y = 40
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(invoice.title || 'FACTURA', 40, y)
  next(24)

  doc.setFontSize(10)
  lineValue(doc, 'Numero Factura', invoice?.controlFiscal?.numeroFactura, y)
  next()
  lineValue(doc, 'Numero Control', invoice?.controlFiscal?.numeroControl, y)
  next()
  lineValue(doc, 'Fecha', invoice?.fecha, y)
  next()
  lineValue(doc, 'Hora', invoice?.hora, y)
  next(20)

  doc.setFont('helvetica', 'bold')
  doc.text('EMISOR', 40, y)
  next()
  doc.setFont('helvetica', 'normal')
  lineValue(doc, 'Razon Social', invoice?.issuer?.razonSocial, y)
  next()
  lineValue(doc, 'RIF', invoice?.issuer?.rif, y)
  next()
  lineValue(doc, 'Domicilio', invoice?.issuer?.domicilio, y)
  next()
  if (invoice?.issuer?.telefono) {
    lineValue(doc, 'Telefono', invoice.issuer.telefono, y)
    next()
  }
  if (invoice?.issuer?.email) {
    lineValue(doc, 'Correo', invoice.issuer.email, y)
    next()
  }

  next(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE', 40, y)
  next()
  doc.setFont('helvetica', 'normal')
  lineValue(doc, 'Nombre / Razon Social', invoice?.client?.nombreORazonSocial, y)
  next()
  lineValue(doc, 'Identificacion', invoice?.client?.identificacion, y)
  next()
  lineValue(doc, 'Domicilio Fiscal', invoice?.client?.domicilioFiscal, y)
  next(20)

  doc.setFont('helvetica', 'bold')
  doc.text('ITEMS', 40, y)
  next()
  doc.setFont('helvetica', 'normal')

  const headers = ['Codigo', 'Descripcion', 'Cant', 'PU', 'Desc', 'Subtotal']
  const colX = [40, 100, 330, 380, 450, 510]
  headers.forEach((header, index) => {
    doc.setFont('helvetica', 'bold')
    doc.text(header, colX[index], y)
  })
  next(14)

  ;(invoice?.items || []).forEach((item) => {
    doc.setFont('helvetica', 'normal')
    doc.text(String(item?.code || '-'), colX[0], y)
    doc.text(String(item?.description || '-').slice(0, 36), colX[1], y)
    doc.text(String(item?.quantity || 0), colX[2], y)
    doc.text(fmtMoney(item?.unitPrice), colX[3], y)
    doc.text(item?.discountPct ? `${item.discountPct}%` : '-', colX[4], y)
    doc.text(fmtMoney(item?.lineSubtotal), colX[5], y)
    next(14)
  })

  next(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTALES', 40, y)
  next()
  doc.setFont('helvetica', 'normal')
  lineValue(doc, 'Base Imponible', fmtMoney(invoice?.totals?.baseImponibleIva), y)
  next()
  lineValue(doc, 'Base Exenta', fmtMoney(invoice?.totals?.baseExenta), y)
  next()
  lineValue(doc, 'Monto IVA', fmtMoney(invoice?.totals?.montoIva), y)
  next()
  lineValue(doc, 'Total Operacion', fmtMoney(invoice?.totals?.totalOperacion), y)

  next(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PAGOS', 40, y)
  next()

  const methods = invoice?.payments?.methods || []
  if (!methods.length) {
    doc.setFont('helvetica', 'normal')
    doc.text('Sin detalle de pago registrado.', 40, y)
    next()
  } else {
    methods.forEach((payment) => {
      doc.setFont('helvetica', 'normal')
      const methodName = payment.method === 'pago_movil' ? 'Pago Movil' : payment.method
      doc.text(
        `${methodName} | Monto: ${fmtMoney(payment.amount)} | Ref: ${payment.reference || '-'}`,
        40,
        y
      )
      next()
    })
  }

  next(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PIE DE IMPRENTA', 40, y)
  next()
  doc.setFont('helvetica', 'normal')
  lineValue(doc, 'Razon social', invoice?.printer?.razonSocial, y)
  next()
  lineValue(doc, 'RIF', invoice?.printer?.rif, y)
  next()
  lineValue(doc, 'Nomenclatura factura', invoice?.printer?.nomenclaturaFactura, y)
  next()
  lineValue(doc, 'Nomenclatura control', invoice?.printer?.nomenclaturaControl, y)
  next()
  lineValue(doc, 'Providencia', invoice?.printer?.providencia, y)
  next()
  lineValue(doc, 'Fecha asignacion', invoice?.printer?.fechaAsignacion, y)
  next()
  if (invoice?.printer?.serialFiscal) {
    lineValue(doc, 'Serial fiscal', invoice?.printer?.serialFiscal, y)
    next()
  }

  const safeNumber = String(invoice?.controlFiscal?.numeroFactura || invoice?.id || 'factura')
    .replace(/[^0-9A-Za-z_-]/g, '')
    .slice(0, 40)
  doc.save(`factura-${safeNumber}.pdf`)
}
