'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { useAppBranding, useDynamicFavicon } from '@/hooks/use-app-branding'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
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
  Download,
  User,
  Building2,
  Award,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Globe,
  Timer,
  ListChecks,
  Moon,
  Sun,
  KeyRound,
  HelpCircle,
  Pencil,
} from 'lucide-react'
import jsPDF from 'jspdf'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ASNMobileNav from './ASNMobileNav'
import ChangePasswordDialog from '@/components/shared/ChangePasswordDialog'

interface Announcement {
  id: string
  title: string
  content: string
  isPinned: boolean
  isActive: boolean
  createdAt: string
  createdBy: { id: string; name: string }
}

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  options: string | null
  order: number
}

interface FormItem {
  id: string
  title: string
  description: string | null
  isActive: boolean
  isClosed: boolean
  deadline: string | null
  createdAt: string
  fields?: FormField[]
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

function getDeadlineCountdown(deadline: string): { text: string; urgent: boolean } {
  const now = Date.now()
  const end = new Date(deadline).getTime()
  const diff = end - now

  if (diff <= 0) {
    return { text: 'Sudah lewat', urgent: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 7) {
    return { text: `${days} hari lagi`, urgent: false }
  } else if (days > 0) {
    return { text: `${days} hari lagi`, urgent: true }
  } else if (hours > 0) {
    return { text: `${hours} jam lagi`, urgent: true }
  } else {
    return { text: `${minutes} menit lagi`, urgent: true }
  }
}

export default function ASNHomepage() {
  const { data: session } = useSession()
  const { setCurrentView, setSelectedForm } = useAppStore()
  const { logo, appName, appShortName, instansiName, daerah, instansiEmail, instansiPhone, instansiAddress } = useAppBranding()
  useDynamicFavicon()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [forms, setForms] = useState<FormItem[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [loadingForms, setLoadingForms] = useState(true)
  const [downloadingProof, setDownloadingProof] = useState<string | null>(null)

  // Change password dialog
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  // Edit profile dialog
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editForm, setEditForm] = useState({ email: '', phone: '', jabatan: '', pangkat: '', unitKerja: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)
  const [editError, setEditError] = useState('')

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

  const userId = (session?.user as any)?.id || ''

  useEffect(() => {
    fetchAnnouncements()
    fetchForms()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true)
      const res = await fetch('/api/announcements?isActive=true&isHidden=false')
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

  const handleDownloadProof = async (form: FormItem) => {
    try {
      setDownloadingProof(form.id)
      const res = await fetch(`/api/forms/${form.id}?userId=${userId}`)
      if (!res.ok) throw new Error('Gagal mengambil data form')
      const formData = await res.json()

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Header
      doc.setFillColor(30, 64, 175)
      doc.rect(0, 0, pageWidth, 35, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('BUKTI PENGISIAN FORM', pageWidth / 2, 15, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistem Pengumpulan Data ASN - BKAD Kabupaten Seruyan', pageWidth / 2, 23, { align: 'center' })
      doc.setFontSize(9)
      doc.text(`No. Dokumen: BUKTI-${form.id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, 30, { align: 'center' })

      // Form title
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(form.title, 14, 45)
      if (form.description) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(100, 100, 100)
        doc.text(form.description, 14, 51, { maxWidth: pageWidth - 28 })
      }

      // User info section
      const userInfoY = form.description ? 60 : 56
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Informasi Pegawai', 14, userInfoY)
      doc.setDrawColor(30, 64, 175)
      doc.setLineWidth(0.5)
      doc.line(14, userInfoY + 2, 80, userInfoY + 2)

      const userInfo = [
        ['Nama', session?.user?.name || '-'],
        ['NIP', (session?.user as any)?.nip || '-'],
        ['Jabatan', (session?.user as any)?.jabatan || '-'],
        ['Bidang', (session?.user as any)?.bidang || '-'],
        ['Pangkat', (session?.user as any)?.pangkat || '-'],
      ]

      doc.setFontSize(9)
      let currentY = userInfoY + 8
      userInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 80, 80)
        doc.text(`${label}:`, 18, currentY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(value, 50, currentY)
        currentY += 6
      })

      // Submission info
      currentY += 4
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Informasi Pengisian', 14, currentY)
      doc.setDrawColor(30, 64, 175)
      doc.line(14, currentY + 2, 80, currentY + 2)
      currentY += 8

      doc.setFontSize(9)
      if (formData.responses && formData.responses.length > 0) {
        const resp = formData.responses[0]
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 80, 80)
        doc.text('Tanggal Pengisian:', 18, currentY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text(formatDateTime(resp.submittedAt), 60, currentY)
        currentY += 6
      }

      // Form fields summary
      currentY += 4
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Ringkasan Isian Form', 14, currentY)
      doc.setDrawColor(30, 64, 175)
      doc.line(14, currentY + 2, 80, currentY + 2)
      currentY += 8

      if (formData.responses && formData.responses.length > 0 && formData.responses[0].fields) {
        const fields = formData.responses[0].fields
        const formFields = formData.fields || []

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 80, 80)
        doc.text('No.', 14, currentY)
        doc.text('Pertanyaan', 24, currentY)
        doc.text('Jawaban', 110, currentY)
        doc.setDrawColor(200, 200, 200)
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2)
        currentY += 6

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)

        fields.forEach((field: any, index: number) => {
          if (currentY > 270) {
            doc.addPage()
            currentY = 20
          }

          const formField = formFields.find((f: any) => f.id === field.fieldId)
          const label = formField?.label || `Pertanyaan ${index + 1}`
          const value = field.value || '-'

          doc.setTextColor(80, 80, 80)
          doc.text(`${index + 1}.`, 14, currentY)
          doc.text(label, 24, currentY, { maxWidth: 82 })
          doc.setTextColor(0, 0, 0)

          const lines = doc.splitTextToSize(value, 76)
          lines.forEach((line: string, lineIdx: number) => {
            if (currentY > 270) {
              doc.addPage()
              currentY = 20
            }
            doc.text(line, 110, currentY)
            if (lineIdx < lines.length - 1) currentY += 4
          })

          currentY += 6
        })
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 25
      doc.setDrawColor(30, 64, 175)
      doc.setLineWidth(0.3)
      doc.line(14, footerY, pageWidth - 14, footerY)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(120, 120, 120)
      doc.text('BKAD Kabupaten Seruyan - Dokumen ini digenerate otomatis', 14, footerY + 5)
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, footerY + 9)
      doc.text('Badan Keuangan dan Aset Daerah Kabupaten Seruyan, Kalimantan Tengah', pageWidth - 14, footerY + 5, { align: 'right' })

      doc.save(`Bukti_Pengisian_${form.title.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('Failed to generate proof:', err)
    } finally {
      setDownloadingProof(null)
    }
  }

  const userName = session?.user?.name || 'ASN'
  const userNip = (session?.user as any)?.nip || ''
  const userJabatan = (session?.user as any)?.jabatan || ''
  const userBidang = (session?.user as any)?.bidang || ''
  const userPangkat = (session?.user as any)?.pangkat || ''
  const userUnitKerja = (session?.user as any)?.unitKerja || ''
  const userEmail = (session?.user as any)?.email || ''
  const userPhone = (session?.user as any)?.phone || ''

  const handleEditProfile = () => {
    setEditForm({
      email: userEmail,
      phone: userPhone,
      jabatan: userJabatan,
      pangkat: userPangkat,
      unitKerja: userUnitKerja,
    })
    setEditSuccess(false)
    setEditError('')
    setEditProfileOpen(true)
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setEditError('')
    try {
      const res = await fetch(`/api/asn/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditSuccess(true)
        setTimeout(() => {
          setEditProfileOpen(false)
          window.location.reload()
        }, 1500)
      } else {
        const data = await res.json()
        setEditError(data.error || 'Gagal menyimpan data')
      }
    } catch {
      setEditError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSavingProfile(false)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Group forms by status for counts
  const formCounts = {
    belum: forms.filter((f) => getFormStatus(f, userId) === 'belum').length,
    sudah: forms.filter((f) => getFormStatus(f, userId) === 'sudah').length,
    ditutup: forms.filter((f) => getFormStatus(f, userId) === 'ditutup').length,
  }

  const totalActiveForms = forms.filter((f) => getFormStatus(f, userId) !== 'ditutup').length
  const progressPercent = totalActiveForms > 0 ? Math.round((formCounts.sudah / totalActiveForms) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-gov-green/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-1.5">
              <img
                src={logo}
                alt="Logo BKAD"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-primary leading-tight">{appShortName || 'SIDATA'}</h1>
              <p className="text-xs text-muted-foreground">{instansiName || 'Instansi'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground">NIP: {userNip}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm sm:hidden">
              {userName.charAt(0).toUpperCase()}
            </div>
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="shrink-0 text-muted-foreground hover:text-foreground h-8 w-8"
              aria-label={darkMode ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            >
              <span className="relative w-4 h-4">
                <Sun className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`} />
                <Moon className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${darkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`} />
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('asn-help')}
              className="shrink-0 text-muted-foreground hover:text-foreground h-8 w-8"
              aria-label="Bantuan"
              title="Bantuan & FAQ"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChangePasswordOpen(true)}
              className="text-muted-foreground hover:text-primary"
              title="Ubah Password"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Ubah Password</span>
            </Button>
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
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 pb-20 md:pb-6 space-y-6">
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

        {/* Profile Summary Card */}
        <Card className="border-primary/15 bg-gradient-to-r from-primary/5 via-background to-gov-green/5 shadow-sm transition-all duration-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-primary/20 shadow-md">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl font-bold">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-foreground">{userName}</h3>
                  {userBidang && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-xs">
                      <Building2 className="w-3 h-3 mr-1" />
                      {userBidang}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary/60" />
                    NIP: {userNip}
                  </span>
                  {userJabatan && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary/60" />
                      {userJabatan}
                    </span>
                  )}
                  {userPangkat && (
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-primary/60" />
                      {userPangkat}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditProfile}
                className="shrink-0 text-muted-foreground hover:text-primary h-8 w-8"
                aria-label="Edit Profil"
                title="Edit Data Profil"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards with progress */}
        <Card className="border-primary/10 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {formCounts.sudah} dari {totalActiveForms} form sudah diisi
                </span>
              </div>
              <span className="text-sm font-bold text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2.5" />
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-4">
              <div className="text-center p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30">
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formCounts.belum}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">Belum Diisi</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30">
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formCounts.sudah}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Sudah Diisi</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-50/80 dark:bg-muted/50">
                <p className="text-xl font-bold text-gray-600 dark:text-muted-foreground">{formCounts.ditutup}</p>
                <p className="text-xs text-gray-500 dark:text-muted-foreground/70 font-medium">Ditutup</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  const fieldCount = form.fields?.length || 0
                  const deadlineCountdown = form.deadline ? getDeadlineCountdown(form.deadline) : null

                  return (
                    <Card
                      key={form.id}
                      className={`border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${
                        status === 'ditutup'
                          ? 'opacity-60 border-muted dark:border-muted'
                          : status === 'belum'
                          ? 'border-amber-200/50 hover:border-amber-300 dark:border-amber-800/50 dark:hover:border-amber-700'
                          : 'border-emerald-200/50 hover:border-emerald-300 dark:border-emerald-800/50 dark:hover:border-emerald-700'
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
                              {/* Field count */}
                              {fieldCount > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <ListChecks className="w-3 h-3" />
                                  {fieldCount} pertanyaan
                                </span>
                              )}
                              {/* Deadline with countdown */}
                              {form.deadline && (
                                <span className="text-xs flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  <span className={deadlineCountdown?.urgent ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                    {formatDate(form.deadline)}
                                  </span>
                                  {deadlineCountdown && !deadlineCountdown.urgent && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-0.5 border-muted-foreground/30 text-muted-foreground">
                                      {deadlineCountdown.text}
                                    </Badge>
                                  )}
                                  {deadlineCountdown && deadlineCountdown.urgent && status === 'belum' && (
                                    <Badge className="text-[10px] px-1.5 py-0 ml-0.5 bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800">
                                      {deadlineCountdown.text}
                                    </Badge>
                                  )}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {form.createdBy.name}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 sm:ml-4 flex items-center gap-2">
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
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleFillForm(form)}
                                  className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                >
                                  Lihat / Ubah
                                  <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadProof(form)}
                                  disabled={downloadingProof === form.id}
                                  className="w-full sm:w-auto border-primary/30 text-primary hover:bg-primary/5"
                                >
                                  {downloadingProof === form.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span className="ml-1">Unduh Bukti</span>
                                </Button>
                              </>
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
      <footer className="border-t bg-gradient-to-b from-background/50 to-primary/5 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Institution Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground">{appShortName || 'SIDATA'}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {instansiName}{daerah ? `, ${daerah}` : ''}
              </p>
            </div>
            {/* Address */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground">Alamat</h4>
              {instansiAddress ? (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/60" />
                  <span>{instansiAddress}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic">Belum diatur</p>
              )}
            </div>
            {/* Contact */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground">Kontak</h4>
              <div className="space-y-1.5">
                {instansiPhone ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                    <span>{instansiPhone}</span>
                  </div>
                ) : null}
                {instansiEmail ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                    <span>{instansiEmail}</span>
                  </div>
                ) : null}
                {!instansiPhone && !instansiEmail && (
                  <p className="text-xs text-muted-foreground/50 italic">Belum diatur</p>
                )}
              </div>
            </div>
          </div>
          <Separator className="my-4 bg-primary/10" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {appShortName || 'SIDATA'} &middot; {instansiName || 'Instansi'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {appName || 'Sistem Informasi Data ASN'}
            </p>
          </div>
        </div>
      </footer>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        userId={userId}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Profil</DialogTitle>
            <DialogDescription>Perbarui informasi profil Anda</DialogDescription>
          </DialogHeader>

          {editSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Data profil berhasil diperbarui!</p>
              <p className="text-xs text-muted-foreground">Halaman akan dimuat ulang...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="email@contoh.com"
                    className="pl-9"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">No. Telepon</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    className="pl-9"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-jabatan">Jabatan</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="edit-jabatan"
                    type="text"
                    placeholder="Jabatan Anda"
                    className="pl-9"
                    value={editForm.jabatan}
                    onChange={(e) => setEditForm({ ...editForm, jabatan: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pangkat">Pangkat / Golongan</Label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="edit-pangkat"
                    type="text"
                    placeholder="Pangkat / Golongan"
                    className="pl-9"
                    value={editForm.pangkat}
                    onChange={(e) => setEditForm({ ...editForm, pangkat: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-unitKerja">Unit Kerja</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="edit-unitKerja"
                    type="text"
                    placeholder="Unit Kerja Anda"
                    className="pl-9"
                    value={editForm.unitKerja}
                    onChange={(e) => setEditForm({ ...editForm, unitKerja: e.target.value })}
                  />
                </div>
              </div>

              {editError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {editError}
                </div>
              )}

              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                Untuk perubahan Nama, NIP, dan Bidang, hubungi administrator.
              </p>
            </div>
          )}

          {!editSuccess && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditProfileOpen(false)}
                disabled={savingProfile}
              >
                Batal
              </Button>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile bottom navigation */}
      <ASNMobileNav activeTab="beranda" />
    </div>
  )
}
