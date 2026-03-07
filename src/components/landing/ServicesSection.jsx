import React from 'react'

const SERVICES = [
  {
    icon: '🚚',
    text: 'Contamos con envíos a nivel nacional y servicios de pick-up delivery en las ciudades de Valencia y Caracas',
  },
  {
    icon: '🏦',
    text: 'Absolutamente todos nuestros precios estan cotizados a la tasa del banco central de venezuela',
  },
  {
    icon: '💲',
    text: 'Contamos con la posibilidad de cancelar sus sus compras en diferentes cuotas para mayor comodidad económica',
  },
]

export default function ServicesSection() {
  return (
    <section className="services" id="services">
      <h3 className="section-subtitle">Servicios</h3>
      <div className="service-list">
        {SERVICES.map((service, idx) => (
          <div key={idx} className="service">
            <div className="icon">{service.icon}</div>
            <p className="body-text">{service.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
