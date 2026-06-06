'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useAppStore, AppView } from '@/stores/app-store'
import LoginForm from '@/components/auth/LoginForm'
import ASNHomepage from '@/components/asn/ASNHomepage'
import FormFiller from '@/components/asn/FormFiller'
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

function AppContent() {
  const { data: session, status } = useSession()
  const { currentView, setCurrentView } = useAppStore()

  useEffect(() => {
    if (status === 'loading') return
    if (session?.user) {
      const role = (session.user as any).role
      if (currentView === 'login') {
        setCurrentView(role === 'ADMIN' ? 'admin-dashboard' : 'asn-home')
      }
    } else {
      setCurrentView('login')
    }
  }, [session, status, currentView, setCurrentView])

  if (status === 'loading') {
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
