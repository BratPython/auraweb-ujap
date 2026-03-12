import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function LoginAdmin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const nextPath = location.state?.from?.startsWith('/admin') ? location.state.from : '/catalogo'

  useEffect(() => {
    let mounted = true

    async function validateExistingAdminSession() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData.session?.user

        if (!user) {
          if (mounted) setCheckingSession(false)
          return
        }

        // --- CONSULTA DIRECTA A LA TABLA PERFILES ---
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', user.id)
          .single()

        if (perfil?.rol === 'admin') {
          if (mounted) setIsAuthenticated(true)
        }
      } catch (error) {
        console.warn('No se pudo validar sesion admin existente:', error)
      } finally {
        if (mounted) setCheckingSession(false)
      }
    }

    validateExistingAdminSession()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      // 1. Intentamos iniciar sesión con Supabase Auth
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error('Credenciales incorrectas.')

      const user = authData.user
      if (!user?.id) throw new Error('No se pudo recuperar la sesión del usuario.')

      // 2. --- VERIFICAMOS EL ROL DIRECTAMENTE EN LA BD ---
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single()

      if (perfilError || perfil?.rol !== 'admin') {
        console.log("🕵️‍♂️ ID DEL USUARIO:", user.id);
      console.log("🕵️‍♂️ RESPUESTA DE SUPABASE (PERFIL):", perfil);
      console.log("🕵️‍♂️ ERROR DE SUPABASE:", perfilError);
        // Si no es admin, lo sacamos a patadas (cerramos la sesión que acaba de abrir)
        await supabase.auth.signOut()
        throw new Error('Acceso denegado: Esta cuenta no tiene rango de administrador.')
      }

      // Si pasa todo, le damos la bienvenida
      setIsAuthenticated(true)
      navigate(nextPath, { replace: true })
    } catch (error) {
      setErrorMsg(error.message || 'No se pudo iniciar sesion.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <p>Verificando sesión...</p>
        </section>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={nextPath} replace />
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <h1>Acceso Administrador</h1>
        <p>Ruta privada de acceso. Solo personal autorizado.</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="admin-password">Contraseña</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && <div className="admin-login-error" style={{ color: 'red', marginTop: '10px' }}>{errorMsg}</div>}

          <button type="submit" disabled={loading} style={{ marginTop: '15px' }}>
            {loading ? 'Ingresando...' : 'Entrar como admin'}
          </button>
        </form>
      </section>
    </main>
  )
}