import React, { useState, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'

function createCroppedFile(imageSrc, pixelCrop, originalFileName) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height

      ctx.drawImage(
        img,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      )

      canvas.toBlob((blob) => {
        const ext = originalFileName.split('.').pop() || 'png'
        const name = originalFileName.replace(/\.[^.]+$/, `_recortada.${ext}`)
        const croppedFile = new File([blob], name, { type: blob.type || 'image/png' })
        resolve(croppedFile)
      }, 'image/png')
    }
    img.src = imageSrc
  })
}

export default function ImageCropperModal({ imageSrc, fileName, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [processing, setProcessing] = useState(false)
  const previewCanvasRef = useRef(null)

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
    if (croppedAreaPixels) {
      setWidth(Math.round(croppedAreaPixels.width).toString())
      setHeight(Math.round(croppedAreaPixels.height).toString())
    }

    const previewCanvas = previewCanvasRef.current
    if (previewCanvas && croppedAreaPixels) {
      const img = new Image()
      img.onload = () => {
        const ctx = previewCanvas.getContext('2d')
        previewCanvas.width = croppedAreaPixels.width
        previewCanvas.height = croppedAreaPixels.height
        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        )
      }
      img.src = imageSrc
    }
  }, [imageSrc])

  function handleWidthChange(val) {
    setWidth(val)
    const w = parseInt(val, 10)
    if (!isNaN(w) && w > 0 && croppedAreaPixels) {
      setCroppedAreaPixels((prev) => ({ ...prev, width: w }))
    }
  }

  function handleHeightChange(val) {
    setHeight(val)
    const h = parseInt(val, 10)
    if (!isNaN(h) && h > 0 && croppedAreaPixels) {
      setCroppedAreaPixels((prev) => ({ ...prev, height: h }))
    }
  }

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    const croppedFile = await createCroppedFile(imageSrc, croppedAreaPixels, fileName)
    onConfirm(croppedFile)
  }

  return (
    <div className="cropper-modal-overlay">
      <div className="cropper-modal">
        <div className="cropper-header">
          <h2>Recortar Imagen</h2>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="cropper-body">
          <div className="cropper-area">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="cropper-sidebar">
            <div className="cropper-preview-section">
              <label>Vista Previa</label>
              <div className="cropper-preview-circle">
                <canvas ref={previewCanvasRef} className="cropper-preview-canvas" />
              </div>
            </div>

            <div className="cropper-dims-section">
              <label>Dimensiones del Recorte (px)</label>
              <div className="cropper-dims-row">
                <div className="cropper-dim">
                  <span>Ancho</span>
                  <input
                    type="number"
                    min="1"
                    value={width}
                    onChange={(e) => handleWidthChange(e.target.value)}
                  />
                </div>
                <div className="cropper-dim-sep">×</div>
                <div className="cropper-dim">
                  <span>Alto</span>
                  <input
                    type="number"
                    min="1"
                    value={height}
                    onChange={(e) => handleHeightChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="cropper-zoom-section">
              <label>Zoom</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="cropper-zoom-slider"
              />
            </div>
          </div>
        </div>

        <div className="cropper-footer">
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? 'Procesando...' : 'Confirmar Recorte'}
          </button>
        </div>
      </div>
    </div>
  )
}
