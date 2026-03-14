import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './components/landing/Landing'
import Admin from './components/admin/Admin'
import Catalog from './components/catalog/Catalog'
import ProductDetail from './components/product/ProductDetail'
import LoginAdmin from './components/admin/LoginAdmin'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import AdminUsers from './components/admin/AdminUsers'
import LoadingSpinner from './components/ui/LoadingSpinner'
import { AdminProvider } from './hooks/useAdminMode'
import { useTheme } from './hooks/useTheme'
import './styles/index.css'

function AppRoutes() {
  const { themeSettings, setThemeSettings, activeMode, setActiveMode } = useTheme()

  if (!themeSettings) {
    return <LoadingSpinner message="Cargando tema..." />
  }

  return (
    <Routes>
      <Route path="/login-admin" element={<LoginAdmin />} />

      {/* Protected admin-only pages (temas, usuarios) */}
      <Route element={<AdminProtectedRoute />}>
        <Route
          path="/admin/temas"
          element={
            <Admin
              themeSettings={themeSettings}
              setThemeSettings={setThemeSettings}
              activeMode={activeMode}
              onModeChange={setActiveMode}
            />
          }
        />
        <Route
          path="/admin/usuarios"
          element={<AdminUsers activeMode={activeMode} onModeChange={setActiveMode} />}
        />
      </Route>

      {/* Public pages — admin controls appear via toggle */}
      <Route path="/" element={<Landing activeMode={activeMode} onModeChange={setActiveMode} />} />
      <Route path="/catalogo" element={<Catalog activeMode={activeMode} onModeChange={setActiveMode} />} />
      <Route
        path="/producto/:id"
        element={<ProductDetail activeMode={activeMode} onModeChange={setActiveMode} />}
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <AppRoutes />
      </AdminProvider>
    </BrowserRouter>
  )
}

export default App
