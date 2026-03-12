import React, { useRef } from 'react'

export default function ProductGallery({ images, isAdmin = false, uploadingImage, onAddImage, onDeleteImage, hideMainImage = false }) {
  const fileInputRef = useRef(null)

  return (
    <div className="product-gallery">
      {!hideMainImage && (
        <div className="main-image">
          {images && images.length > 0 ? (
            <img src={images[0]} alt="Producto principal" />
          ) : (
            <div className="placeholder-detail">🖼️ Sin Foto</div>
          )}
        </div>
      )}

      <div className="thumbnail-strip">
        {images?.map((imgUrl, i) => (
          <div key={i} className="thumb-container">
            <img src={imgUrl} alt={`Thumbnail ${i}`} />
            {isAdmin && i > 0 && (
              <button className="del-thumb-btn" onClick={() => onDeleteImage(i)}>✕</button>
            )}
          </div>
        ))}

        {isAdmin ? (
          <>
            <div className="add-thumb-btn" onClick={() => fileInputRef.current?.click()}>
              {uploadingImage ? '⏳' : '+'}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onAddImage(file)
                e.target.value = null
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
