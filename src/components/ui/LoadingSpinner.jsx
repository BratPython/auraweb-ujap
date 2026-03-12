import React from 'react'

export default function LoadingSpinner({ message = 'Cargando...', fullScreen = true }) {
  if (!fullScreen) {
    return (
      <div className="loading-spinner-inline">
        <div className="spinner-ring" />
        <p className="spinner-text">{message}</p>
      </div>
    )
  }

  return (
    <div className="loading-spinner-fullscreen">
      <div className="spinner-ring" />
      <p className="spinner-text">{message}</p>
    </div>
  )
}

export function SkeletonCard({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image shimmer" />
          <div className="skeleton-bar">
            <div className="skeleton-line shimmer" style={{ width: '60%' }} />
            <div className="skeleton-line shimmer" style={{ width: '30%' }} />
          </div>
        </div>
      ))}
    </>
  )
}

export function SkeletonDetail() {
  return (
    <div className="skeleton-detail">
      <div className="skeleton-detail-image shimmer" />
      <div className="skeleton-detail-info">
        <div className="skeleton-line shimmer" style={{ width: '70%', height: 28 }} />
        <div className="skeleton-line shimmer" style={{ width: '40%', height: 20, marginTop: 16 }} />
        <div className="skeleton-line shimmer" style={{ width: '100%', height: 14, marginTop: 24 }} />
        <div className="skeleton-line shimmer" style={{ width: '90%', height: 14, marginTop: 8 }} />
        <div className="skeleton-line shimmer" style={{ width: '80%', height: 14, marginTop: 8 }} />
      </div>
    </div>
  )
}
