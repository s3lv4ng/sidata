'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LogOut,
  FileText,
  Megaphone,
  Clock,
  ChevronRight,
  Pin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ClipboardList,
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  isPinned: boolean
  isActive: boolean
  createdAt: string
  createdBy: { id: string; name: string }
}

interface FormItem {
  id: string
  title: string
  description: string | null
  isActive: boolean
  isClosed: boolean
  deadline: string | null
  createdAt: string
  responses: Array<{ id: string; submittedAt: string }>
  createdBy: { id: string; name: string; nip: string }
}

type FormStatus = 'belum' | 'sudah' | 'ditutup'

function getFormStatus(form: FormItem, userId: string): FormStatus {
  if (form.isClosed || (form.deadline && new Date(form.deadline) < new Date())) {
    return 'ditutup'
  }
  if (form.responses && form.responses.length > 0) {
    return 'sudah'
  }
  return 'belum'
}

function getStatusBadge(status: FormStatus) {
  switch (status) {
    case 'belum':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          <Clock className="w-3 h-3 mr-1" />
          Belum Diisi
        </Badge>
      )
    case 'sudah':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Sudah Diisi
        </Badge>
      )
    case 'ditutup':
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">
          <XCircle className="w-3 h-3 mr-1" />
          Ditutup
        </Badge>
      )
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ASNHomepage() {
  const { data: session } = useSession()
  const { setCurrentView, setSelectedForm } = useAppStore()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [forms, setForms] = useState<FormItem[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [loadingForms, setLoadingForms] = useState(true)

  const userId = (session?.user as any)?.id || ''

  useEffect(() => {
    fetchAnnouncements()
    fetchForms()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true)
      const res = await fetch('/api/announcements?isActive=true')
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data)
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
    } finally {
      setLoadingAnnouncements(false)
    }
  }

  const fetchForms = async () => {
    try {
      setLoadingForms(true)
      const res = await fetch(`/api/forms?isActive=true&userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setForms(data)
      }
    } catch (err) {
      console.error('Failed to fetch forms:', err)
    } finally {
      setLoadingForms(false)
    }
  }

  const handleFillForm = (form: FormItem) => {
    setSelectedForm(form.id, form.title)
    setCurrentView('asn-form-fill')
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    setCurrentView('login')
  }

  const userName = session?.user?.name || 'ASN'
  const userNip = (session?.user as any)?.nip || ''

  // Group forms by status for counts
  const formCounts = {
    belum: forms.filter((f) => getFormStatus(f, userId) === 'belum').length,
    sudah: forms.filter((f) => getFormStatus(f, userId) === 'sudah').length,
    ditutup: forms.filter((f) => getFormStatus(f, userId) === 'ditutup').length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-gov-green/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-1.5">
              <img
                src="/logo.svg"
                alt="Logo BKAD"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-primary leading-tight">SIDATA</h1>
              <p className="text-xs text-muted-foreground">BKAD Kab. Seruyan</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground">NIP: {userNip}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm sm:hidden">
              {userName.charAt(0).toUpperCase()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Selamat Datang, {userName.split(' ')[0]}! 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pantau dan isi formulir pengumpulan data ASN Anda
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-amber-100/30">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-700">{formCounts.belum}</p>
              <p className="text-xs text-amber-600 font-medium">Belum Diisi</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formCounts.sudah}</p>
              <p className="text-xs text-emerald-600 font-medium">Sudah Diisi</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200/50 bg-gradient-to-br from-gray-50/50 to-gray-100/30">
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-2xl font-bold text-gray-600">{formCounts.ditutup}</p>
              <p className="text-xs text-gray-500 font-medium">Ditutup</p>
            </CardContent>
          </Card>
        </div>

        {/* Announcements */}
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Pengumuman</CardTitle>
                <CardDescription className="text-xs">Informasi terbaru dari BKAD</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAnnouncements ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Memuat pengumuman...</span>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada pengumuman</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {announcements.map((announcement, index) => (
                    <div key={announcement.id}>
                      {index > 0 && <Separator className="mb-3" />}
                      <div className="flex items-start gap-3">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-primary mt-0.5 shrink-0 fill-primary" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            {announcement.title}
                            {announcement.isPinned && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Penting
                              </Badge>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {announcement.content}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDateTime(announcement.createdAt)} &middot; {announcement.createdBy.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Active Forms */}
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gov-green/10 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-gov-green" />
                </div>
                <div>
                  <CardTitle className="text-base">Formulir Aktif</CardTitle>
                  <CardDescription className="text-xs">Formulir yang perlu Anda isi</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {forms.length} formulir
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingForms ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Memuat formulir...</span>
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">Belum ada formulir aktif</p>
                <p className="text-xs mt-1">Formulir baru akan muncul saat tersedia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => {
                  const status = getFormStatus(form, userId)
                  const isDeadlineSoon =
                    form.deadline &&
                    !form.isClosed &&
                    status === 'belum' &&
                    new Date(form.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
                  const isPastDeadline =
                    form.deadline && new Date(form.deadline) < new Date()

                  return (
                    <Card
                      key={form.id}
                      className={`border transition-all hover:shadow-md ${
                        status === 'ditutup'
                          ? 'opacity-60 border-gray-200'
                          : status === 'belum'
                          ? 'border-amber-200/50 hover:border-amber-300'
                          : 'border-emerald-200/50 hover:border-emerald-300'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground">
                                {form.title}
                              </h3>
                              {getStatusBadge(status)}
                            </div>
                            {form.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {form.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {form.deadline && (
                                <span
                                  className={`text-xs flex items-center gap-1 ${
                                    isPastDeadline
                                      ? 'text-gray-400'
                                      : isDeadlineSoon
                                      ? 'text-amber-600 font-medium'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  Deadline: {formatDate(form.deadline)}
                                  {isDeadlineSoon && !isPastDeadline && (
                                    <span className="text-amber-600 font-semibold">(Segera!)</span>
                                  )}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {form.createdBy.name}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 sm:ml-4">
                            {status === 'belum' ? (
                              <Button
                                size="sm"
                                onClick={() => handleFillForm(form)}
                                className="w-full sm:w-auto"
                              >
                                Isi Form
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            ) : status === 'sudah' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFillForm(form)}
                                className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              >
                                Lihat / Ubah
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" disabled className="w-full sm:w-auto">
                                Ditutup
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 BKAD Kabupaten Seruyan &middot; Badan Keuangan dan Aset Daerah
          </p>
        </div>
      </footer>
    </div>
  )
}
