import React from 'react'

export default function LoadingSpinner({ message = 'Cargando...' }) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f6f0e6',
      color: '#2b2318',
      fontFamily: 'sans-serif',
    }}>
      <p>{message}</p>
    </div>
  )
}
