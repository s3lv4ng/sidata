'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useAppStore, AppView } from '@/stores/app-store'
import LoginForm from '@/components/auth/LoginForm'
import SetupWizard from '@/components/setup/SetupWizard'
import ASNHomepage from '@/components/asn/ASNHomepage'
import FormFiller from '@/components/asn/FormFiller'
import ASNProfile from '@/components/asn/ASNProfile'
import AdminLayout from '@/components/admin/AdminLayout'
import DashboardOverview from '@/components/admin/DashboardOverview'
import AdminForms from '@/components/admin/AdminForms'
import FormBuilder from '@/components/admin/FormBuilder'
import AdminASN from '@/components/admin/AdminASN'
import AdminResponses from '@/components/admin/AdminResponses'
import AdminReports from '@/components/admin/AdminReports'
import AdminAnnouncements from '@/components/admin/AdminAnnouncements'
import AdminSettings from '@/components/admin/AdminSettings'
import AdminUsers from '@/components/admin/AdminUsers'
import AdminActivityLogs from '@/components/admin/AdminActivityLogs'
import AdminMasterData from '@/components/admin/AdminMasterData'
import HelpFAQ from '@/components/shared/HelpFAQ'

function AppContent() {
  const { data: session, status } = useSession()
  const { currentView, setCurrentView, addNotification } = useAppStore()
  // Wait for initial setup check before rendering any view
  const [initDone, setInitDone] = useState(false)

  // Handle OAuth callback query params (from Google Drive OAuth2 flow)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const driveOAuthSuccess = params.get('drive_oauth_success')
    const driveOAuthError = params.get('drive_oauth_error')

    if (driveOAuthSuccess) {
      // Clean URL
      window.history.replaceState({}, '', '/')
      // Show success notification
      addNotification('Akun Google Drive berhasil dihubungkan! Upload file ASN akan otomatis tersimpan ke Google Drive.', 'success')
    }
    if (driveOAuthError) {
      console.error('Drive OAuth error:', driveOAuthError)
      window.history.replaceState({}, '', '/')
      addNotification('Gagal menghubungkan Google Drive: ' + driveOAuthError, 'error')
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (initDone) return

    // If already on setup wizard, mark init done
    if (currentView === 'setup-wizard') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitDone(true)
      return
    }

    if (session?.user) {
      const role = (session.user as any).role
      setCurrentView(role === 'ADMIN' ? 'admin-dashboard' : 'asn-home')
      setInitDone(true)
      return
    }

    // Not logged in - check setup status first
    let cancelled = false
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup')
        if (res.ok && !cancelled) {
          const data = await res.json()
          if (!data.setupCompleted) {
            setCurrentView('setup-wizard')
            setInitDone(true)
            return
          }
        }
      } catch {
        // Continue to login on error
      }
      if (!cancelled) {
        setCurrentView('login')
        setInitDone(true)
      }
    }
    checkSetup()
    return () => { cancelled = true }
  }, [status, session, currentView, setCurrentView, initDone])

  // Show setup wizard
  if (currentView === 'setup-wizard') {
    return <SetupWizard />
  }

  // Don't render anything until we know whether to show login or wizard
  if (!initDone || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginForm />
  }

  const role = (session.user as any).role

  if (role === 'ASN') {
    return <ASNViews currentView={currentView} />
  }

  return <AdminViews currentView={currentView} />
}

function ASNViews({ currentView }: { currentView: AppView }) {
  switch (currentView) {
    case 'asn-form-fill':
      return <FormFiller />
    case 'asn-profile':
      return <ASNProfile />
    case 'asn-help':
      return <HelpFAQ userRole="ASN" />
    case 'asn-home':
    default:
      return <ASNHomepage />
  }
}

function AdminViews({ currentView }: { currentView: AppView }) {
  const renderContent = () => {
    switch (currentView) {
      case 'admin-dashboard':
        return <DashboardOverview />
      case 'admin-forms':
        return <AdminForms />
      case 'admin-form-create':
      case 'admin-form-edit':
        return <FormBuilder />
      case 'admin-asn':
        return <AdminASN />
      case 'admin-responses':
        return <AdminResponses />
      case 'admin-reports':
        return <AdminReports />
      case 'admin-announcements':
        return <AdminAnnouncements />
      case 'admin-settings':
        return <AdminSettings />
      case 'admin-users':
        return <AdminUsers />
      case 'admin-activity-logs':
        return <AdminActivityLogs />
      case 'admin-master-data':
        return <AdminMasterData />
      case 'admin-help':
        return <HelpFAQ userRole="ADMIN" />
      default:
        return <DashboardOverview />
    }
  }

  return <AdminLayout>{renderContent()}</AdminLayout>
}

export default function Home() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  )
}
