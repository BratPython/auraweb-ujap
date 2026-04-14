import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WHATSAPP_URL } from '../../config/constants'
import { INSTAGRAM_URL } from '../../config/constants'
import { supabase } from '../../supabaseClient'
import { useAdminMode } from '../../hooks/useAdminMode'
import { useShop } from '../../hooks/useShop'
import CartSideDrawer from '../shop/CartSideDrawer'

export default function Header({ children, currentPage }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()
  const { isAdmin, adminMode, setAdminMode } = useAdminMode()
  const { currentUser, cartItems, logoutUser } = useShop()

  const cartCount = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  const navLinks = [
    { label: 'Inicio', path: '/', id: 'home' },
    { label: 'Catálogo', path: '/catalogo', id: 'catalog' },
    ...(currentUser
      ? [
          { label: 'Por pagar', path: '/facturas/carrito', id: 'facturas-cart' },
          { label: 'Pedidos', path: '/facturas/mis-facturas', id: 'facturas-orders' },
        ]
      : [{ label: 'Iniciar sesión', path: '/facturas/auth', id: 'facturas-auth' }]),
    { label: 'WhatsApp', href: WHATSAPP_URL, id: 'whatsapp' },
    { label: 'Instagram', href: INSTAGRAM_URL, id: 'instagram' },
  ]

  async function handleAdminLogout() {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      setAdminMode(false)
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Error cerrando sesion de admin:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <>
      {isAdmin ? (
        <div className="admin-quickbar" role="region" aria-label="Accesos de administrador">
          <div className="admin-quickbar-left">
            <strong>Admin</strong>
            <label className="admin-toggle-switch">
              <input
                type="checkbox"
                checked={adminMode}
                onChange={(e) => setAdminMode(e.target.checked)}
              />
              <span className="admin-toggle-slider" />
              <span className="admin-toggle-label">{adminMode ? 'Edición ON' : 'Edición OFF'}</span>
            </label>
          </div>
          <div className="admin-quickbar-actions">
            <button type="button" onClick={() => navigate('/admin/temas')}>Temas</button>
            <button type="button" onClick={() => navigate('/admin/usuarios')}>Usuarios</button>
            <button type="button" onClick={() => navigate('/admin/factura')}>Factura</button>
            <button type="button" onClick={() => navigate('/admin/pedidos')}>Pedidos</button>
            <button type="button" onClick={() => navigate('/admin/cupones')}>Cupones</button>
            <button type="button" className="danger" onClick={handleAdminLogout} disabled={loggingOut}>
              {loggingOut ? 'Saliendo...' : 'Salir'}
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={`nav-overlay${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <header className="site-header">
        <div className="header-left">
          <div className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>aura</div>
          <nav className="nav-desktop">
            {navLinks.map((link) =>
              link.href ? (
                <a key={link.id} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ) : (
                <a
                  key={link.id}
                  className={currentPage === link.id ? 'nav-link-btn' : ''}
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </a>
              )
            )}
          </nav>
        </div>
        {/* End of .header-left */}

        {children}

        {currentUser ? (
          <button
            type="button"
            className="session-cart-btn"
            onClick={() => setCartOpen(true)}
            aria-label="Abrir carrito"
            title="Abrir carrito"
          >
            <span>Carrito</span>
            <strong>{cartCount}</strong>
          </button>
        ) : null}

        {currentUser ? (
          <button
            type="button"
            className="session-logout-btn"
            onClick={logoutUser}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            Salir
          </button>
        ) : null}

        <button
          className={`hamburger${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>

        <nav className={`nav-mobile${menuOpen ? ' open' : ''}`}>
          {navLinks.map((link) =>
            link.href ? (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ) : (
              <a
                key={link.id}
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setMenuOpen(false)
                  navigate(link.path)
                }}
              >
                {link.label}
              </a>
            )
          )}
        </nav>
      </header>

      <CartSideDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
