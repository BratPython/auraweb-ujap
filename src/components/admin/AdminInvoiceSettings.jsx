import React, { useMemo, useState } from 'react'
import Header from '../layout/Header'
import ThemeSelector from '../ui/ThemeSelector'
import FiscalInvoiceDetail from '../shop/FiscalInvoiceDetail'
import {
  DEFAULT_INVOICE_SETTINGS,
  NOMENCLATURE_DATE_FORMATS,
  buildNomenclature,
  loadInvoiceSettings,
  saveInvoiceSettings,
} from '../../config/invoiceSettings'

const PREVIEW_ITEMS = [
  {
    code: 'AW-001',
    description: 'Diseno de interfaz premium',
    quantity: 1,
    unitPrice: 120,
    discountPct: 10,
    exentoMark: '',
  },
  {
    code: 'AW-002',
    description: 'Mantenimiento mensual',
    quantity: 1,
    unitPrice: 35,
    discountPct: 0,
    exentoMark: 'E',
  },
]

const FIELDSETS = [
  {
    title: 'Datos de la empresa emisora',
    description: 'Informacion que se imprime en el bloque Emisor de la factura.',
    fields: [
      { path: 'issuer.razonSocial', label: 'Razon social', placeholder: 'Ej: Aura Web C.A.' },
      { path: 'issuer.rif', label: 'RIF', placeholder: 'Ej: 41234567-8', prefix: 'J-' },
      { path: 'issuer.domicilio', label: 'Domicilio fiscal', placeholder: 'Direccion completa de la empresa' },
      { path: 'issuer.telefono', label: 'Telefono', placeholder: 'Ej: +58 412 0000000' },
      { path: 'issuer.email', label: 'Correo', placeholder: 'Ej: facturacion@empresa.com' },
    ],
  },
  {
    title: 'Datos de control fiscal',
    description: 'Configuracion general que acompana al numero de factura/control.',
    fields: [
      { path: 'controlFiscal.tituloFactura', label: 'Titulo del documento', placeholder: 'Ej: FACTURA' },
      {
        path: 'controlFiscal.rangoMin',
        label: 'Rango minimo',
        placeholder: '00000001',
        prefix: 'F-',
        numeric: true,
      },
      {
        path: 'controlFiscal.rangoMax',
        label: 'Rango maximo',
        placeholder: '99999999',
        prefix: 'F-',
        numeric: true,
      },
    ],
  },
  {
    title: 'Pie de imprenta',
    description: 'Datos de la imprenta autorizada que aparecen al final de la factura.',
    fields: [
      { path: 'printer.razonSocial', label: 'Razon social de imprenta', placeholder: 'Nombre legal de la imprenta' },
      { path: 'printer.rif', label: 'RIF imprenta', placeholder: 'Ej: 40987654-3', prefix: 'J-' },
      {
        path: 'printer.nomenclaturaFormatoFactura',
        label: 'Formato nomenclatura factura',
        type: 'select',
        options: NOMENCLATURE_DATE_FORMATS,
      },
      {
        path: 'printer.nomenclaturaFormatoControl',
        label: 'Formato nomenclatura control',
        type: 'select',
        options: NOMENCLATURE_DATE_FORMATS,
      },
      { path: 'printer.providencia', label: 'Providencia', placeholder: 'Ej: SNAT/2026/00077' },
      { path: 'printer.fechaAsignacion', label: 'Fecha asignacion', placeholder: 'Formato sugerido: DDMMAAAA' },
    ],
  },
]

const RIF_FIELDS = new Set(['issuer.rif', 'printer.rif'])
const RANGE_FIELDS = new Set(['controlFiscal.rangoMin', 'controlFiscal.rangoMax'])

function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? ''
}

function updateValueByPath(obj, path, value) {
  const keys = path.split('.')
  const next = { ...obj }
  let pointer = next

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i]
    pointer[key] = { ...(pointer[key] || {}) }
    pointer = pointer[key]
  }

  pointer[keys[keys.length - 1]] = value
  return next
}

