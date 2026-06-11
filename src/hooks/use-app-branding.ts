'use client'

import { useSyncExternalStore, useCallback } from 'react'

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
let lastFetchTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache TTL

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

// Map settings data to branding object
function mapSettingsToBranding(data: Record<string, string>): AppBranding {
  return {
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
}

// Fetch branding from API
function fetchBranding(): Promise<AppBranding> {
  return fetch('/api/settings')
    .then((res) => res.ok ? res.json() : {})
    .then((data) => mapSettingsToBranding(data))
}

// Ensure branding is fetched (auto-fetch on first use or when cache expires)
function ensureBrandingFetched() {
  if (cachedBranding && Date.now() - lastFetchTime < CACHE_TTL) return
  if (fetchPromise) return

  fetchPromise = fetchBranding()
    .then((branding) => {
      cachedBranding = branding
      lastFetchTime = Date.now()
      fetchPromise = null
      emitChange()
    })
    .catch(() => {
      if (!cachedBranding) {
        cachedBranding = DEFAULT_BRANDING
      }
      fetchPromise = null
      emitChange()
    })
}

/**
 * Force refresh the branding cache from the server.
 * Call this after updating settings (e.g., logo upload).
 */
export function refreshBranding(): Promise<void> {
  // Clear cache and refetch
  cachedBranding = null
  lastFetchTime = 0
  fetchPromise = null

  return new Promise((resolve) => {
    fetchPromise = fetchBranding()
      .then((branding) => {
        cachedBranding = branding
        lastFetchTime = Date.now()
        fetchPromise = null
        emitChange()
        resolve()
      })
      .catch(() => {
        cachedBranding = DEFAULT_BRANDING
        fetchPromise = null
        emitChange()
        resolve()
      })
  })
}

export function useAppBranding(): AppBranding {
  ensureBrandingFetched()
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Hook that provides a function to refresh branding.
 * Useful after settings changes like logo upload.
 */
export function useRefreshBranding() {
  return useCallback(() => refreshBranding(), [])
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
