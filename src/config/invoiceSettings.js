export const INVOICE_SETTINGS_KEY = 'aura:invoiceSettings'

export const NOMENCLATURE_DATE_FORMATS = [
  { value: 'YYYYMMDDXXXX', label: 'YYYYMMDDXXXX' },
  { value: 'DDMMYYYYXXXX', label: 'DDMMYYYYXXXX' },
  { value: 'MMDDYYYYXXXX', label: 'MMDDYYYYXXXX' },
]

export const DEFAULT_INVOICE_SETTINGS = {
  issuer: {
    razonSocial: 'Aura Web C.A.',
    rif: 'J-',
    domicilio: 'Av. Principal de Valencia, Edo. Carabobo, Venezuela',
    telefono: '',
    email: '',
  },
  controlFiscal: {
    tituloFactura: 'FACTURA',
    rangoMin: '00000001',
    rangoMax: '99999999',
  },
  printer: {
    razonSocial: 'Imprenta Fiscal Demo 2026, C.A.',
    rif: 'J-',
    nomenclaturaFormatoFactura: 'YYYYMMDDXXXX',
    nomenclaturaFormatoControl: 'YYYYMMDDXXXX',
    providencia: 'SNAT/2026/00077',
    fechaAsignacion: '12032026',
    serialFiscal: '',
  },
}

function clean(value) {
  return String(value ?? '').trim()
}

function normalizeRif(value) {
  const raw = clean(value).toUpperCase().replace(/\s+/g, '')
  const withoutPrefix = raw.startsWith('J-') ? raw.slice(2) : raw.replace(/^J/, '')
  return `J-${withoutPrefix.replace(/[^0-9A-Z-]/g, '')}`
}

function normalizeRangeDigits(value, fallback) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8)
  return digits || fallback
}

function parseLegacyRange(rawRange) {
  const text = clean(rawRange)
  const matches = [...text.matchAll(/F-(\d{1,8})/g)].map((m) => m[1])
  return {
    min: matches[0] || '',
    max: matches[1] || '',
  }
}

function formatNomenclatureDate(date, format) {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = String(date.getFullYear())

  const baseFormat = String(format || '').replace(/XXXX$/, '')

  switch (baseFormat) {
    case 'DDMMYYYY':
      return `${d}${m}${y}`
    case 'MMDDYYYY':
      return `${m}${d}${y}`
    case 'YYYYMMDD':
    default:
      return `${y}${m}${d}`
  }
}

function randomDigits(length) {
  let result = ''
  for (let i = 0; i < length; i += 1) {
    result += Math.floor(Math.random() * 10)
  }
  return result
}

function normalizeNomenclatureFormat(value, fallback) {
  const raw = clean(value)
  const legacyMap = {
    'YYYY-MM-DD-XXXX': 'YYYYMMDDXXXX',
    'DD-MM-YYYY-XXXX': 'DDMMYYYYXXXX',
    'MM-DD-YYYY-XXXX': 'MMDDYYYYXXXX',
    'YYYYMMDD-XXXX': 'YYYYMMDDXXXX',
    'DDMMYYYY-XXXX': 'DDMMYYYYXXXX',
  }

  const normalizedRaw = legacyMap[raw] || raw
  const isAllowed = NOMENCLATURE_DATE_FORMATS.some((item) => item.value === normalizedRaw)
  return isAllowed ? normalizedRaw : fallback
}

export function buildNomenclature({ date = new Date(), dateFormat = 'YYYYMMDDXXXX', randomTail } = {}) {
  const safeDateFormat = normalizeNomenclatureFormat(dateFormat, 'YYYYMMDDXXXX')
  const tail = String(randomTail ?? randomDigits(4)).replace(/\D/g, '').slice(0, 4).padStart(4, '0')
  return `${formatNomenclatureDate(date, safeDateFormat)}${tail}`
}

function normalizeSettings(raw = {}) {
  const legacyRange = parseLegacyRange(raw?.controlFiscal?.rangoAsignado)

  return {
    issuer: {
      razonSocial: clean(raw?.issuer?.razonSocial) || DEFAULT_INVOICE_SETTINGS.issuer.razonSocial,
      rif: normalizeRif(raw?.issuer?.rif || DEFAULT_INVOICE_SETTINGS.issuer.rif),
      domicilio: clean(raw?.issuer?.domicilio) || DEFAULT_INVOICE_SETTINGS.issuer.domicilio,
      telefono: clean(raw?.issuer?.telefono),
      email: clean(raw?.issuer?.email),
    },
    controlFiscal: {
      tituloFactura: clean(raw?.controlFiscal?.tituloFactura) || DEFAULT_INVOICE_SETTINGS.controlFiscal.tituloFactura,
      rangoMin: normalizeRangeDigits(
        raw?.controlFiscal?.rangoMin || legacyRange.min,
        DEFAULT_INVOICE_SETTINGS.controlFiscal.rangoMin
      ),
      rangoMax: normalizeRangeDigits(
        raw?.controlFiscal?.rangoMax || legacyRange.max,
        DEFAULT_INVOICE_SETTINGS.controlFiscal.rangoMax
      ),
    },
    printer: {
      razonSocial: clean(raw?.printer?.razonSocial) || DEFAULT_INVOICE_SETTINGS.printer.razonSocial,
      rif: normalizeRif(raw?.printer?.rif || DEFAULT_INVOICE_SETTINGS.printer.rif),
      nomenclaturaFormatoFactura: normalizeNomenclatureFormat(
        raw?.printer?.nomenclaturaFormatoFactura || raw?.printer?.nomenclaturaFormatoFecha,
        DEFAULT_INVOICE_SETTINGS.printer.nomenclaturaFormatoFactura
      ),
      nomenclaturaFormatoControl: normalizeNomenclatureFormat(
        raw?.printer?.nomenclaturaFormatoControl || raw?.printer?.nomenclaturaFormatoFecha,
        DEFAULT_INVOICE_SETTINGS.printer.nomenclaturaFormatoControl
      ),
      providencia: clean(raw?.printer?.providencia) || DEFAULT_INVOICE_SETTINGS.printer.providencia,
      fechaAsignacion: clean(raw?.printer?.fechaAsignacion) || DEFAULT_INVOICE_SETTINGS.printer.fechaAsignacion,
      serialFiscal: clean(raw?.printer?.serialFiscal),
    },
  }
}

export function loadInvoiceSettings() {
  try {
    const raw = localStorage.getItem(INVOICE_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_INVOICE_SETTINGS }
    const parsed = JSON.parse(raw)
    return normalizeSettings(parsed)
  } catch {
    return { ...DEFAULT_INVOICE_SETTINGS }
  }
}

export function saveInvoiceSettings(nextSettings) {
  const normalized = normalizeSettings(nextSettings)
  try {
    localStorage.setItem(INVOICE_SETTINGS_KEY, JSON.stringify(normalized))
  } catch {
    // Ignore storage failures.
  }
  return normalized
}
