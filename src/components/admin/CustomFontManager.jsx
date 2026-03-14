import React, { useRef } from 'react'

export default function CustomFontManager({ customFonts, uploadingFont, fontUploadStatus, onUpload, onRemove }) {
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(file)
    }
    e.target.value = ''
  }

  return (
    <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'rgba(128,128,128,.08)' }}>
      <h5 style={{ margin: '0 0 8px 0' }}>Fuentes personalizadas</h5>
      <button className="btn-upload" onClick={() => fileInputRef.current?.click()} disabled={uploadingFont}>
        {uploadingFont ? 'Subiendo...' : 'Subir fuente local (.ttf, .otf, .woff)'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,.woff"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {uploadingFont ? (
        <div className="status-modal-overlay">
          <div className="status-modal-card">
            <div className="uploading-state" style={{ padding: '8px 8px 2px' }}>
              <div className="spinner"></div>
              <h2>Cargando tipografia...</h2>
              <p>Por favor no cierres esta ventana.</p>
            </div>
          </div>
        </div>
      ) : null}

      {fontUploadStatus && !uploadingFont ? (
        <div className="status-modal-overlay">
          <div className={`status-modal-card ${fontUploadStatus.type}`}>
            <div className="status-icon">
              {fontUploadStatus.type === 'success' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p>{fontUploadStatus.message}</p>
          </div>
        </div>
      ) : null}

      {customFonts.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {customFonts.map((f) => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: 6,
                background: 'rgba(0,0,0,.04)',
                marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: f.name }}>{f.name}</span>
              <button className="btn-sm btn-sm-danger" onClick={() => onRemove(f.name)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
