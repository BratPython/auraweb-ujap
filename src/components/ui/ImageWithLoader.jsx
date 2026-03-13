import React, { useEffect, useRef, useState } from 'react'

export default function ImageWithLoader({
  src,
  alt,
  className,
  wrapperClassName,
  loading = 'lazy',
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const imgRef = useRef(null)

  useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [src])

  useEffect(() => {
    const img = imgRef.current
    if (!img || !src) return

    // If the browser already has the image cached, onLoad may not fire again.
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true)
        setErrored(false)
      } else {
        setErrored(true)
      }
    }
  }, [src])

  return (
    <div className={`image-loader-wrap ${wrapperClassName || ''} ${loaded ? 'is-loaded' : ''}`}>
      {!loaded && !errored && <span className="image-loader-spinner" aria-hidden="true" />}
      {errored && <span className="image-loader-error" aria-hidden="true">✕</span>}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  )
}
