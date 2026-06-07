'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles,
  Building2,
  UserCog,
  Shield,
  Cloud,
  Database,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Type,
  Hash,
  Mail,
  Phone,
  MapPin,
  Key,
  FolderOpen,
  Table2,
  FileText,
  Eye,
  EyeOff,
  Plus,
  X,
  HardDrive,
  Rocket,
  PartyPopper,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type WizardStep = 'welcome' | 'app-identity' | 'admin-account' | 'login-methods' | 'google-integration' | 'master-data' | 'complete'

const STEPS: { key: WizardStep; label: string; icon: any; description: string }[] = [
  { key: 'welcome', label: 'Selamat Datang', icon: Sparkles, description: 'Pengenalan aplikasi' },
  { key: 'app-identity', label: 'Identitas Aplikasi', icon: Building2, description: 'Nama & instansi' },
  { key: 'admin-account', label: 'Akun Admin', icon: UserCog, description: 'Buat akun administrator' },
  { key: 'login-methods', label: 'Metode Login', icon: Shield, description: 'Konfigurasi login' },
  { key: 'google-integration', label: 'Integrasi Google', icon: Cloud, description: 'Drive & Sheets' },
  { key: 'master-data', label: 'Data Master', icon: Database, description: 'Bidang & Status ASN' },
  { key: 'complete', label: 'Selesai', icon: Rocket, description: 'Konfigurasi selesai' },
]

