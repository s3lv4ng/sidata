'use client'

import { useSyncExternalStore } from 'react'

interface AppBranding {
  logo: string
  favicon: string
  appName: string
  appShortName: string
  instansiName: string
  daerah: string
  instansiEmail: string
  instansiPhone: string
  instansiAddress: string
}

const DEFAULT_BRANDING: AppBranding = {
  logo: '/logo.svg',
  favicon: '/logo.svg',
  appName: 'SIDATA BKAD',
  appShortName: 'SIDATA',
  instansiName: 'Badan Keuangan dan Aset Daerah',
  daerah: 'Kabupaten Seruyan, Kalimantan Tengah',
  instansiEmail: '',
  instansiPhone: '',
  instansiAddress: '',
}

// Cache branding in memory
let cachedBranding: AppBranding | null = null
let fetchPromise: Promise<AppBranding> | null = null
let listeners: Set<() => void> = new Set()

function emitChange() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): AppBranding {
  return cachedBranding || DEFAULT_BRANDING
}

function getServerSnapshot(): AppBranding {
  return DEFAULT_BRANDING
}

// Fetch branding once on first use
function ensureBrandingFetched() {
  if (cachedBranding || fetchPromise) return

  fetchPromise = fetch('/api/settings')
    .then((res) => res.ok ? res.json() : {})
    .then((data) => {
      cachedBranding = {
        logo: data.appLogo || '/logo.svg',
        favicon: data.appFavicon || '/logo.svg',
        appName: data.appName || 'SIDATA BKAD',
        appShortName: data.appShortName || 'SIDATA',
        instansiName: data.instansiName || data.instansi || DEFAULT_BRANDING.instansiName,
        daerah: data.daerah || DEFAULT_BRANDING.daerah,
        instansiEmail: data.instansiEmail || data.email_instansi || '',
        instansiPhone: data.instansiPhone || data.telepon_instansi || '',
        instansiAddress: data.instansiAddress || data.alamat_instansi || '',
      }
      fetchPromise = null
      emitChange()
    })
    .catch(() => {
      cachedBranding = DEFAULT_BRANDING
      fetchPromise = null
      emitChange()
    })
}

export function useAppBranding(): AppBranding {
  ensureBrandingFetched()
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useDynamicFavicon() {
  const { favicon } = useAppBranding()

  // Update favicon link element
  if (typeof document !== 'undefined') {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (link && link.href !== favicon) {
      link.href = favicon
    }
  }
}
