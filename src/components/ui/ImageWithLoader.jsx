import React, { useEffect, useState } from 'react'

export default function ImageWithLoader({
  src,
  alt,
  className,
  wrapperClassName,
  loading = 'lazy',
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setErrored(false)
  }, [src])

  return (
    <div className={`image-loader-wrap ${wrapperClassName || ''} ${loaded ? 'is-loaded' : ''}`}>
      {!loaded && !errored && <span className="image-loader-spinner" aria-hidden="true" />}
      {errored && <span className="image-loader-error" aria-hidden="true">✕</span>}
      <img
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