export default function SetupWizard() {
  const { setCurrentView } = useAppStore()
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // App Identity
  const [appName, setAppName] = useState('Sistem Pengumpulan Data ASN')
  const [appShortName, setAppShortName] = useState('SIDATA BKAD')
  const [instansiName, setInstansiName] = useState('Badan Keuangan dan Aset Daerah')
  const [daerah, setDaerah] = useState('Kabupaten Seruyan')
  const [instansiEmail, setInstansiEmail] = useState('')
  const [instansiPhone, setInstansiPhone] = useState('')
  const [instansiAddress, setInstansiAddress] = useState('')

  // Admin Account
  const [adminNip, setAdminNip] = useState('admin')
  const [adminName, setAdminName] = useState('Administrator BKAD')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  // Login Methods
  const [loginWithNip, setLoginWithNip] = useState(true)
  const [loginWithGoogle, setLoginWithGoogle] = useState(false)
  const [showPasswordLogin, setShowPasswordLogin] = useState(true)
  const [googleLoginClientId, setGoogleLoginClientId] = useState('')
  const [googleLoginClientSecret, setGoogleLoginClientSecret] = useState('')
  const [showGoogleClientSecret, setShowGoogleClientSecret] = useState(false)

  // Google Integration
  const [googleDriveClientEmail, setGoogleDriveClientEmail] = useState('')
  const [googleDrivePrivateKey, setGoogleDrivePrivateKey] = useState('')
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState('')
  const [googleSheetsApiKey, setGoogleSheetsApiKey] = useState('')
  const [googleSheetsSpreadsheetId, setGoogleSheetsSpreadsheetId] = useState('')
  const [googleSheetsSheetName, setGoogleSheetsSheetName] = useState('Sheet1')
  const [skipGoogleIntegration, setSkipGoogleIntegration] = useState(false)

  // Master Data
  const [bidangList, setBidangList] = useState<string[]>(['Pendapatan', 'Belanja', 'Aset', 'Umum'])
  const [statusList, setStatusList] = useState<string[]>(['PNS', 'PPPK', 'PPNPN', 'Kontrak'])
  const [newBidang, setNewBidang] = useState('')
  const [newStatus, setNewStatus] = useState('')

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep)
  const progressPercent = ((currentStepIndex + 1) / STEPS.length) * 100

  // Fetch existing settings on mount
  useEffect(() => {
    const fetchSetupStatus = async () => {
      try {
        const res = await fetch('/api/setup')
        if (res.ok) {
          const data = await res.json()
          if (data.setupCompleted) {
            setCurrentView('login')
            return
          }
          if (data.existingSettings) {
            const s = data.existingSettings
            if (s.appName) setAppName(s.appName)
            if (s.appShortName) setAppShortName(s.appShortName)
            if (s.instansiName) setInstansiName(s.instansiName)
            if (s.daerah) setDaerah(s.daerah)
            if (s.instansiEmail) setInstansiEmail(s.instansiEmail)
            if (s.instansiPhone) setInstansiPhone(s.instansiPhone)
            if (s.instansiAddress) setInstansiAddress(s.instansiAddress)
            if (s.loginWithNip) setLoginWithNip(s.loginWithNip !== 'false')
            if (s.loginWithGoogle) setLoginWithGoogle(s.loginWithGoogle === 'true')
            if (s.showPasswordLogin) setShowPasswordLogin(s.showPasswordLogin !== 'false')
            if (s.googleLoginClientId) setGoogleLoginClientId(s.googleLoginClientId)
            if (s.googleLoginClientSecret) setGoogleLoginClientSecret(s.googleLoginClientSecret)
            if (s.googleDriveClientEmail) setGoogleDriveClientEmail(s.googleDriveClientEmail)
            if (s.googleDriveFolderId) setGoogleDriveFolderId(s.googleDriveFolderId)
            if (s.googleSheetsApiKey) setGoogleSheetsApiKey(s.googleSheetsApiKey)
            if (s.googleSheetsSpreadsheetId) setGoogleSheetsSpreadsheetId(s.googleSheetsSpreadsheetId)
            if (s.googleSheetsSheetName) setGoogleSheetsSheetName(s.googleSheetsSheetName)
          }
        }
      } catch {
        // Continue with defaults
      }
    }
    fetchSetupStatus()
  }, [setCurrentView])

  const handleNext = async () => {
    setError('')
    setIsLoading(true)

    try {
      switch (currentStep) {
        case 'welcome': {
          setCurrentStep('app-identity')
          break
        }
        case 'app-identity': {
          if (!appName.trim() || !appShortName.trim()) {
            setError('Nama aplikasi dan nama singkat harus diisi')
            break
          }
          const res = await fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              step: 'app-identity',
              data: {
                appName: appName.trim(),
                appShortName: appShortName.trim(),
                instansiName: instansiName.trim(),
                daerah: daerah.trim(),
                instansiEmail: instansiEmail.trim(),
                instansiPhone: instansiPhone.trim(),
                instansiAddress: instansiAddress.trim(),
              },
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data.error || 'Gagal menyimpan pengaturan')
            break
          }
          setCurrentStep('admin-account')
          break
        }
        case 'admin-account': {
          if (!adminNip.trim() || !adminName.trim() || !adminPassword.trim()) {
            setError('NIP, nama, dan password harus diisi')
            break
          }
          if (adminPassword.length < 6) {
            setError('Password minimal 6 karakter')
            break
          }
          if (adminPassword !== adminPasswordConfirm) {
            setError('Konfirmasi password tidak cocok')
            break
          }
          const res = await fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              step: 'admin-account',
              data: {
                nip: adminNip.trim(),
                name: adminName.trim(),
                email: adminEmail.trim(),
                password: adminPassword,
              },
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            setError(data.error || 'Gagal membuat akun admin')
            break
          }
          setCurrentStep('login-methods')
          break
        }
        case 'login-methods': {
          if (!loginWithNip && !loginWithGoogle) {
            setError('Minimal satu metode login harus diaktifkan')
            break
          }
          if (loginWithGoogle && !googleLoginClientId.trim()) {
            setError('Google Client ID harus diisi jika login Google diaktifkan')
            break
          }
          if (loginWithGoogle && !googleLoginClientSecret.trim()) {
            setError('Google Client Secret harus diisi jika login Google diaktifkan')
            break
          }
          const res = await fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              step: 'login-methods',
              data: {
                loginWithNip,
                loginWithGoogle,
                showPasswordLogin,
                googleLoginClientId: googleLoginClientId.trim(),
                googleLoginClientSecret: googleLoginClientSecret.trim(),
              },
            }),
          })
          if (!res.ok) {
            setError('Gagal menyimpan pengaturan login')
            break
          }
          setCurrentStep('google-integration')
          break
        }
        case 'google-integration': {
          if (!skipGoogleIntegration) {
            const res = await fetch('/api/setup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                step: 'google-integration',
                data: {
                  googleDriveClientEmail,
                  googleDrivePrivateKey,
                  googleDriveFolderId,
                  googleSheetsApiKey,
                  googleSheetsSpreadsheetId,
                  googleSheetsSheetName,
                },
              }),
            })
            if (!res.ok) {
              setError('Gagal menyimpan pengaturan Google')
              break
            }
          }
          setCurrentStep('master-data')
          break
        }
        case 'master-data': {
          if (bidangList.length === 0) {
            setError('Tambahkan minimal satu Bidang')
            break
          }
          if (statusList.length === 0) {
            setError('Tambahkan minimal satu Status ASN')
            break
          }
          const res = await fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              step: 'master-data',
              data: {
                bidangList,
                statusList,
              },
            }),
          })
          if (!res.ok) {
            setError('Gagal menyimpan data master')
            break
          }
          setCurrentStep('complete')
          break
        }
        case 'complete': {
          await fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step: 'complete', data: {} }),
          })
          const result = await signIn('credentials', {
            nip: adminNip.trim(),
            password: adminPassword,
            redirect: false,
          })
          if (result?.ok) {
            setCurrentView('admin-dashboard')
          } else {
            setCurrentView('login')
          }
          break
        }
      }
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setError('')
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key)
    }
  }

  const addBidang = () => {
    if (newBidang.trim() && !bidangList.includes(newBidang.trim())) {
      setBidangList([...bidangList, newBidang.trim()])
      setNewBidang('')
    }
  }

  const removeBidang = (item: string) => {
    setBidangList(bidangList.filter((b) => b !== item))
  }

  const addStatus = () => {
    if (newStatus.trim() && !statusList.includes(newStatus.trim())) {
      setStatusList([...statusList, newStatus.trim()])
      setNewStatus('')
    }
  }

  const removeStatus = (item: string) => {
    setStatusList(statusList.filter((s) => s !== item))
  }

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true
      case 'app-identity':
        return appName.trim().length > 0 && appShortName.trim().length > 0
      case 'admin-account':
        return adminNip.trim().length > 0 && adminName.trim().length > 0 && adminPassword.length >= 6 && adminPassword === adminPasswordConfirm
      case 'login-methods':
        return (loginWithNip || loginWithGoogle) &&
          (!loginWithGoogle || (googleLoginClientId.trim().length > 0 && googleLoginClientSecret.trim().length > 0))
      case 'google-integration':
        return true
      case 'master-data':
        return bidangList.length > 0 && statusList.length > 0
      case 'complete':
        return true
      default:
        return false
    }
  }

  const getNextLabel = (): string => {
    switch (currentStep) {
      case 'welcome': return 'Mulai Setup'
      case 'app-identity': return 'Buat Akun Admin'
      case 'admin-account': return 'Atur Metode Login'
      case 'login-methods': return 'Integrasi Google'
      case 'google-integration': return 'Data Master'
      case 'master-data': return 'Selesai'
      case 'complete': return 'Masuk ke Dashboard'
      default: return 'Lanjut'
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep />
      case 'app-identity':
        return <AppIdentityStep />
      case 'admin-account':
        return <AdminAccountStep />
      case 'login-methods':
        return <LoginMethodsStep />
      case 'google-integration':
        return <GoogleIntegrationStep />
      case 'master-data':
        return <MasterDataStep />
      case 'complete':
        return <CompleteStep />
    }
  }

  const WelcomeStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10"
        >
          <img src="/logo.svg" alt="Logo" className="w-16 h-16 object-contain" />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="text-2xl font-bold text-foreground">
            Selamat Datang di SIDATA BKAD
          </h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Sistem Informasi Data ASN untuk Badan Keuangan dan Aset Daerah Kabupaten Seruyan
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-muted/30 rounded-xl p-5 space-y-4"
      >
        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Setup Wizard akan membantu Anda mengkonfigurasi:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Building2, label: 'Identitas Aplikasi', desc: 'Nama aplikasi & instansi' },
            { icon: UserCog, label: 'Akun Admin', desc: 'Buat akun administrator' },
            { icon: Shield, label: 'Metode Login', desc: 'NIP, Google, atau keduanya' },
            { icon: Cloud, label: 'Integrasi Google', desc: 'Drive & Sheets (opsional)' },
            { icon: Database, label: 'Data Master', desc: 'Bidang & Status ASN' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/40">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
      >
        <Rocket className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-primary/80">
          Proses setup hanya membutuhkan beberapa menit. Anda dapat melewati langkah opsional dan mengaturnya nanti di Pengaturan.
        </p>
      </motion.div>
    </div>
  )

  const AppIdentityStep = () => (
    <div className="space-y-5">
      <div className="grid gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-sm font-medium">Nama Aplikasi *</Label>
          </div>
          <Input
            placeholder="Sistem Pengumpulan Data ASN"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">Nama lengkap yang ditampilkan di header dan judul halaman</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-sm font-medium">Nama Singkat *</Label>
          </div>
          <Input
            placeholder="SIDATA BKAD"
            value={appShortName}
            onChange={(e) => setAppShortName(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">Nama singkat untuk sidebar dan referensi cepat</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Informasi Instansi</Label>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Nama Instansi</Label>
            <Input
              placeholder="Badan Keuangan dan Aset Daerah"
              value={instansiName}
              onChange={(e) => setInstansiName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Daerah</Label>
            <Input
              placeholder="Kabupaten Seruyan"
              value={daerah}
              onChange={(e) => setDaerah(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <Label className="text-sm">Email Instansi</Label>
            </div>
            <Input
              placeholder="bkad@seruyankab.go.id"
              type="email"
              value={instansiEmail}
              onChange={(e) => setInstansiEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <Label className="text-sm">Telepon Instansi</Label>
            </div>
            <Input
              placeholder="(0522) 123456"
              value={instansiPhone}
              onChange={(e) => setInstansiPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <Label className="text-sm">Alamat Instansi</Label>
          </div>
          <Textarea
            placeholder="Jl. Trans Kalimantan, Kuala Pembuang, Kab. Seruyan, Kalimantan Tengah"
            value={instansiAddress}
            onChange={(e) => setInstansiAddress(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
      </div>
    </div>
  )

  const AdminAccountStep = () => (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <UserCog className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">Buat Akun Administrator</p>
          <p className="text-xs text-primary/70 mt-1">Akun ini akan digunakan untuk mengelola seluruh sistem. Pastikan password yang kuat dan mudah diingat.</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">NIP / Username Admin *</Label>
            <Input
              placeholder="admin"
              value={adminNip}
              onChange={(e) => setAdminNip(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Username untuk login sebagai administrator</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Nama Lengkap *</Label>
            <Input
              placeholder="Administrator BKAD"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <Label className="text-sm">Email Admin</Label>
          </div>
          <Input
            placeholder="admin@bkad-seruyan.go.id"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Password *</Label>
            <div className="relative">
              <Input
                type={showAdminPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {adminPassword && adminPassword.length < 6 && (
              <p className="text-[11px] text-destructive">Password minimal 6 karakter</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Konfirmasi Password *</Label>
            <Input
              type={showAdminPassword ? 'text' : 'password'}
              placeholder="Ulangi password"
              value={adminPasswordConfirm}
              onChange={(e) => setAdminPasswordConfirm(e.target.value)}
            />
            {adminPasswordConfirm && adminPassword !== adminPasswordConfirm && (
              <p className="text-[11px] text-destructive">Password tidak cocok</p>
            )}
            {adminPasswordConfirm && adminPassword === adminPasswordConfirm && (
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Password cocok
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const LoginMethodsStep = () => (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">Pilih Metode Login</p>
          <p className="text-xs text-primary/70 mt-1">Tentukan bagaimana pengguna dapat masuk ke sistem. Ini dapat diubah nanti di Pengaturan.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label className="text-sm font-medium">Login dengan NIP/Password</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Pengguna login menggunakan NIP dan password</p>
            </div>
          </div>
          <Switch checked={loginWithNip} onCheckedChange={setLoginWithNip} />
        </div>

        {loginWithNip && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10 ml-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                {showPasswordLogin ? (
                  <Eye className="w-5 h-5 text-amber-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Tampilkan Field Password</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Tampilkan atau sembunyikan field password saat login</p>
              </div>
            </div>
            <Switch checked={showPasswordLogin} onCheckedChange={setShowPasswordLogin} />
          </div>
        )}

        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <Label className="text-sm font-medium">Login dengan Google</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Izinkan pengguna login menggunakan akun Google</p>
            </div>
          </div>
          <Switch checked={loginWithGoogle} onCheckedChange={setLoginWithGoogle} />
        </div>
      </div>

      {/* Google OAuth Credentials - shown when Google login is enabled */}
      {loginWithGoogle && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Setup Instructions */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/10">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Cara Mengatur Login Google:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-600 dark:text-blue-400">
                <li>Buka <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a></li>
                <li>Buat project baru atau pilih project yang ada</li>
                <li>Buka menu <strong>APIs & Services → Credentials</strong></li>
                <li>Klik <strong>Create Credentials → OAuth client ID</strong></li>
                <li>Pilih <strong>Web application</strong> sebagai Application type</li>
                <li>Tambahkan <strong>Authorized redirect URI</strong>: <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded text-[11px]">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/google</code></li>
                <li>Copy <strong>Client ID</strong> dan <strong>Client Secret</strong> ke form di bawah</li>
              </ol>
            </div>
          </div>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Key className="w-4 h-4" />
                Kredensial Google OAuth
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm font-medium">Google Client ID *</Label>
                </div>
                <Input
                  placeholder="123456789-abc.apps.googleusercontent.com"
                  value={googleLoginClientId}
                  onChange={(e) => setGoogleLoginClientId(e.target.value)}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">Dari Google Cloud Console → APIs & Services → Credentials</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm font-medium">Google Client Secret *</Label>
                </div>
                <div className="relative">
                  <Input
                    type={showGoogleClientSecret ? 'text' : 'password'}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxx"
                    value={googleLoginClientSecret}
                    onChange={(e) => setGoogleLoginClientSecret(e.target.value)}
                    className="text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGoogleClientSecret(!showGoogleClientSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showGoogleClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Dari Google Cloud Console → APIs & Services → Credentials</p>
              </div>

              {googleLoginClientId && googleLoginClientSecret && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-800 dark:bg-emerald-900/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Google OAuth terkonfigurasi dengan benar
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!loginWithNip && !loginWithGoogle && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">Minimal satu metode login harus diaktifkan!</p>
        </div>
      )}
    </div>
  )

  const GoogleIntegrationStep = () => (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 flex-1">
        <Cloud className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">Integrasi Google (Opsional)</p>
          <p className="text-xs text-primary/70 mt-1">Hubungkan dengan Google Drive dan Google Sheets untuk penyimpanan file dan sinkronisasi data. Dapat dikonfigurasi nanti.</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
        <Label className="text-sm font-medium">Lewati langkah ini</Label>
        <Switch checked={skipGoogleIntegration} onCheckedChange={setSkipGoogleIntegration} />
      </div>

      {!skipGoogleIntegration && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-5"
        >
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Google Drive
              </CardTitle>
              <CardDescription className="text-xs">
                File yang diupload akan otomatis disimpan ke Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm">Service Account Email</Label>
                </div>
                <Input
                  placeholder="my-service@my-project.iam.gserviceaccount.com"
                  value={googleDriveClientEmail}
                  onChange={(e) => setGoogleDriveClientEmail(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm">Private Key</Label>
                </div>
                <Textarea
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQ...&#10;-----END PRIVATE KEY-----"
                  value={googleDrivePrivateKey}
                  onChange={(e) => setGoogleDrivePrivateKey(e.target.value)}
                  rows={3}
                  className="resize-y font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm">Folder ID</Label>
                </div>
                <Input
                  placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                  value={googleDriveFolderId}
                  onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Dari URL: drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Table2 className="w-4 h-4" />
                Google Sheets
              </CardTitle>
              <CardDescription className="text-xs">
                Sinkronkan data ASN dan respons form ke Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm">API Key</Label>
                </div>
                <Input
                  placeholder="AIzaSy..."
                  value={googleSheetsApiKey}
                  onChange={(e) => setGoogleSheetsApiKey(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Table2 className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm">Spreadsheet ID</Label>
                </div>
                <Input
                  placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ..."
                  value={googleSheetsSpreadsheetId}
                  onChange={(e) => setGoogleSheetsSpreadsheetId(e.target.value)}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Dari URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-sm">Nama Sheet</Label>
                </div>
                <Input
                  placeholder="Sheet1"
                  value={googleSheetsSheetName}
                  onChange={(e) => setGoogleSheetsSheetName(e.target.value)}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )

  const MasterDataStep = () => (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <Database className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">Data Master Awal</p>
          <p className="text-xs text-primary/70 mt-1">Atur Bidang (divisi) dan Status ASN yang tersedia. Data ini dapat diperbarui nanti di menu Data Master.</p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Bidang / Divisi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nama bidang baru..."
              value={newBidang}
              onChange={(e) => setNewBidang(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBidang() } }}
              className="flex-1"
            />
            <Button type="button" onClick={addBidang} size="sm" className="gap-1.5 shrink-0">
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {bidangList.map((item) => (
              <Badge key={item} variant="secondary" className="py-1.5 px-3 text-sm gap-1.5 hover:bg-secondary/80">
                {item}
                <button type="button" onClick={() => removeBidang(item)} className="ml-1 hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {bidangList.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Belum ada bidang ditambahkan</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Status ASN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nama status baru..."
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStatus() } }}
              className="flex-1"
            />
            <Button type="button" onClick={addStatus} size="sm" className="gap-1.5 shrink-0">
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusList.map((item) => (
              <Badge key={item} variant="secondary" className="py-1.5 px-3 text-sm gap-1.5 hover:bg-secondary/80">
                {item}
                <button type="button" onClick={() => removeStatus(item)} className="ml-1 hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {statusList.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Belum ada status ditambahkan</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const CompleteStep = () => (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 flex items-center justify-center border-2 border-emerald-200 dark:border-emerald-800">
          <PartyPopper className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-2xl font-bold text-foreground">Setup Selesai!</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Sistem SIDATA BKAD Anda telah berhasil dikonfigurasi. Klik tombol di bawah untuk masuk ke Dashboard Admin.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-muted/30 rounded-xl p-4 text-left max-w-sm mx-auto"
      >
        <h4 className="text-sm font-semibold text-foreground mb-3">Ringkasan Konfigurasi:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nama Aplikasi</span>
            <span className="font-medium text-foreground">{appShortName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Instansi</span>
            <span className="font-medium text-foreground">{instansiName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Admin</span>
            <span className="font-medium text-foreground">{adminName}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Metode Login</span>
            <div className="flex gap-1">
              {loginWithNip && <Badge variant="outline" className="text-[10px]">NIP</Badge>}
              {loginWithGoogle && <Badge variant="outline" className="text-[10px]">Google</Badge>}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Bidang</span>
            <span className="font-medium text-foreground">{bidangList.length} bidang</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status ASN</span>
            <span className="font-medium text-foreground">{statusList.length} status</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Google Integration</span>
            <span className="font-medium text-foreground">
              {skipGoogleIntegration ? 'Dilewati' : (googleDriveClientEmail || googleSheetsApiKey) ? 'Dikonfigurasi' : 'Tidak ada'}
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 max-w-sm mx-auto"
      >
        <Rocket className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-primary/80 text-left">
          Anda dapat mengubah semua pengaturan ini kapan saja melalui menu Pengaturan di Dashboard Admin.
        </p>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header with progress */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
              <div>
                <h1 className="text-sm font-bold text-foreground">Setup Wizard</h1>
                <p className="text-[11px] text-muted-foreground">Konfigurasi awal sistem</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Langkah {currentStepIndex + 1} / {STEPS.length}
            </Badge>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStepIndex
              const isCompleted = idx < currentStepIndex
              const Icon = step.icon
              return (
                <div
                  key={step.key}
                  className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => {
                    if (isCompleted) setCurrentStep(step.key)
                  }}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                        : isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] text-center leading-tight hidden sm:block ${
                      isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center py-6 px-4 sm:px-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-border/60 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const stepConfig = STEPS[currentStepIndex]
                      const StepIcon = stepConfig.icon
                      return (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <StepIcon className="w-5 h-5 text-primary" />
                        </div>
                      )
                    })()}
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {STEPS[currentStepIndex].label}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {STEPS[currentStepIndex].description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm flex items-start gap-2"
                    >
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {renderStepContent()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="border-t bg-background/80 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isLoading}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <div className="flex items-center gap-2">
            {currentStep !== 'complete' && (
              <Button
                variant="ghost"
                onClick={() => setCurrentView('login')}
                className="text-xs text-muted-foreground"
                disabled={isLoading}
              >
                Lewati Setup
              </Button>
            )}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canGoNext() || isLoading}
            className="gap-1.5 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                {currentStep === 'complete' ? (
                  <>
                    <Rocket className="w-4 h-4" />
                    Masuk ke Dashboard
                  </>
                ) : (
                  <>
                    {getNextLabel()}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
