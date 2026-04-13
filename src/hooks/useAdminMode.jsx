import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { resolveIsAdmin } from '../utils/adminAuth'

const AdminContext = createContext({
  isAdmin: false,
  adminMode: false,
  setAdminMode: () => {},
})

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminMode, setAdminMode] = useState(false)

  useEffect(() => {
    let mounted = true

    async function check(session) {
      if (!session?.user) {
        if (mounted) { setIsAdmin(false); setAdminMode(false) }
        return
      }
      try {
        const ok = await resolveIsAdmin(session.user)
        if (mounted) {
          setIsAdmin(ok)
          if (!ok) setAdminMode(false)
        }
      } catch {
        if (mounted) { setIsAdmin(false); setAdminMode(false) }
      }
    }

    supabase.auth.getSession().then(({ data }) => check(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      // Keep callback sync to avoid auth lock deadlocks.
      setTimeout(() => {
        void check(session)
      }, 0)
    })

    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  return (
    <AdminContext.Provider value={{ isAdmin, adminMode, setAdminMode }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminMode() {
  return useContext(AdminContext)
}
