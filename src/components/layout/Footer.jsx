import React from 'react'
import { useNavigate } from 'react-router-dom'
import { WHATSAPP_URL, INSTAGRAM_URL } from '../../config/constants'

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer className="site-footer" id="contact">
      <div className="footer-col">
        <strong className="footer-title">Información</strong>
        <span className="footer-text">
          Todos nuestros precios<br />
          se rigen por la tasa oficial<br />
          del BCV. Realizamos<br />
          entregas personales en<br />
          Valencia y Caracas.
        </span>
      </div>

      <div className="footer-col">
        <strong className="footer-title">Contacto</strong>
        <span className="footer-text">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            WhatsApp: 0424-4405113
          </a><br />
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            Instagram: @theaura.a
          </a><br />
          Horario<br />
          Lun - Vie: 8:00am - 6:00pm<br />
          Sab: 10:00am - 3:00pm<br />
          Dom: Cerrado
        </span>
      </div>

      <div className="footer-col">
        <strong className="footer-title">Enlaces</strong>
        <span className="footer-text">
          <a onClick={() => navigate('/catalogo')} style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}>
            Ver catálogo completo
          </a><br />
          Cómo comprar<br />
          FaQ
        </span>
      </div>
    </footer>
  )
}
