import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function AdminProtectedRoute() {
  const [status, setStatus] = useState('checking')
  const location = useLocation()

  useEffect(() => {
    let mounted = true

    async function checkAdminAccess() {
      try {
        // 1. Verificamos si hay un usuario logueado
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          if (mounted) setStatus('unauthenticated')
          return
        }

        // 2. Le preguntamos directamente a la tabla 'perfiles' su rol
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        if (perfilError) {
          console.error('Error leyendo la tabla perfiles:', perfilError.message)
          if (mounted) setStatus('unauthorized')
          return
        }

        // 3. Decidimos su destino según el rol exacto
        if (perfil.rol === 'admin') {
          if (mounted) setStatus('allowed')
        } else {
          if (mounted) setStatus('unauthorized')
        }

      } catch (error) {
        console.error('Error crítico en la validación:', error)
        if (mounted) setStatus('unauthenticated')
      }
    }

    checkAdminAccess()

    // 4. Mantenemos el componente atento si el usuario cierra sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) setStatus('unauthenticated')
      } else if (session) {
        checkAdminAccess()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (status === 'checking') {
    return <LoadingSpinner message="Validando credenciales..." />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login-admin" replace state={{ from: location.pathname }} />
  }

  if (status === 'unauthorized') {
    return <Navigate to="/" replace />
  }

  // Si todo está perfecto, mostramos las rutas de administrador
  return <Outlet />
}