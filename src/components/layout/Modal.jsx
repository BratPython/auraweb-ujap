import React from 'react'

export default function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {children}
      </div>
    </div>
  )
}
