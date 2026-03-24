import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShop } from '../../hooks/useShop'
import Header from '../layout/Header'

const DOC_TYPES = ['V', 'E', 'J', 'G', 'P']

export default function AuthPage() {
  const navigate = useNavigate()
  const { registerUser, loginUser, currentUser, logoutUser } = useShop()
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    customerType: 'Natural',
    legalName: '',
    docType: 'V',
    docNumber: '',
    fiscalAddress: '',
    email: '',
    password: '',
  })

  function onLoginSubmit(e) {
    e.preventDefault()
    setError('')
    const result = loginUser(loginForm)
    if (!result.ok) setError(result.error)
  }

  function onRegisterSubmit(e) {
    e.preventDefault()
    setError('')

    if (!registerForm.legalName || !registerForm.docNumber || !registerForm.fiscalAddress) {
      setError('Completa todos los datos fiscales obligatorios.')
      return
    }

    const result = registerUser(registerForm)
    if (!result.ok) setError(result.error)
  }

  return (
    <>
      <Header currentPage="facturas-auth" />
      <div className="shop-page">
        <div className="shop-card">
          <h2>Autenticacion de Cliente</h2>

        {currentUser ? (
          <div className="shop-auth-state">
            <p>
              Sesion activa: <strong>{currentUser.legalName}</strong> ({currentUser.docType}-{currentUser.docNumber})
            </p>
            <div className="shop-actions">
              <button className="btn" onClick={() => navigate('/facturas/mis-facturas')}>Mis facturas</button>
              <button className="btn" onClick={logoutUser}>Cerrar sesion</button>
            </div>
          </div>
        ) : (
          <>
            <div className="shop-tabs">
              <button className={`btn ${mode === 'login' ? 'btn-primary' : ''}`} onClick={() => setMode('login')}>
                Iniciar Sesion
              </button>
              <button className={`btn ${mode === 'register' ? 'btn-primary' : ''}`} onClick={() => setMode('register')}>
                Registrarse
              </button>
            </div>

            {error ? <p className="shop-error">{error}</p> : null}

            {mode === 'login' ? (
              <form className="shop-form" onSubmit={onLoginSubmit}>
                <label>
                  Correo
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </label>
                <button type="submit" className="btn btn-primary">Entrar</button>
              </form>
            ) : (
              <form className="shop-form" onSubmit={onRegisterSubmit}>
                <label>
                  Tipo de cliente
                  <select
                    value={registerForm.customerType}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, customerType: e.target.value }))}
                  >
                    <option value="Natural">Natural</option>
                    <option value="Juridico">Juridico</option>
                  </select>
                </label>
                <label>
                  Nombre y Apellido / Razon Social
                  <input
                    value={registerForm.legalName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, legalName: e.target.value }))}
                    required
                  />
                </label>
                <div className="shop-row">
                  <label>
                    Tipo de documento
                    <select
                      value={registerForm.docType}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, docType: e.target.value }))}
                    >
                      {DOC_TYPES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nro Identificacion
                    <input
                      value={registerForm.docNumber}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, docNumber: e.target.value }))}
                      required
                    />
                  </label>
                </div>
                <label>
                  Domicilio fiscal
                  <textarea
                    rows={3}
                    value={registerForm.fiscalAddress}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, fiscalAddress: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Correo
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </label>
                <button type="submit" className="btn btn-primary">Crear cuenta fiscal</button>
              </form>
            )}
          </>
        )}
        </div>
      </div>
    </>
  )
}
