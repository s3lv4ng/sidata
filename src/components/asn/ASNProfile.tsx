'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  Briefcase,
  Award,
  Building2,
  Phone,
  Mail,
  Shield,
  Edit3,
  Loader2,
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Hash,
  BarChart3,
  CalendarDays,
  Moon,
  Sun,
  KeyRound,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import ASNMobileNav from './ASNMobileNav'
import ChangePasswordDialog from '@/components/shared/ChangePasswordDialog'

interface ASNProfileData {
  id: string
  nip: string
  name: string
  role: string
  email: string | null
  phone: string | null
  jabatan: string | null
  pangkat: string | null
  unitKerja: string | null
  bidang: string | null
  statusASN: string | null
  isActive: boolean
  createdAt: string
}

interface FormSubmission {
  id: string
  formTitle: string
  submittedAt: string
  formDeadline: string | null
  formIsActive: boolean
  formIsClosed: boolean
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

export default function ASNProfile() {
  const { data: session } = useSession()
  const { setCurrentView } = useAppStore()

  const [profile, setProfile] = useState<ASNProfileData | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

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
    if (userId) {
      fetchProfile()
      fetchSubmissions()
    }
  }, [userId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/asn/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setEditEmail(data.email || '')
        setEditPhone(data.phone || '')
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/forms?isActive=true&userId=${userId}`)
      if (res.ok) {
        const forms = await res.json()
        const subs: FormSubmission[] = []
        for (const form of forms) {
          if (form.responses && form.responses.length > 0) {
            subs.push({
              id: form.responses[0].id,
              formTitle: form.title,
              submittedAt: form.responses[0].submittedAt,
              formDeadline: form.deadline,
              formIsActive: form.isActive,
              formIsClosed: form.isClosed,
            })
          }
        }
        // Sort by most recent first
        subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        setSubmissions(subs)
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/asn/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail,
          phone: editPhone,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setProfile(updated)
        setEditDialogOpen(false)
        toast.success('Profil berhasil diperbarui')
      } else {
        toast.error('Gagal memperbarui profil')
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast.error('Gagal memperbarui profil')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Stats
  const totalSubmissions = submissions.length
  const activeSubmissions = submissions.filter(s => s.formIsActive && !s.formIsClosed).length

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-gov-green/5">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Memuat profil...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-gov-green/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('asn-home')}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Kembali ke beranda"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="bg-primary/10 rounded-lg p-1.5">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary leading-tight">Profil ASN</h1>
              <p className="text-xs text-muted-foreground">Data diri & riwayat pengisian</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 pb-20 md:pb-6 space-y-6">
        {/* Profile Header Card */}
        <Card className="border-primary/15 bg-gradient-to-r from-primary/5 via-white dark:via-card to-gov-green/5 shadow-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <Avatar className="w-20 h-20 border-3 border-primary/20 shadow-lg">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {profile ? getInitials(profile.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">{profile?.name || '—'}</h2>
                  {profile?.statusASN && (
                    <Badge className={`text-xs ${profile.statusASN === 'PNS' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {profile.statusASN}
                    </Badge>
                  )}
                  {profile?.bidang && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-xs">
                      <Building2 className="w-3 h-3 mr-1" />
                      {profile.bidang}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-primary/60" />
                    NIP: {profile?.nip || '—'}
                  </span>
                  {profile?.jabatan && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-primary/60" />
                      {profile.jabatan}
                    </span>
                  )}
                </div>
                {profile?.pangkat && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Award className="w-3.5 h-3.5 text-primary/60" />
                    {profile.pangkat}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="gap-2 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profil
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Personal Information */}
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Informasi Pribadi</CardTitle>
                  <CardDescription className="text-xs">Data identitas dan kontak ASN</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ProfileField icon={User} label="Nama Lengkap" value={profile?.name} />
                <ProfileField icon={Hash} label="NIP" value={profile?.nip} mono />
                <ProfileField icon={Briefcase} label="Jabatan" value={profile?.jabatan} />
                <ProfileField icon={Award} label="Pangkat / Golongan" value={profile?.pangkat} />
                <ProfileField icon={Building2} label="Unit Kerja" value={profile?.unitKerja} />
                <ProfileField icon={Building2} label="Bidang" value={profile?.bidang} />
                <ProfileField icon={Shield} label="Status ASN" value={profile?.statusASN} />
                <ProfileField icon={CalendarDays} label="Tanggal Registrasi" value={profile?.createdAt ? formatDate(profile.createdAt) : null} />
                <ProfileField icon={Mail} label="Email" value={profile?.email} editable />
                <ProfileField icon={Phone} label="No HP" value={profile?.phone} editable />
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Statistik</CardTitle>
                  <CardDescription className="text-xs">Ringkasan aktivitas Anda</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-4">
              <div className="space-y-3">
                <StatItem
                  icon={FileText}
                  label="Total Form Diisi"
                  value={totalSubmissions}
                  color="blue"
                />
                <StatItem
                  icon={CheckCircle2}
                  label="Form Aktif Diisi"
                  value={activeSubmissions}
                  color="green"
                />
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium">Tingkat Partisipasi</span>
                    <span className="text-xs font-bold text-primary">
                      {submissions.length > 0 ? 'Aktif' : 'Belum ada'}
                    </span>
                  </div>
                  <Progress
                    value={totalSubmissions > 0 ? Math.min((activeSubmissions / Math.max(totalSubmissions, 1)) * 100, 100) : 0}
                    className="h-2"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {activeSubmissions} dari {totalSubmissions} form aktif telah diisi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission History */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Riwayat Pengisian Form</CardTitle>
                  <CardDescription className="text-xs">Semua form yang telah Anda isi</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {submissions.length} data
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <FileText className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">Belum ada riwayat pengisian</p>
                <p className="text-xs mt-1">Formulir yang Anda isi akan muncul di sini</p>
              </div>
            ) : (
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead className="min-w-[200px]">Nama Form</TableHead>
                      <TableHead className="w-[180px]">Tanggal Pengisian</TableHead>
                      <TableHead className="w-[120px]">Status Form</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub, index) => {
                      const isFormActive = sub.formIsActive && !sub.formIsClosed
                      const isDeadlinePassed = sub.formDeadline && new Date(sub.formDeadline) < new Date()
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="text-center text-muted-foreground text-sm">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-foreground">{sub.formTitle}</p>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground">{formatDateTime(sub.submittedAt)}</span>
                          </TableCell>
                          <TableCell>
                            {isFormActive && !isDeadlinePassed ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[10px]">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Aktif
                              </Badge>
                            ) : isDeadlinePassed ? (
                              <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 text-[10px]">
                                <XCircle className="w-3 h-3 mr-1" />
                                Berakhir
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[10px]">
                                <Clock className="w-3 h-3 mr-1" />
                                Ditutup
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-b from-white/50 dark:from-card/50 to-primary/5 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} BKAD Kabupaten Seruyan &middot; Sistem Informasi Data ASN
          </p>
        </div>
      </footer>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              Edit Profil
            </DialogTitle>
            <DialogDescription className="text-sm">
              Perbarui informasi kontak Anda. Data lainnya hanya dapat diubah oleh administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-sm font-medium">
                No HP
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-xs text-amber-700">
                <strong>Catatan:</strong> Hanya Email dan No HP yang dapat diubah. Untuk perubahan data lainnya (Nama, NIP, Jabatan, dll.), silakan hubungi administrator.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Edit3 className="w-4 h-4" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        userId={userId}
      />

      {/* Mobile bottom navigation */}
      <ASNMobileNav activeTab="profil" />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ProfileField({
  icon: Icon,
  label,
  value,
  mono = false,
  editable = false,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  mono?: boolean
  editable?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-md bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
        <p className={`text-sm text-foreground ${mono ? 'font-mono' : 'font-medium'} truncate ${editable ? 'text-primary' : ''}`}>
          {value || '—'}
          {editable && value && (
            <span className="text-[10px] text-muted-foreground ml-1">(dapat diubah)</span>
          )}
        </p>
      </div>
    </div>
  )
}

function StatItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'blue' | 'green' | 'amber'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  const iconColorMap = {
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        <Icon className={`w-4 h-4 ${iconColorMap[color]}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
