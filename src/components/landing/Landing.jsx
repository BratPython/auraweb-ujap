import React from 'react'
import Header from '../layout/Header'
import Footer from '../layout/Footer'
import ThemeSelector from '../ui/ThemeSelector'
import HeroSection from './HeroSection'
import DiscoverSection from './DiscoverSection'
import ServicesSection from './ServicesSection'
import CatalogCta from './CatalogCta'

export default function Landing({ activeMode, onModeChange }) {
  return (
    <main className="page">
      <Header currentPage="home">
        <ThemeSelector activeMode={activeMode} onModeChange={onModeChange} />
      </Header>

      <HeroSection />
      <DiscoverSection />
      <CatalogCta />
      <ServicesSection />
      <Footer />
    </main>
  )
}
