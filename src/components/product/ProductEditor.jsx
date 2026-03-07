import React from 'react'

export default function ProductEditor({
  editName, setEditName,
  editDesc, setEditDesc,
  editPrice, setEditPrice,
  editBg, setEditBg,
  editColor, setEditColor,
  subcategoria,
  saving,
  onSave,
}) {
  return (
    <div className="product-editor-panel" style={{ backgroundColor: `${editBg}fa` }}>
      <h2 style={{ marginTop: 0, opacity: 0.5, fontSize: 12, textTransform: 'uppercase' }}>
        Editando Producto: {subcategoria}
      </h2>

      <div className="form-group">
        <label style={{ color: editColor }}>Nombre del producto</label>
        <input
          className="detail-input"
          style={{ color: editColor, borderColor: `${editColor}33` }}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label style={{ color: editColor }}>Precio ($)</label>
        <input
          type="number"
          className="detail-input"
          style={{ color: editColor, borderColor: `${editColor}33` }}
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label style={{ color: editColor }}>Descripción</label>
        <textarea
          className="detail-input"
          rows={4}
          style={{ color: editColor, borderColor: `${editColor}33` }}
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
        />
      </div>

      <div className="theme-override-box" style={{ borderColor: `${editColor}33` }}>
        <h4 style={{ marginTop: 0 }}>🎨 Tema de esta página</h4>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            Fondo:
            <input
              type="color"
              value={editBg}
              onChange={(e) => setEditBg(e.target.value)}
              style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4 }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            Texto:
            <input
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4 }}
            />
          </label>
        </div>
      </div>

      <button
        className="btn btn-save-detail"
        style={{ background: editColor, color: editBg }}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? 'Guardando...' : 'Guardar Cambios Individuales'}
      </button>
    </div>
  )
}
