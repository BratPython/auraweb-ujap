import React from 'react'

export default function ProductEditor({
  isAdmin = false,
  editName, setEditName,
  editDesc, setEditDesc,
  editPrice, setEditPrice,
  editDiscount, setEditDiscount,
  editStock, setEditStock,
  agotado, setAgotado,
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
        <label>Descuento (%)</label>
        <input
          type="number"
          min="0"
          max="99"
          className="detail-input"
          value={editDiscount}
          onChange={(e) => setEditDiscount(e.target.value)}
          readOnly={!isAdmin}
        />
      </div>

      <div className="form-group">
        <label>Stock disponible</label>
        <input
          type="number"
          min="0"
          className="detail-input"
          value={editStock}
          onChange={(e) => setEditStock(e.target.value)}
          readOnly={!isAdmin}
        />
      </div>

      <div className="form-group">
        <label>Descripción</label>
        <textarea
          className="detail-input detail-textarea"
          rows={3}
          maxLength={75}
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          readOnly={!isAdmin}
        />
      </div>

      {isAdmin ? (
        <>
          <div className="toggle-group">
            <div className="toggle-item">
              <span className="toggle-label-text">Estado del stock</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!!agotado}
                  onChange={(e) => setAgotado(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className={`toggle-state ${agotado ? 'is-off' : 'is-on'}`}>
                {agotado ? 'Agotado' : 'Disponible'}
              </span>
            </div>
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
