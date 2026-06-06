'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useAppStore, AppView } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardList,
  BarChart3,
  Megaphone,
  Settings,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  Bell,
  History,
  Moon,
  Sun,
} from 'lucide-react'

interface MenuItem {
  label: string
  icon: React.ElementType
  view: AppView
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'admin-dashboard' },
  { label: 'Manajemen Form', icon: FileText, view: 'admin-forms' },
  { label: 'Data ASN', icon: Users, view: 'admin-asn' },
  { label: 'Hasil Pengisian', icon: ClipboardList, view: 'admin-responses' },
  { label: 'Laporan', icon: BarChart3, view: 'admin-reports' },
  { label: 'Pengumuman', icon: Megaphone, view: 'admin-announcements' },
  { label: 'Pengaturan Sistem', icon: Settings, view: 'admin-settings' },
  { label: 'Manajemen User', icon: UserCog, view: 'admin-users' },
  { label: 'Log Aktivitas', icon: History, view: 'admin-activity-logs' },
]

function getViewLabel(view: AppView): string {
  const item = menuItems.find((m) => m.view === view)
  return item?.label || 'Dashboard'
}

interface RecentActivity {
  id: string
  action: string
  details: string | null
  createdAt: string
  user: { name: string; nip: string; role: string }
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  CREATE_FORM: 'Buat Form',
  UPDATE_FORM: 'Ubah Form',
  DELETE_FORM: 'Hapus Form',
  SUBMIT_RESPONSE: 'Kirim Respon',
  UPDATE_RESPONSE: 'Ubah Respon',
  CREATE_ASN: 'Tambah ASN',
  UPDATE_ASN: 'Ubah ASN',
  DELETE_ASN: 'Hapus ASN',
  CREATE_ANNOUNCEMENT: 'Buat Pengumuman',
  UPDATE_ANNOUNCEMENT: 'Ubah Pengumuman',
  DELETE_ANNOUNCEMENT: 'Hapus Pengumuman',
  SEED_DATABASE: 'Seed Database',
}

