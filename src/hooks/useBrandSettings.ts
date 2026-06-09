'use client'

import { useState, useEffect } from 'react'

interface BrandSettings {
  logoPath: string
  faviconPath: string
}

const DEFAULT_BRAND: BrandSettings = {
  logoPath: '/logo.svg',
  faviconPath: '/logo.svg',
}

export function useBrandSettings() {
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setBrand({
          logoPath: data.logoPath || '/logo.svg',
          faviconPath: data.faviconPath || '/logo.svg',
        })
      })
      .catch(() => {})
  }, [])

  // Update favicon in document head
  useEffect(() => {
    if (typeof document === 'undefined') return
    const existingLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (existingLink) {
      existingLink.href = brand.faviconPath
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = brand.faviconPath
      document.head.appendChild(link)
    }
  }, [brand.faviconPath])

  return brand
}