function normalizeRifValue(value) {
  const raw = String(value ?? '').toUpperCase().replace(/\s+/g, '')
  const withoutPrefix = raw.startsWith('J-') ? raw.slice(2) : raw.replace(/^J/, '')
  const cleaned = withoutPrefix.replace(/[^0-9A-Z-]/g, '')
  return `J-${cleaned}`
}

function normalizeRangeValue(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 8)
}

function formatRangeWithPrefix(value) {
  const digits = normalizeRangeValue(value)
  return `F-${digits.padStart(8, '0')}`
}

export default function AdminInvoiceSettings({ activeMode, onModeChange }) {
  const [settings, setSettings] = useState(() => loadInvoiceSettings())
  const [status, setStatus] = useState('')

  const previewRandomSeed = useMemo(() => {
    const seed = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return {
      factura: seed(),
      control: seed(),
    }
  }, [])

  const flatFields = useMemo(
    () => FIELDSETS.flatMap((group) => group.fields.map((field) => field.path)),
    []
  )

  const previewInvoice = useMemo(() => {
    const now = new Date()
    const fecha = now.toLocaleDateString('es-VE')
    const hora = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
    const ivaRate = 0.16

    const items = PREVIEW_ITEMS.map((item) => {
      const subtotalBruto = item.unitPrice * item.quantity
      const descuento = subtotalBruto * (item.discountPct / 100)
      const lineSubtotal = subtotalBruto - descuento
      return {
        ...item,
        lineSubtotal,
      }
    })

    const baseExenta = items
      .filter((item) => item.exentoMark === 'E')
      .reduce((acc, item) => acc + item.lineSubtotal, 0)
    const baseImponibleIva = items
      .filter((item) => item.exentoMark !== 'E')
      .reduce((acc, item) => acc + item.lineSubtotal, 0)
    const montoIva = baseImponibleIva * ivaRate
    const totalOperacion = baseExenta + baseImponibleIva + montoIva

    const nomenclaturaFactura = buildNomenclature({
      date: now,
      dateFormat: settings?.printer?.nomenclaturaFormatoFactura,
      randomTail: previewRandomSeed.factura,
    })

    const nomenclaturaControl = buildNomenclature({
      date: now,
      dateFormat: settings?.printer?.nomenclaturaFormatoControl,
      randomTail: previewRandomSeed.control,
    })

    return {
      id: 'preview-invoice',
      title: settings.controlFiscal.tituloFactura,
      fecha,
      hora,
      client: {
        nombreORazonSocial: 'Cliente Demo C.A.',
        domicilioFiscal: 'Valencia, Carabobo',
        identificacion: 'J-12345678-9',
      },
      items,
      totals: {
        baseExenta,
        baseImponibleIva,
        montoIva,
        ivaRate,
        totalOperacion,
      },
      issuer: settings.issuer,
      controlFiscal: {
        numeroFactura: nomenclaturaFactura,
        numeroControl: nomenclaturaControl,
      },
      printer: {
        ...settings.printer,
        nomenclaturaFactura,
        nomenclaturaControl,
      },
    }
  }, [previewRandomSeed.control, previewRandomSeed.factura, settings])

  function handleChange(path, value) {
    let nextValue = value

    if (RIF_FIELDS.has(path)) {
      nextValue = normalizeRifValue(value)
    }

    if (RANGE_FIELDS.has(path)) {
      nextValue = normalizeRangeValue(value)
    }

    setSettings((prev) => updateValueByPath(prev, path, nextValue))
    setStatus('')
  }

  function handleEnterNext(event) {
    if (event.key !== 'Enter') return
    event.preventDefault()

    const currentPath = event.currentTarget.dataset.path
    const currentIndex = flatFields.indexOf(currentPath)

    if (currentIndex === -1) return
    const nextPath = flatFields[currentIndex + 1]

    if (!nextPath) {
      event.currentTarget.form?.requestSubmit()
      return
    }

    const form = event.currentTarget.form
    const nextField = form?.querySelector(`[data-path="${nextPath}"]`)

    if (nextField instanceof HTMLElement) {
      nextField.focus()
      if (typeof nextField.select === 'function') {
        nextField.select()
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const saved = saveInvoiceSettings(settings)
    setSettings(saved)
    setStatus('Datos de factura guardados correctamente.')
  }

  function handleRestoreDefaults() {
    setSettings({ ...DEFAULT_INVOICE_SETTINGS })
    setStatus('Se restauraron los valores base. Guarda para aplicar cambios.')
  }

  return (
    <div className="admin-page">
      <Header currentPage="admin-factura">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>

      <section className="admin-users-page" style={{ padding: 20 }}>
        <div className="admin-users-card admin-invoice-card-wide">
          <h2>Configuracion de factura fiscal</h2>
          <p>
            Completa todos los datos de empresa e imprenta. Al presionar Enter, el cursor pasa al
            siguiente campo automaticamente.
          </p>

          {status ? <div className="admin-users-feedback">{status}</div> : null}

          <form className="admin-invoice-form" onSubmit={handleSubmit}>
            {FIELDSETS.map((group) => (
              <fieldset key={group.title} className="admin-invoice-group">
                <div className="admin-invoice-group-head">
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>

                <div className="admin-invoice-grid">
                  {group.fields.map((field) => (
                    <label key={field.path} htmlFor={field.path}>
                      {field.label}
                      {field.type === 'select' ? (
                        <select
                          id={field.path}
                          data-path={field.path}
                          value={getValueByPath(settings, field.path)}
                          onChange={(e) => handleChange(field.path, e.target.value)}
                          onKeyDown={handleEnterNext}
                          required
                        >
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : null}

                      {field.prefix ? (
                        <div className="admin-prefixed-input">
                          <span>{field.prefix}</span>
                          <input
                            id={field.path}
                            data-path={field.path}
                            type="text"
                            value={field.prefix === 'J-' ? getValueByPath(settings, field.path).replace(/^J-/, '') : getValueByPath(settings, field.path)}
                            onChange={(e) => handleChange(field.path, field.prefix === 'J-' ? `${field.prefix}${e.target.value}` : e.target.value)}
                            onKeyDown={handleEnterNext}
                            placeholder={field.placeholder}
                            inputMode={field.numeric ? 'numeric' : undefined}
                            pattern={field.numeric ? '[0-9]*' : undefined}
                            required
                          />
                        </div>
                      ) : null}

                      {!field.prefix && field.type !== 'select' ? (
                        <input
                          id={field.path}
                          data-path={field.path}
                          type="text"
                          value={getValueByPath(settings, field.path)}
                          onChange={(e) => handleChange(field.path, e.target.value)}
                          onKeyDown={handleEnterNext}
                          placeholder={field.placeholder}
                          required
                        />
                      ) : null}

                      {RANGE_FIELDS.has(field.path) ? (
                        <small className="admin-prefixed-input-hint">
                          Valor final: {formatRangeWithPrefix(getValueByPath(settings, field.path))}
                        </small>
                      ) : null}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="admin-invoice-actions">
              <button type="button" onClick={handleRestoreDefaults}>
                Restaurar valores base
              </button>
              <button type="submit">Guardar configuracion</button>
            </div>
          </form>
        </div>

        <div className="admin-users-card">
          <h3>Vista previa dinamica</h3>
          <p>Se actualiza en tiempo real mientras escribes en el formulario.</p>

          <FiscalInvoiceDetail
            invoice={previewInvoice}
            showPrint={false}
            showToolbar={false}
          />
        </div>
      </section>
    </div>
  )
}