function getActionBadgeClasses(action: string): string {
  if (action === 'LOGIN') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (action.startsWith('CREATE_')) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (action.startsWith('UPDATE_')) return 'bg-amber-100 text-amber-800 border-amber-200'
  if (action.startsWith('DELETE_')) return 'bg-red-100 text-red-800 border-red-200'
  if (action === 'SEED_DATABASE') return 'bg-violet-100 text-violet-800 border-violet-200'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return `${diffSeconds} detik lalu`
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 30) return `${diffDays} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useAppStore()

  const userName = session?.user?.name || 'Administrator'
  const userRole = (session?.user as any)?.role || 'ADMIN'
  const userNip = (session?.user as any)?.nip || ''

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return saved === 'dark' || (!saved && prefersDark)
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    document.documentElement.classList.toggle('dark', newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }

  // Notification bell state
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [hasUnread, setHasUnread] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)

  const fetchRecentActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activity-logs?limit=5')
      if (res.ok) {
        const data = await res.json()
        const activities: RecentActivity[] = data.logs || []
        setRecentActivities(activities)
        // Check for activities newer than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        setHasUnread(activities.some((a) => new Date(a.createdAt) > oneHourAgo))
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    const loadActivities = async () => {
      await fetchRecentActivities()
    }
    loadActivities()
    const interval = setInterval(() => { loadActivities() }, 60000) // Refresh every 60s
    return () => clearInterval(interval)
  }, [fetchRecentActivities])

  // Close sidebar on mobile when view changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarOpen])

  const handleMenuClick = (view: AppView) => {
    setCurrentView(view)
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    setCurrentView('login')
  }

  // Build breadcrumb
  const breadcrumbItems = [
    { label: 'Admin', view: 'admin-dashboard' as AppView },
    { label: getViewLabel(currentView), view: currentView },
  ]

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-[272px] bg-[oklch(0.22_0.06_250)] text-white transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-[72px]'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <img
              src="/logo.svg"
              alt="Logo BKAD"
              className="w-7 h-7 object-contain brightness-0 invert"
            />
          </div>
          <div
            className={`overflow-hidden transition-all duration-200 ${
              sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 lg:w-0 lg:opacity-0'
            }`}
          >
            <h1 className="text-base font-bold tracking-wide whitespace-nowrap">SIDATA BKAD</h1>
            <p className="text-[10px] text-white/50 whitespace-nowrap">Kabupaten Seruyan</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-white/60 hover:text-white p-1"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="px-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = currentView === item.view
              const Icon = item.icon

              return (
                <button
                  key={item.view}
                  onClick={() => handleMenuClick(item.view)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                    isActive
                      ? 'bg-[oklch(0.30_0.07_250)] text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:bg-white before:rounded-r-full'
                      : 'text-white/65 hover:bg-[oklch(0.27_0.065_250)] hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'
                    }`}
                  />
                  <span
                    className={`whitespace-nowrap transition-all duration-200 ${
                      sidebarOpen
                        ? 'opacity-100 w-auto'
                        : 'opacity-0 w-0 overflow-hidden lg:opacity-0 lg:w-0'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && sidebarOpen && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                  )}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        {/* User info & Logout */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="w-9 h-9 shrink-0 border-2 border-white/20">
              <AvatarFallback className="bg-white/10 text-white text-xs font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={`flex-1 min-w-0 transition-all duration-200 ${
                sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden lg:opacity-0 lg:w-0'
              }`}
            >
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-[10px] text-white/40 truncate">
                {userRole === 'ADMIN' ? 'Administrator' : 'ASN'}{userNip ? ` · ${userNip}` : ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={`w-full text-white/60 hover:text-white hover:bg-white/10 mt-1 ${
              sidebarOpen ? 'justify-start gap-2' : 'justify-center lg:justify-center'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span
              className={`transition-all duration-200 ${
                sidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden lg:opacity-0 lg:w-0'
              }`}
            >
              Keluar
            </span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center px-4 sm:px-6 gap-4">
          {/* Hamburger / toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
            <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {breadcrumbItems.map((item, index) => (
              <span key={index} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                <span
                  className={`truncate ${
                    index === breadcrumbItems.length - 1
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </span>
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-3">
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={darkMode ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            >
              <span className="relative w-5 h-5">
                <Sun className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
                <Moon className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
              </span>
            </Button>

            {/* Notification Bell */}
            <Popover open={bellOpen} onOpenChange={setBellOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground hover:text-foreground">
                  <Bell className="w-5 h-5" />
                  {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="px-4 py-3 border-b">
                  <h3 className="font-semibold text-sm">Notifikasi Aktivitas</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Aktivitas terbaru di sistem</p>
                </div>
                <ScrollArea className="max-h-[320px]">
                  {recentActivities.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada aktivitas terbaru
                    </div>
                  ) : (
                    <div className="divide-y">
                      {recentActivities.map((activity) => (
                        <div key={activity.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-2">
                            <Badge
                              className={`text-[10px] font-medium border shrink-0 mt-0.5 ${getActionBadgeClasses(activity.action)}`}
                              variant="outline"
                            >
                              {ACTION_LABELS[activity.action] || activity.action}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{activity.user?.name || '-'}</p>
                              {activity.details && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.details}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {formatTimeAgo(activity.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => {
                      setBellOpen(false)
                      setCurrentView('admin-activity-logs')
                    }}
                  >
                    Lihat Semua
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Page title (visible on larger screens) */}
            <h2 className="text-base font-bold text-foreground hidden md:block truncate">
              {getViewLabel(currentView)}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="shrink-0 border-t bg-white/50 backdrop-blur-sm px-4 sm:px-6 py-3">
          <p className="text-[11px] text-muted-foreground text-center">
            &copy; 2025 BKAD Kabupaten Seruyan &middot; Sistem Pengumpulan Data ASN
          </p>
        </footer>
      </div>
    </div>
  )
}
