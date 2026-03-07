import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './components/landing/Landing'
import Admin from './components/admin/Admin'
import Catalog from './components/catalog/Catalog'
import ProductDetail from './components/product/ProductDetail'
import LoadingSpinner from './components/ui/LoadingSpinner'
import { useTheme } from './hooks/useTheme'
import './styles/index.css'

function App() {
  const { themeSettings, setThemeSettings, activeMode, setActiveMode } = useTheme()

  if (!themeSettings) {
    return <LoadingSpinner message="Cargando tema..." />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin themeSettings={themeSettings} setThemeSettings={setThemeSettings} />} />
        <Route path="/" element={<Landing activeMode={activeMode} onModeChange={setActiveMode} />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
