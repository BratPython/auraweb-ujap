import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

const LINKS = [
  { to: '/admin/catalogo', label: 'Catalogo' },
  { to: '/admin/temas', label: 'Temas' },
  { to: '/admin/usuarios', label: 'Usuarios' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error cerrando sesion admin:', error)
    } finally {
      setLoggingOut(false)
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-shell-header">
        <div className="admin-shell-title-wrap">
          <strong className="admin-shell-badge">Modo Administrador</strong>
          <span className="admin-shell-subtitle">Panel interno de gestion</span>
        </div>

        <nav className="admin-shell-nav" aria-label="Navegacion admin">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `admin-shell-link${isActive ? ' active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button className="admin-shell-logout" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Saliendo...' : 'Cerrar sesion'}
        </button>
      </header>

      <main className="admin-shell-content">
        <Outlet />
      </main>
    </div>
  )
}
