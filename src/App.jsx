import React, { useState, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Landing from './components/landing/Landing'
import Admin from './components/admin/Admin'
import Catalog from './components/catalog/Catalog'
import ProductDetail from './components/product/ProductDetail'
import LoginAdmin from './components/admin/LoginAdmin'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import AdminUsers from './components/admin/AdminUsers'
import AdminInvoiceSettings from './components/admin/AdminInvoiceSettings'
import AdminOrders from './components/admin/AdminOrders'
import AdminCoupons from './components/admin/AdminCoupons'
import LoadingSpinner from './components/ui/LoadingSpinner'
import TangramLoader from './components/tangram/TangramLoader'
import { AdminProvider } from './hooks/useAdminMode'
import { useTheme } from './hooks/useTheme'
import { ShopProvider } from './hooks/useShop'
import AuthPage from './components/shop/AuthPage'
import CartPage from './components/shop/CartPage'
import CheckoutPaymentPage from './components/shop/CheckoutPaymentPage'
import FiscalInvoicePage from './components/shop/FiscalInvoicePage'
import MyInvoicesPage from './components/shop/MyInvoicesPage'
import './styles/index.css'

const LOADING_DURATION = 5000

function AppRoutes() {
  const { themeSettings, setThemeSettings, activeMode, setActiveMode } = useTheme()
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), LOADING_DURATION)
    return () => clearTimeout(timer)
  }, [])

  if (showLoader) {
    return <TangramLoader />
  }

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
        <Route
          path="/admin/factura"
          element={<AdminInvoiceSettings activeMode={activeMode} onModeChange={setActiveMode} />}
        />
        <Route
          path="/admin/pedidos"
          element={<AdminOrders activeMode={activeMode} onModeChange={setActiveMode} />}
        />
        <Route
          path="/admin/cupones"
          element={<AdminCoupons activeMode={activeMode} onModeChange={setActiveMode} />}
        />
      </Route>

      {/* Public pages — admin controls appear via toggle */}
      <Route path="/" element={<Landing activeMode={activeMode} onModeChange={setActiveMode} />} />
      <Route path="/catalogo" element={<Catalog activeMode={activeMode} onModeChange={setActiveMode} />} />
      <Route
        path="/producto/:id"
        element={<ProductDetail activeMode={activeMode} onModeChange={setActiveMode} />}
      />

      {/* Facturas fiscal flow */}
      <Route path="/facturas/auth" element={<AuthPage />} />
      <Route path="/facturas/carrito" element={<CartPage />} />
      <Route path="/facturas/pago" element={<CheckoutPaymentPage />} />
      <Route path="/facturas/factura" element={<FiscalInvoicePage />} />
      <Route path="/facturas/factura/:invoiceId" element={<FiscalInvoicePage />} />
      <Route path="/facturas/mis-facturas" element={<MyInvoicesPage />} />

      {/* Legacy shop aliases */}
      <Route path="/shop/auth" element={<Navigate to="/facturas/auth" replace />} />
      <Route path="/shop/carrito" element={<Navigate to="/facturas/carrito" replace />} />
      <Route path="/shop/pago" element={<Navigate to="/facturas/pago" replace />} />
      <Route path="/shop/factura" element={<Navigate to="/facturas/factura" replace />} />
      <Route path="/shop/mis-facturas" element={<Navigate to="/facturas/mis-facturas" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <ShopProvider>
          <AppRoutes />
        </ShopProvider>
      </AdminProvider>
    </BrowserRouter>
  )
}

export default App
