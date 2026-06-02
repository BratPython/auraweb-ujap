import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getWebpUrl } from '../../utils/imageOptimizer'

export default function ImageWithLoader({
  src,
  alt,
  className,
  wrapperClassName,
  loading = 'lazy',
  noWebp = false,
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const imgRef = useRef(null)

  const displaySrc = useMemo(() => {
    if (noWebp) return src
    return getWebpUrl(src)
  }, [src, noWebp])

  useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [displaySrc])

  useEffect(() => {
    const img = imgRef.current
    if (!img || !displaySrc) return

    if (img.complete) {
      if (img.naturalWidth > 0) {
        setLoaded(true)
        setErrored(false)
      } else {
        setErrored(true)
      }
    }
  }, [displaySrc])

  return (
    <div className={`image-loader-wrap ${wrapperClassName || ''} ${loaded ? 'is-loaded' : ''}`}>
      {!loaded && !errored && <span className="image-loader-spinner" aria-hidden="true" />}
      {errored && <span className="image-loader-error" aria-hidden="true">✕</span>}
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        className={className}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </div>
  )
}
