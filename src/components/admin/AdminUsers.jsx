import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import Header from '../layout/Header'
import ThemeSelector from '../ui/ThemeSelector'

export default function AdminUsers({ activeMode, onModeChange }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [feedback, setFeedback] = useState('')
  const [creating, setCreating] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')

  async function loadProfiles() {
    setLoading(true)
    setFeedback('')

    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, email, rol, creado_en')
        .order('creado_en', { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error cargando perfiles:', error)
      setFeedback('No se pudieron cargar los perfiles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  async function handleRoleChange(userId, nextRole) {
    setSavingId(userId)
    setFeedback('')

    try {
      const { error } = await supabase.from('perfiles').update({ rol: nextRole }).eq('id', userId)
      if (error) throw error

      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, rol: nextRole } : p)))
      setFeedback('Rol actualizado correctamente.')
    } catch (error) {
      console.error('Error actualizando rol:', error)
      setFeedback('No se pudo actualizar el rol.')
    } finally {
      setSavingId('')
    }
  }

  async function handleCreateAdmin(event) {
    event.preventDefault()
    setFeedback('')
    setCreating(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newAdminEmail,
        password: newAdminPassword,
      })

      if (error) throw error

      const newUserId = data.user?.id
      if (newUserId) {
        const { error: roleError } = await supabase
          .from('perfiles')
          .update({ rol: 'admin' })
          .eq('id', newUserId)

        if (roleError) throw roleError
      }

      setFeedback('Nuevo administrador registrado correctamente.')
      setNewAdminEmail('')
      setNewAdminPassword('')
      await loadProfiles()
    } catch (error) {
      console.error('Error registrando admin:', error)
      setFeedback(error.message || 'No se pudo registrar el nuevo administrador.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="admin-page">
      <Header currentPage="admin-usuarios">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>
      <section className="admin-users-page" style={{ padding: 20 }}>
      <div className="admin-users-card">
        <h2>Usuarios y roles</h2>
        <p>Vista interna para gestionar roles en la tabla perfiles.</p>

        {feedback ? <div className="admin-users-feedback">{feedback}</div> : null}

        {loading ? (
          <div className="catalog-loading">Cargando perfiles...</div>
        ) : (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Creado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td>{profile.email}</td>
                    <td>
                      <select
                        value={profile.rol}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                        disabled={savingId === profile.id}
                      >
                        <option value="cliente">cliente</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>{new Date(profile.creado_en).toLocaleString()}</td>
                    <td>
                      <span className="admin-users-id">{profile.id.slice(0, 8)}...</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-users-card">
        <h3>Registrar nuevo administrador</h3>
        <p>
          Crea un usuario en Auth y luego lo promueve a admin en perfiles.
        </p>

        <form className="admin-users-create-form" onSubmit={handleCreateAdmin}>
          <label htmlFor="new-admin-email">Email</label>
          <input
            id="new-admin-email"
            type="email"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            required
          />

          <label htmlFor="new-admin-password">Contraseña</label>
          <input
            id="new-admin-password"
            type="password"
            value={newAdminPassword}
            onChange={(e) => setNewAdminPassword(e.target.value)}
            minLength={6}
            required
          />

          <button type="submit" disabled={creating}>
            {creating ? 'Creando...' : 'Crear admin'}
          </button>
        </form>
      </div>
    </section>
    </div>
  )
}
