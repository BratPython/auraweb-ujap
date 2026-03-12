import React from 'react'

export default function ProductEditor({
  isAdmin = false,
  editName, setEditName,
  editDesc, setEditDesc,
  editPrice, setEditPrice,
  agotado, setAgotado,
  destacado, setDestacado,
  subcategoria,
  saving,
  onSave,
}) {
  return (
    <div className="product-editor-panel">
      <h2 style={{ marginTop: 0, opacity: 0.5, fontSize: 12, textTransform: 'uppercase' }}>
        Editando Producto: {subcategoria}
      </h2>

      <div className="form-group">
        <label>Nombre del producto</label>
        <input
          className="detail-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          readOnly={!isAdmin}
        />
      </div>

      <div className="form-group">
        <label>Precio ($)</label>
        <input
          type="number"
          className="detail-input"
          value={editPrice}
          onChange={(e) => setEditPrice(e.target.value)}
          readOnly={!isAdmin}
        />
      </div>

      <div className="form-group">
        <label>Descripción</label>
        <textarea
          className="detail-input"
          rows={4}
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          readOnly={!isAdmin}
        />
      </div>

      {isAdmin ? (
        <>
          <div className="toggle-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={!!agotado}
                onChange={(e) => setAgotado(e.target.checked)}
              />
              <span>Marcar como Agotado</span>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={!!destacado}
                onChange={(e) => setDestacado(e.target.checked)}
              />
              <span>Producto Destacado (Landing)</span>
            </label>
          </div>

          <button
            className="btn btn-save-detail"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </>
      ) : null}
    </div>
  )
}
