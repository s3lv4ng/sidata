'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Settings,
  Save,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Type,
  Hash,
  CheckCircle2,
  HardDrive,
  Key,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Cloud,
  CloudOff,
  FileText,
  Shield,
  UserCog,
  Eye,
  EyeOff,
  Table2,
  Upload,
  Sparkles,
  ChevronDown,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface SettingsMap {
  [key: string]: string
}

const settingsConfig = [
  {
    key: 'appName',
    label: 'Nama Aplikasi',
    placeholder: 'Sistem Pengumpulan Data ASN',
    description: 'Nama lengkap aplikasi yang ditampilkan di header dan judul halaman',
    icon: Type,
    type: 'input' as const,
  },
  {
    key: 'appShortName',
    label: 'Nama Singkat',
    placeholder: 'SIDATA BKAD',
    description: 'Nama singkat aplikasi untuk sidebar dan referensi cepat',
    icon: Hash,
    type: 'input' as const,
  },
  {
    key: 'instansiName',
    label: 'Nama Instansi',
    placeholder: 'Badan Keuangan dan Aset Daerah',
    description: 'Nama resmi instansi pemerintah',
    icon: Building2,
    type: 'input' as const,
  },
  {
    key: 'daerah',
    label: 'Daerah',
    placeholder: 'Kabupaten Seruyan',
    description: 'Wilayah daerah instansi',
    icon: MapPin,
    type: 'input' as const,
  },
  {
    key: 'instansiEmail',
    label: 'Email Instansi',
    placeholder: 'bkad@seruyankab.go.id',
    description: 'Alamat email resmi instansi',
    icon: Mail,
    type: 'input' as const,
  },
  {
    key: 'instansiPhone',
    label: 'Telepon Instansi',
    placeholder: '(0522) 123456',
    description: 'Nomor telepon resmi instansi',
    icon: Phone,
    type: 'input' as const,
  },
  {
    key: 'instansiAddress',
    label: 'Alamat Instansi',
    placeholder: 'Jl. Trans Kalimantan, Kuala Pembuang, Kab. Seruyan, Kalimantan Tengah',
    description: 'Alamat lengkap kantor instansi',
    icon: MapPin,
    type: 'textarea' as const,
  },
]

const driveSettingsConfig = [
  {
    key: 'googleDriveClientEmail',
    label: 'Service Account Email',
    placeholder: 'my-service@my-project.iam.gserviceaccount.com',
    description: 'Email Service Account Google Cloud untuk mengakses Google Drive API',
    icon: Mail,
    type: 'input' as const,
    sensitive: false,
  },
  {
    key: 'googleDrivePrivateKey',
    label: 'Private Key',
    placeholder: '-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----',
    description: 'Private key dari Service Account (format PEM). Bisa di-copy dari file JSON kredensial',
    icon: Key,
    type: 'textarea' as const,
    sensitive: true,
  },
  {
    key: 'googleDriveFolderId',
    label: 'Folder ID Google Drive',
    placeholder: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    description: 'ID folder Google Drive tempat file akan disimpan (dari URL folder)',
    icon: FolderOpen,
    type: 'input' as const,
    sensitive: false,
  },
  {
    key: 'googleDriveDelegateEmail',
    label: 'Email Delegasi (Opsional)',
    placeholder: 'admin@instansi.go.id',
    description: 'Email pengguna yang akan diimpersonasi (domain-wide delegation). Diperlukan jika folder di My Drive dan Service Account tidak bisa upload langsung.',
    icon: UserCog,
    type: 'input' as const,
    sensitive: false,
  },
]

export default function AdminSettings() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()
  const userId = (session?.user as any)?.id || ''

  const [settings, setSettings] = useState<SettingsMap>({})
  const [originalSettings, setOriginalSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [saveAllLoading, setSaveAllLoading] = useState(false)

  // Logo & Favicon upload state
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)

  // Google Drive state
  const [driveStatus, setDriveStatus] = useState<{
    configured: boolean
    connected: boolean
    folder?: { name: string; id: string }
    files?: any[]
    canUpload?: boolean
    uploadWarning?: string
    message: string
    error?: {
      message: string
      code?: number
      reason?: string
      isApiDisabled?: boolean
      isAuthError?: boolean
      isNotFoundError?: boolean
      isPermissionError?: boolean
      isQuotaError?: boolean
    }
  } | null>(null)
  const [testingDrive, setTestingDrive] = useState(false)
  const [testingDriveUpload, setTestingDriveUpload] = useState(false)
  const [driveFilesDialogOpen, setDriveFilesDialogOpen] = useState(false)
  const [showDriveCredentials, setShowDriveCredentials] = useState(false)
  const [showGoogleClientSecret, setShowGoogleClientSecret] = useState(false)
  const [oauthInstructionsOpen, setOauthInstructionsOpen] = useState(false)
  const [editingPrivateKey, setEditingPrivateKey] = useState(false)
  const [editingClientSecret, setEditingClientSecret] = useState(false)

  // Google Sheets state
  const [sheetsStatus, setSheetsStatus] = useState<{
    configured: boolean
    connected: boolean
    spreadsheet?: { title: string; id: string; url: string; sheets: Array<{ title: string; sheetId: number }> }
    message: string
    error?: {
      message: string
      code?: number
      reason?: string
      isApiDisabled?: boolean
      isAuthError?: boolean
      isNotFoundError?: boolean
      isPermissionError?: boolean
    }
  } | null>(null)
  const [testingSheets, setTestingSheets] = useState(false)
  const [syncingAsn, setSyncingAsn] = useState(false)
  const [creatingSharedDrive, setCreatingSharedDrive] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setOriginalSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
      addNotification('Gagal memuat pengaturan', 'error')
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const checkDriveStatus = useCallback(async () => {
    setTestingDrive(true)
    try {
      const res = await fetch('/api/drive')
      if (res.ok) {
        const data = await res.json()
        setDriveStatus(data)
      } else {
        setDriveStatus({ configured: false, connected: false, message: 'Gagal mengecek status' })
      }
    } catch {
      setDriveStatus({ configured: false, connected: false, message: 'Gagal terhubung ke server' })
    } finally {
      setTestingDrive(false)
    }
  }, [])

  useEffect(() => {
    checkDriveStatus()
  }, [checkDriveStatus])

  const checkSheetsStatus = useCallback(async () => {
    setTestingSheets(true)
    try {
      const res = await fetch('/api/google-sheets')
      if (res.ok) {
        const data = await res.json()
        setSheetsStatus(data)
      } else {
        setSheetsStatus({ configured: false, connected: false, message: 'Gagal mengecek status' })
      }
    } catch {
      setSheetsStatus({ configured: false, connected: false, message: 'Gagal terhubung ke server' })
    } finally {
      setTestingSheets(false)
    }
  }, [])

  useEffect(() => {
    checkSheetsStatus()
  }, [checkSheetsStatus])

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const isChanged = (key: string) => {
    return (settings[key] || '') !== (originalSettings[key] || '')
  }

  const hasAnyChange = settingsConfig.some((c) => isChanged(c.key))
  const hasDriveChange = driveSettingsConfig.some((c) => isChanged(c.key))

  const handleSaveOne = async (key: string) => {
    try {
      setSaving((prev) => new Set(prev).add(key))
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { [key]: settings[key] || '' },
          userId,
        }),
      })
      if (res.ok) {
        setOriginalSettings((prev) => ({ ...prev, [key]: settings[key] || '' }))
        const label = [...settingsConfig, ...driveSettingsConfig].find((c) => c.key === key)?.label || key
        addNotification(`"${label}" berhasil disimpan`, 'success')

        // Reset private key editing state after save
        if (key === 'googleDrivePrivateKey') {
          setEditingPrivateKey(false)
        }
        if (key === 'googleLoginClientSecret') {
          setEditingClientSecret(false)
        }

        // If we saved a Drive setting, recheck connection
        if (driveSettingsConfig.some((c) => c.key === key)) {
          checkDriveStatus()
        }
      } else {
        addNotification('Gagal menyimpan pengaturan', 'error')
      }
    } catch (err) {
      console.error('Failed to save setting:', err)
      addNotification('Gagal menyimpan pengaturan', 'error')
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleSaveAll = async (configList: typeof settingsConfig) => {
    try {
      setSaveAllLoading(true)
      const changedSettings: SettingsMap = {}
      configList.forEach((c) => {
        if (isChanged(c.key)) {
          changedSettings[c.key] = settings[c.key] || ''
        }
      })

      if (Object.keys(changedSettings).length === 0) {
        addNotification('Tidak ada perubahan untuk disimpan', 'info')
        return
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changedSettings, userId }),
      })
      if (res.ok) {
        setOriginalSettings({ ...settings })
        addNotification('Semua pengaturan berhasil disimpan', 'success')

        // Reset private key editing state after save
        if (changedSettings.googleDrivePrivateKey !== undefined) {
          setEditingPrivateKey(false)
        }
        if (changedSettings.googleLoginClientSecret !== undefined) {
          setEditingClientSecret(false)
        }

        // If we saved Drive settings, recheck connection
        if (configList === driveSettingsConfig) {
          checkDriveStatus()
        }
      } else {
        addNotification('Gagal menyimpan pengaturan', 'error')
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      addNotification('Gagal menyimpan pengaturan', 'error')
    } finally {
      setSaveAllLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat pengaturan...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
            <Settings className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Pengaturan Sistem</h2>
            <p className="text-xs text-muted-foreground">
              Kelola konfigurasi dan informasi instansi
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleSaveAll(settingsConfig)}
          disabled={!hasAnyChange || saveAllLoading}
          className="gap-2 shadow-sm"
        >
          {saveAllLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Semua
            </>
          )}
        </Button>
      </div>

      {/* Changed count badge */}
      {hasAnyChange && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
            {settingsConfig.filter((c) => isChanged(c.key)).length} perubahan belum disimpan
          </Badge>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="identitas" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="identitas" className="gap-1.5 text-xs">
            <Type className="w-3.5 h-3.5" />
            Identitas
          </TabsTrigger>
          <TabsTrigger value="login" className="gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" />
            Login
          </TabsTrigger>
          <TabsTrigger value="drive" className="gap-1.5 text-xs">
            <HardDrive className="w-3.5 h-3.5" />
            Google Drive
          </TabsTrigger>
          <TabsTrigger value="sheets" className="gap-1.5 text-xs">
            <Table2 className="w-3.5 h-3.5" />
            Google Sheets
          </TabsTrigger>
          <TabsTrigger value="lainnya" className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Lainnya
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Identitas */}
        <TabsContent value="identitas" className="space-y-4 mt-4">
          {/* App Identity Section */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Type className="w-4 h-4" />
                Identitas Aplikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsConfig.slice(0, 2).map((config, idx) => {
                const Icon = config.icon
                const changed = isChanged(config.key)
                const savingField = saving.has(config.key)
                return (
                  <div key={config.key}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <Label className="text-sm font-medium">{config.label}</Label>
                          {changed && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            >
                              Diubah
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                        <Input
                          placeholder={config.placeholder}
                          value={settings[config.key] || ''}
                          onChange={(e) => handleChange(config.key, e.target.value)}
                          className={changed ? 'border-amber-300 focus-visible:ring-amber-200' : ''}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant={changed ? 'default' : 'outline'}
                        disabled={!changed || savingField}
                        onClick={() => handleSaveOne(config.key)}
                        className="gap-1.5 shrink-0 mt-6 sm:mt-0 sm:self-end"
                      >
                        {savingField ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : changed ? (
                          <Save className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {savingField ? 'Menyimpan...' : changed ? 'Simpan' : 'Tersimpan'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Logo & Favicon Upload Section */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Logo & Favicon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    Logo Aplikasi
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Logo yang ditampilkan di sidebar, header, dan halaman login. Format: PNG, JPG, SVG, WebP (maks. 2MB)
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border/60 bg-muted/10 flex items-center justify-center overflow-hidden shrink-0">
                      {settings.appLogo ? (
                        <img
                          src={settings.appLogo}
                          alt="Logo Preview"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 2 * 1024 * 1024) {
                            addNotification('Ukuran file terlalu besar (maks. 2MB)', 'error')
                            return
                          }
                          setUploadingLogo(true)
                          try {
                            const fd = new FormData()
                            fd.append('file', file)
                            fd.append('type', 'logo')
                            fd.append('userId', userId)
                            const res = await fetch('/api/upload-logo', { method: 'POST', body: fd })
                            if (res.ok) {
                              const data = await res.json()
                              setSettings((prev) => ({ ...prev, appLogo: data.filePath }))
                              setOriginalSettings((prev) => ({ ...prev, appLogo: data.filePath }))
                              addNotification('Logo berhasil diunggah', 'success')
                            } else {
                              const data = await res.json()
                              addNotification(data.error || 'Gagal mengunggah logo', 'error')
                            }
                          } catch {
                            addNotification('Gagal mengunggah logo', 'error')
                          } finally {
                            setUploadingLogo(false)
                            e.target.value = ''
                          }
                        }}
                        disabled={uploadingLogo}
                        className="text-xs"
                      />
                      <div className="flex items-center gap-2">
                        {uploadingLogo && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        <span className="text-[11px] text-muted-foreground">
                          {uploadingLogo ? 'Mengunggah...' : settings.appLogo ? 'Klik untuk ganti logo' : 'Pilih file logo'}
                        </span>
                      </div>
                      {settings.appLogo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          onClick={async () => {
                            setSettings((prev) => ({ ...prev, appLogo: '' }))
                            await fetch('/api/settings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ settings: { appLogo: '' }, userId }),
                            })
                            setOriginalSettings((prev) => ({ ...prev, appLogo: '' }))
                            addNotification('Logo dihapus, menggunakan logo default', 'info')
                          }}
                        >
                          <X className="w-3 h-3" />
                          Hapus Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Favicon Upload */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    Favicon
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ikon kecil yang muncul di tab browser. Format: ICO, PNG, SVG (maks. 2MB, direkomendasikan 32×32px atau 64×64px)
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border/60 bg-muted/10 flex items-center justify-center overflow-hidden shrink-0">
                      {settings.appFavicon ? (
                        <img
                          src={settings.appFavicon}
                          alt="Favicon Preview"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        type="file"
                        accept="image/x-icon,image/png,image/svg+xml,image/vnd.microsoft.icon"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 2 * 1024 * 1024) {
                            addNotification('Ukuran file terlalu besar (maks. 2MB)', 'error')
                            return
                          }
                          setUploadingFavicon(true)
                          try {
                            const fd = new FormData()
                            fd.append('file', file)
                            fd.append('type', 'favicon')
                            fd.append('userId', userId)
                            const res = await fetch('/api/upload-logo', { method: 'POST', body: fd })
                            if (res.ok) {
                              const data = await res.json()
                              setSettings((prev) => ({ ...prev, appFavicon: data.filePath }))
                              setOriginalSettings((prev) => ({ ...prev, appFavicon: data.filePath }))
                              addNotification('Favicon berhasil diunggah', 'success')
                            } else {
                              const data = await res.json()
                              addNotification(data.error || 'Gagal mengunggah favicon', 'error')
                            }
                          } catch {
                            addNotification('Gagal mengunggah favicon', 'error')
                          } finally {
                            setUploadingFavicon(false)
                            e.target.value = ''
                          }
                        }}
                        disabled={uploadingFavicon}
                        className="text-xs"
                      />
                      <div className="flex items-center gap-2">
                        {uploadingFavicon && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        <span className="text-[11px] text-muted-foreground">
                          {uploadingFavicon ? 'Mengunggah...' : settings.appFavicon ? 'Klik untuk ganti favicon' : 'Pilih file favicon'}
                        </span>
                      </div>
                      {settings.appFavicon && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          onClick={async () => {
                            setSettings((prev) => ({ ...prev, appFavicon: '' }))
                            await fetch('/api/settings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ settings: { appFavicon: '' }, userId }),
                            })
                            setOriginalSettings((prev) => ({ ...prev, appFavicon: '' }))
                            addNotification('Favicon dihapus, menggunakan default', 'info')
                          }}
                        >
                          <X className="w-3 h-3" />
                          Hapus Favicon
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Institution Info Section */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Informasi Instansi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsConfig.slice(2).map((config, idx) => {
                const Icon = config.icon
                const changed = isChanged(config.key)
                const savingField = saving.has(config.key)
                return (
                  <div key={config.key}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <Label className="text-sm font-medium">{config.label}</Label>
                          {changed && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            >
                              Diubah
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                        {config.type === 'textarea' ? (
                          <Textarea
                            placeholder={config.placeholder}
                            value={settings[config.key] || ''}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            rows={3}
                            className={`resize-none ${changed ? 'border-amber-300 focus-visible:ring-amber-200' : ''}`}
                          />
                        ) : (
                          <Input
                            placeholder={config.placeholder}
                            value={settings[config.key] || ''}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            className={changed ? 'border-amber-300 focus-visible:ring-amber-200' : ''}
                          />
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={changed ? 'default' : 'outline'}
                        disabled={!changed || savingField}
                        onClick={() => handleSaveOne(config.key)}
                        className="gap-1.5 shrink-0 mt-6 sm:mt-0 sm:self-end"
                      >
                        {savingField ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : changed ? (
                          <Save className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {savingField ? 'Menyimpan...' : changed ? 'Simpan' : 'Tersimpan'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Login */}
        <TabsContent value="login" className="space-y-4 mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Metode Login
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Login with NIP */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserCog className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Login dengan NIP/Password</Label>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-medium ${
                          settings.loginWithNip !== 'false'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        }`}
                      >
                        {settings.loginWithNip !== 'false' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Izinkan pengguna login menggunakan NIP dan password</p>
                  </div>
                </div>
                <Switch
                  checked={settings.loginWithNip !== 'false'}
                  onCheckedChange={(checked) => {
                    handleChange('loginWithNip', checked ? 'true' : 'false')
                  }}
                />
              </div>

              {/* Show password field */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                    {settings.showPasswordLogin !== 'false' ? (
                      <Eye className="w-4 h-4 text-amber-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Tampilkan Field Password</Label>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-medium ${
                          settings.showPasswordLogin !== 'false'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        }`}
                      >
                        {settings.showPasswordLogin !== 'false' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Tampilkan atau sembunyikan field password saat login</p>
                  </div>
                </div>
                <Switch
                  checked={settings.showPasswordLogin !== 'false'}
                  onCheckedChange={(checked) => {
                    handleChange('showPasswordLogin', checked ? 'true' : 'false')
                  }}
                />
              </div>

              {/* Login with Google */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Login dengan Google</Label>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-medium ${
                          settings.loginWithGoogle === 'true'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        }`}
                      >
                        {settings.loginWithGoogle === 'true' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Izinkan pengguna login menggunakan akun Google</p>
                  </div>
                </div>
                <Switch
                  checked={settings.loginWithGoogle === 'true'}
                  onCheckedChange={(checked) => {
                    handleChange('loginWithGoogle', checked ? 'true' : 'false')
                  }}
                />
              </div>

              {/* Google OAuth Configuration - shown when Google login is enabled */}
              {settings.loginWithGoogle === 'true' && (
                <div className="space-y-4 ml-2 pl-4 border-l-2 border-red-200 dark:border-red-800">
                  {/* Collapsible Setup Instructions */}
                  <Collapsible open={oauthInstructionsOpen} onOpenChange={setOauthInstructionsOpen}>
                    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/10">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors w-full text-left">
                            Cara Mengatur Login Google
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${oauthInstructionsOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-600 dark:text-blue-400 mt-2">
                            <li>Buka <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a></li>
                            <li>Buat project baru atau pilih project yang ada</li>
                            <li>Buka menu <strong>APIs &amp; Services → Credentials</strong></li>
                            <li>Klik <strong>Create Credentials → OAuth client ID</strong></li>
                            <li>Pilih <strong>Web application</strong> sebagai Application type</li>
                            <li>Tambahkan <strong>Authorized redirect URI</strong>: <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded text-[11px] break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/google</code></li>
                            <li>Copy <strong>Client ID</strong> dan <strong>Client Secret</strong> ke form di bawah</li>
                          </ol>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </Collapsible>

                  {/* Google Client ID */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label className="text-sm font-medium">Google Client ID</Label>
                        {isChanged('googleLoginClientId') && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                          >
                            Diubah
                          </Badge>
                        )}
                        {!!originalSettings.googleLoginClientId && !isChanged('googleLoginClientId') && (
                          <Badge variant="outline" className="text-[9px] font-medium bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                            Terisi
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">OAuth Client ID dari Google Cloud Console</p>
                      <Input
                        placeholder="123456789-abc.apps.googleusercontent.com"
                        value={settings.googleLoginClientId || ''}
                        onChange={(e) => handleChange('googleLoginClientId', e.target.value)}
                        className={isChanged('googleLoginClientId') ? 'border-amber-300 focus-visible:ring-amber-200' : ''}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={isChanged('googleLoginClientId') ? 'default' : 'outline'}
                      disabled={!isChanged('googleLoginClientId') || saving.has('googleLoginClientId')}
                      onClick={() => handleSaveOne('googleLoginClientId')}
                      className="gap-1.5 shrink-0 sm:self-end"
                    >
                      {saving.has('googleLoginClientId') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saving.has('googleLoginClientId') ? 'Menyimpan...' : isChanged('googleLoginClientId') ? 'Simpan' : 'Tersimpan'}
                    </Button>
                  </div>

                  {/* Google Client Secret */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-muted-foreground" />
                        <Label className="text-sm font-medium">Google Client Secret</Label>
                        {isChanged('googleLoginClientSecret') && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                          >
                            Diubah
                          </Badge>
                        )}
                        {!!originalSettings.googleLoginClientSecret && !isChanged('googleLoginClientSecret') && !editingClientSecret && (
                          <Badge variant="outline" className="text-[9px] font-medium bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                            Terisi
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">OAuth Client Secret dari Google Cloud Console</p>
                      {originalSettings.googleLoginClientSecret && !editingClientSecret && !isChanged('googleLoginClientSecret') ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                            <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-muted-foreground font-mono">••••••••••••••••</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => {
                              setEditingClientSecret(true)
                              handleChange('googleLoginClientSecret', '')
                            }}
                          >
                            <Key className="w-3 h-3" />
                            Ganti Client Secret
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            type={showGoogleClientSecret ? 'text' : 'password'}
                            placeholder="GOCSPX-xxxxxxxxxxxxxxxxx"
                            value={settings.googleLoginClientSecret || ''}
                            onChange={(e) => handleChange('googleLoginClientSecret', e.target.value)}
                            className={`pr-10 ${isChanged('googleLoginClientSecret') ? 'border-amber-300 focus-visible:ring-amber-200' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowGoogleClientSecret(!showGoogleClientSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                          >
                            {showGoogleClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={isChanged('googleLoginClientSecret') ? 'default' : 'outline'}
                      disabled={!isChanged('googleLoginClientSecret') || saving.has('googleLoginClientSecret')}
                      onClick={() => handleSaveOne('googleLoginClientSecret')}
                      className="gap-1.5 shrink-0 sm:self-end"
                    >
                      {saving.has('googleLoginClientSecret') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saving.has('googleLoginClientSecret') ? 'Menyimpan...' : isChanged('googleLoginClientSecret') ? 'Simpan' : 'Tersimpan'}
                    </Button>
                  </div>

                  {/* Configuration Status */}
                  {(() => {
                    const hasClientId = !!(settings.googleLoginClientId || '').trim()
                    const hasClientSecret = !!(settings.googleLoginClientSecret || '').trim()
                    const isFullyConfigured = hasClientId && hasClientSecret
                    return (
                      <div className={`flex items-center gap-2 rounded-lg border p-2.5 ${
                        isFullyConfigured
                          ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
                          : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10'
                      }`}>
                        {isFullyConfigured ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <span className={`text-xs font-medium ${
                          isFullyConfigured
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}>
                          {isFullyConfigured
                            ? 'Google OAuth terkonfigurasi. Login Google akan aktif setelah disimpan.'
                            : !hasClientId && !hasClientSecret
                              ? 'Client ID dan Client Secret belum diisi. Login Google tidak akan berfungsi.'
                              : !hasClientId
                                ? 'Client ID belum diisi.'
                                : 'Client Secret belum diisi.'
                          }
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {(isChanged('loginWithNip') || isChanged('loginWithGoogle') || isChanged('showPasswordLogin') || isChanged('googleLoginClientId') || isChanged('googleLoginClientSecret')) && (
                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      const loginSettings: SettingsMap = {}
                      if (isChanged('loginWithNip')) loginSettings.loginWithNip = settings.loginWithNip || 'true'
                      if (isChanged('loginWithGoogle')) loginSettings.loginWithGoogle = settings.loginWithGoogle || 'false'
                      if (isChanged('showPasswordLogin')) loginSettings.showPasswordLogin = settings.showPasswordLogin || 'true'
                      if (isChanged('googleLoginClientId')) loginSettings.googleLoginClientId = settings.googleLoginClientId || ''
                      if (isChanged('googleLoginClientSecret')) loginSettings.googleLoginClientSecret = settings.googleLoginClientSecret || ''
                      try {
                        const res = await fetch('/api/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ settings: loginSettings, userId }),
                        })
                        if (res.ok) {
                          setOriginalSettings({ ...settings })
                          if (loginSettings.googleLoginClientSecret !== undefined) {
                            setEditingClientSecret(false)
                          }
                          addNotification('Pengaturan login berhasil disimpan', 'success')
                        }
                      } catch {
                        addNotification('Gagal menyimpan pengaturan login', 'error')
                      }
                    }}
                    size="sm"
                    className="gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan Pengaturan Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Google Drive */}
        <TabsContent value="drive" className="space-y-4 mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Integrasi Google Drive
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* Connection status badge */}
                  {driveStatus && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        driveStatus.connected && driveStatus.canUpload !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                          : driveStatus.connected && driveStatus.canUpload === false
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                            : driveStatus.configured
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                              : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
                      }`}
                    >
                      {driveStatus.connected && driveStatus.canUpload !== false ? (
                        <><Cloud className="w-3 h-3 mr-1" /> Terhubung</>
                      ) : driveStatus.connected && driveStatus.canUpload === false ? (
                        <><AlertCircle className="w-3 h-3 mr-1" /> Upload Terbatas</>
                      ) : driveStatus.configured ? (
                        <><CloudOff className="w-3 h-3 mr-1" /> Gagal Terhubung</>
                      ) : (
                        <><CloudOff className="w-3 h-3 mr-1" /> Belum Dikonfigurasi</>
                      )}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkDriveStatus}
                    disabled={testingDrive}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingDrive ? 'animate-spin' : ''}`} />
                    Tes Koneksi
                  </Button>
                  {driveStatus && driveStatus.connected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setTestingDriveUpload(true)
                        try {
                          const res = await fetch('/api/drive', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'test-upload' }),
                          })
                          const data = await res.json()
                          if (data.success) {
                            addNotification('✅ Upload ke Google Drive berhasil!', 'success')
                            // Recheck status since upload might have confirmed it works
                            await checkDriveStatus()
                          } else {
                            addNotification('❌ Upload gagal: ' + (data.message || 'Folder mungkin di My Drive'), 'error')
                          }
                        } catch {
                          addNotification('Gagal test upload ke Drive', 'error')
                        } finally {
                          setTestingDriveUpload(false)
                        }
                      }}
                      disabled={testingDriveUpload}
                      className="h-7 gap-1.5 text-xs"
                    >
                      {testingDriveUpload ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Testing...</>
                      ) : (
                        <><Upload className="w-3 h-3" /> Test Upload</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection info */}
              {driveStatus && driveStatus.connected && driveStatus.folder && (
                <>
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-900/10">
                    <FolderOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                        {driveStatus.folder.name}
                      </p>
                      <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                        ID: {driveStatus.folder.id}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs shrink-0"
                      onClick={() => setDriveFilesDialogOpen(true)}
                    >
                      <FileText className="w-3 h-3" />
                      Lihat File
                    </Button>
                  </div>
                  {/* Upload warning for My Drive folders */}
                  {driveStatus.uploadWarning && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2 flex-1">
                        <p className="font-medium">Upload File ke Google Drive Terbatas</p>
                        <p>{driveStatus.uploadWarning}</p>
                        <div className="space-y-1.5 mt-2">
                          <p className="font-medium">Solusi 1: Email Delegasi (Direkomendasikan)</p>
                          <p>Isi field <strong>Email Delegasi</strong> di bawah dengan email pengguna Google Workspace yang memiliki akses ke folder. Service Account akan mengunggah file atas nama pengguna tersebut.</p>
                          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">Catatan: Memerlukan domain-wide delegation yang diaktifkan di Google Workspace Admin Console.</p>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          <p className="font-medium">Solusi 2: Buat Shared Drive Manual</p>
                          <ol className="list-decimal list-inside space-y-0.5">
                            <li>Buka Google Drive</li>
                            <li>Klik <strong>Drive Bersama/Shared Drives</strong> di sidebar kiri</li>
                            <li>Buat Drive Bersama baru</li>
                            <li>Tambahkan Service Account <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">{settings.googleDriveClientEmail || 'email-sa'}</code> sebagai <strong>Content Manager</strong></li>
                            <li>Buat folder di dalam Drive Bersama tersebut</li>
                            <li>Copy Folder ID dari URL dan update di pengaturan</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {driveStatus && !driveStatus.connected && driveStatus.configured && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-900/10">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">Koneksi Gagal</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{driveStatus.message}</p>
                    </div>
                  </div>
                  {driveStatus.error?.isApiDisabled && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Cara Mengaktifkan Google Drive API:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Buka <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5 font-medium">Google Drive API <ExternalLink className="w-2.5 h-2.5" /></a></li>
                          <li>Pastikan project yang benar dipilih di bagian atas</li>
                          <li>Klik <strong>Aktifkan/Enable</strong></li>
                          <li>Tunggu beberapa menit hingga propagasi selesai</li>
                          <li>Klik <strong>Tes Koneksi</strong> lagi di atas</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {driveStatus.error?.isAuthError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Tips Memperbaiki Kredensial:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Pastikan Service Account Email sesuai dengan yang ada di Google Cloud Console</li>
                          <li>Pastikan Private Key di-copy utuh dari file JSON kredensial</li>
                          <li>Private key harus dimulai dengan <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">-----BEGIN PRIVATE KEY-----</code></li>
                          <li>Private key harus diakhiri dengan <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">-----END PRIVATE KEY-----</code></li>
                          <li>Jika masih gagal, buat Service Account key baru dan download ulang</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {driveStatus.error?.isPermissionError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Cara Memberikan Akses Folder:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Buka Google Drive dan cari folder target</li>
                          <li>Klik kanan folder → <strong>Bagikan/Share</strong></li>
                          <li>Tambahkan email Service Account: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">{settings.googleDriveClientEmail || 'email-sa@project.iam.gserviceaccount.com'}</code></li>
                          <li>Beri akses <strong>Editor</strong></li>
                          <li>Klik <strong>Kirim/Send</strong></li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {driveStatus.error?.isNotFoundError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Folder ID Tidak Ditemukan</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Pastikan Folder ID benar (dari URL folder Google Drive)</li>
                          <li>Format URL: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">drive.google.com/drive/folders/<strong>FOLDER_ID</strong></code></li>
                          <li>Pastikan folder sudah dibagikan ke Service Account</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {driveStatus.error?.isQuotaError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Kuota Penyimpanan Tidak Cukup</p>
                        <p>Service Account tidak memiliki kuota penyimpanan Google Drive. Gunakan Shared Drive (Drive Bersama) sebagai folder target.</p>
                        <ol className="list-decimal list-inside space-y-0.5 mt-1">
                          <li>Buat Drive Bersama/Shared Drive di Google Drive</li>
                          <li>Tambahkan Service Account sebagai Content Manager</li>
                          <li>Buat folder di dalam Drive Bersama</li>
                          <li>Update Folder ID di pengaturan</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {driveStatus && !driveStatus.configured && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/10">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Cara Mengatur Google Drive:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-600 dark:text-blue-400">
                      <li>Buka <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a></li>
                      <li>Buat project baru atau pilih project yang ada</li>
                      <li>Aktifkan <strong>Google Drive API</strong></li>
                      <li>Buat <strong>Service Account</strong> dan download kredensial JSON</li>
                      <li>Bagikan folder Google Drive target ke email Service Account</li>
                      <li>Masukkan email, private key, dan folder ID di bawah</li>
                    </ol>
                  </div>
                </div>
              )}

              <Separator />

              {/* Toggle show credentials */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDriveCredentials(!showDriveCredentials)}
                  className="gap-1.5 text-xs"
                >
                  <Key className="w-3 h-3" />
                  {showDriveCredentials ? 'Sembunyikan Kredensial' : 'Tampilkan Kredensial'}
                </Button>
                {hasDriveChange && (
                  <Badge variant="outline" className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    {driveSettingsConfig.filter((c) => isChanged(c.key)).length} perubahan
                  </Badge>
                )}
              </div>

              {/* Drive credential fields */}
              {showDriveCredentials && driveSettingsConfig.map((config, idx) => {
                const Icon = config.icon
                const changed = isChanged(config.key)
                const savingField = saving.has(config.key)
                const isPrivateKey = config.key === 'googleDrivePrivateKey'
                const hasExistingValue = !!originalSettings[config.key]
                const isEditingKey = isPrivateKey && editingPrivateKey

                return (
                  <div key={config.key}>
                    {idx > 0 && <Separator className="mb-4" />}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <Label className="text-sm font-medium">{config.label}</Label>
                          {changed && (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                            >
                              Diubah
                            </Badge>
                          )}
                          {isPrivateKey && hasExistingValue && !changed && !editingPrivateKey && (
                            <Badge variant="outline" className="text-[9px] font-medium bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                              Terisi
                            </Badge>
                          )}
                          {!isPrivateKey && config.sensitive && hasExistingValue && !changed && (
                            <Badge variant="outline" className="text-[9px] font-medium bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                              Terisi
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                        {isPrivateKey && hasExistingValue && !isEditingKey && !changed ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                              <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm text-muted-foreground font-mono">•••••••••••••••••••••••••••••••••••••••••••</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => {
                                setEditingPrivateKey(true)
                                handleChange('googleDrivePrivateKey', '')
                              }}
                            >
                              <Key className="w-3 h-3" />
                              Ganti Private Key
                            </Button>
                          </div>
                        ) : config.type === 'textarea' ? (
                          <Textarea
                            placeholder={config.placeholder}
                            value={settings[config.key] || ''}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            rows={4}
                            className={`resize-y font-mono text-xs overflow-x-auto break-all ${changed ? 'border-amber-300 focus-visible:ring-amber-200' : ''}`}
                          />
                        ) : (
                          <Input
                            placeholder={config.placeholder}
                            value={settings[config.key] || ''}
                            onChange={(e) => handleChange(config.key, e.target.value)}
                            className={changed ? 'border-amber-300 focus-visible:ring-amber-200' : ''}
                          />
                        )}
                        {config.key === 'googleDriveFolderId' && (
                          <p className="text-[11px] text-muted-foreground">
                            Dapatkan dari URL folder: drive.google.com/drive/folders/<strong className="text-foreground">FOLDER_ID</strong>
                          </p>
                        )}
                        {config.key === 'googleDriveDelegateEmail' && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground">
                              Email pengguna Google Workspace yang memiliki akses ke folder. Service Account akan mengunggah file atas nama pengguna ini.
                            </p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400">
                              Memerlukan domain-wide delegation di Google Workspace Admin Console → Security → API Controls → Domain-wide Delegation.
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={changed ? 'default' : 'outline'}
                        disabled={!changed || savingField}
                        onClick={() => handleSaveOne(config.key)}
                        className="gap-1.5 shrink-0 mt-6 sm:mt-0 sm:self-end"
                      >
                        {savingField ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : changed ? (
                          <Save className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        {savingField ? 'Menyimpan...' : changed ? 'Simpan' : 'Tersimpan'}
                      </Button>
                    </div>
                  </div>
                )
              })}

              {showDriveCredentials && hasDriveChange && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveAll(driveSettingsConfig)}
                    disabled={saveAllLoading}
                    size="sm"
                    className="gap-2"
                  >
                    {saveAllLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> Simpan Semua Kredensial</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Google Sheets */}
        <TabsContent value="sheets" className="space-y-4 mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Table2 className="w-4 h-4" />
                  Integrasi Google Sheets
                </CardTitle>
                <div className="flex items-center gap-2">
                  {sheetsStatus && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        sheetsStatus.connected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                          : sheetsStatus.configured
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
                      }`}
                    >
                      {sheetsStatus.connected ? (
                        <><Table2 className="w-3 h-3 mr-1" /> Terhubung</>
                      ) : sheetsStatus.configured ? (
                        <><CloudOff className="w-3 h-3 mr-1" /> Gagal Terhubung</>
                      ) : (
                        <><CloudOff className="w-3 h-3 mr-1" /> Belum Dikonfigurasi</>
                      )}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkSheetsStatus}
                    disabled={testingSheets}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingSheets ? 'animate-spin' : ''}`} />
                    Tes Koneksi
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connected info */}
              {sheetsStatus && sheetsStatus.connected && sheetsStatus.spreadsheet && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-900/10">
                  <Table2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                      {sheetsStatus.spreadsheet.title}
                    </p>
                    <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                      {sheetsStatus.spreadsheet.sheets.length} sheet: {sheetsStatus.spreadsheet.sheets.map(s => s.title).join(', ')}
                    </p>
                  </div>
                  <a
                    href={sheetsStatus.spreadsheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                      <ExternalLink className="w-3 h-3" />
                      Buka
                    </Button>
                  </a>
                </div>
              )}

              {/* Error info */}
              {sheetsStatus && !sheetsStatus.connected && sheetsStatus.configured && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-900/10">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">Koneksi Gagal</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{sheetsStatus.message}</p>
                    </div>
                  </div>
                  {sheetsStatus.error?.isApiDisabled && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Cara Mengaktifkan Google Sheets API:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Buka <a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5 font-medium">Google Sheets API <ExternalLink className="w-2.5 h-2.5" /></a></li>
                          <li>Pastikan project yang benar dipilih di bagian atas</li>
                          <li>Klik <strong>Aktifkan/Enable</strong></li>
                          <li>Tunggu beberapa menit hingga propagasi selesai</li>
                          <li>Klik <strong>Tes Koneksi</strong> lagi di atas</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {sheetsStatus.error?.isPermissionError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Cara Memberikan Akses Spreadsheet:</p>
                        <ol className="list-decimal list-inside space-y-0.5">
                          <li>Buka Google Sheets dan buka spreadsheet target</li>
                          <li>Klik <strong>Bagikan/Share</strong> di pojok kanan atas</li>
                          <li>Tambahkan email Service Account dari tab Google Drive</li>
                          <li>Beri akses <strong>Editor</strong></li>
                          <li>Klik <strong>Kirim/Send</strong></li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {sheetsStatus.error?.isAuthError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
                        <p className="font-medium">Kredensial Tidak Valid</p>
                        <p>Periksa Service Account Email dan Private Key di tab Google Drive. Google Sheets menggunakan kredensial yang sama.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Not configured info */}
              {sheetsStatus && !sheetsStatus.configured && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/10">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">Cara Mengatur Google Sheets:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-600 dark:text-blue-400">
                      <li>Pastikan Google Drive sudah terkonfigurasi (Service Account)</li>
                      <li>Buat atau buka Google Spreadsheet</li>
                      <li>Bagikan spreadsheet ke email Service Account dengan akses Editor</li>
                      <li>Copy Spreadsheet ID dari URL</li>
                      <li>Masukkan Spreadsheet ID dan nama sheet di bawah</li>
                    </ol>
                  </div>
                </div>
              )}

              <Separator />

              {/* Spreadsheet settings */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-sm font-medium">Spreadsheet ID</Label>
                      {isChanged('googleSheetsSpreadsheetId') && (
                        <Badge variant="outline" className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                          Diubah
                        </Badge>
                      )}
                      {!!originalSettings.googleSheetsSpreadsheetId && !isChanged('googleSheetsSpreadsheetId') && (
                        <Badge variant="outline" className="text-[9px] font-medium bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                          Terisi
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">ID dari URL Google Sheets yang menjadi target sinkronisasi</p>
                    <Input
                      placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ..."
                      value={settings.googleSheetsSpreadsheetId || ''}
                      onChange={(e) => handleChange('googleSheetsSpreadsheetId', e.target.value)}
                      className={isChanged('googleSheetsSpreadsheetId') ? 'border-amber-300 focus-visible:ring-amber-200' : ''}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Dapatkan dari URL: docs.google.com/spreadsheets/d/<strong className="text-foreground">SPREADSHEET_ID</strong>/edit
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isChanged('googleSheetsSpreadsheetId') ? 'default' : 'outline'}
                    disabled={!isChanged('googleSheetsSpreadsheetId') || saving.has('googleSheetsSpreadsheetId')}
                    onClick={() => handleSaveOne('googleSheetsSpreadsheetId')}
                    className="gap-1.5 shrink-0 sm:self-end"
                  >
                    {saving.has('googleSheetsSpreadsheetId') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving.has('googleSheetsSpreadsheetId') ? 'Menyimpan...' : isChanged('googleSheetsSpreadsheetId') ? 'Simpan' : 'Tersimpan'}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-sm font-medium">Nama Sheet Default (Data ASN)</Label>
                      {isChanged('googleSheetsSheetName') && (
                        <Badge variant="outline" className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                          Diubah
                        </Badge>
                      )}
                      {!!originalSettings.googleSheetsSheetName && !isChanged('googleSheetsSheetName') && (
                        <Badge variant="outline" className="text-[9px] font-medium bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                          Terisi
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Nama sheet/tab di Google Sheets untuk data ASN</p>
                    <Input
                      placeholder="Sheet1"
                      value={settings.googleSheetsSheetName || ''}
                      onChange={(e) => handleChange('googleSheetsSheetName', e.target.value)}
                      className={isChanged('googleSheetsSheetName') ? 'border-amber-300 focus-visible:ring-amber-200' : ''}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant={isChanged('googleSheetsSheetName') ? 'default' : 'outline'}
                    disabled={!isChanged('googleSheetsSheetName') || saving.has('googleSheetsSheetName')}
                    onClick={() => handleSaveOne('googleSheetsSheetName')}
                    className="gap-1.5 shrink-0 sm:self-end"
                  >
                    {saving.has('googleSheetsSheetName') ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving.has('googleSheetsSheetName') ? 'Menyimpan...' : isChanged('googleSheetsSheetName') ? 'Simpan' : 'Tersimpan'}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Auto-sync toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Auto-Sync ke Google Sheets</Label>
                  <p className="text-xs text-muted-foreground">Otomatis sinkronkan data form ke Sheets saat pengisian disubmit</p>
                </div>
                <Switch
                  checked={settings.googleSheetsAutoSync === 'true'}
                  onCheckedChange={async (checked) => {
                    const newValue = checked ? 'true' : 'false'
                    handleChange('googleSheetsAutoSync', newValue)
                    try {
                      const res = await fetch('/api/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ settings: { googleSheetsAutoSync: newValue }, userId }),
                      })
                      if (res.ok) {
                        setOriginalSettings(prev => ({ ...prev, googleSheetsAutoSync: newValue }))
                        addNotification(checked ? 'Auto-sync diaktifkan' : 'Auto-sync dinonaktifkan', 'success')
                      }
                    } catch {
                      addNotification('Gagal mengubah auto-sync', 'error')
                    }
                  }}
                />
              </div>

              {/* Manual sync buttons */}
              {sheetsStatus?.connected && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Sinkronisasi Manual</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={syncingAsn}
                        onClick={async () => {
                          setSyncingAsn(true)
                          try {
                            const res = await fetch('/api/google-sheets', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'sync-asn' }),
                            })
                            const data = await res.json()
                            if (res.ok && data.success) {
                              addNotification(data.message, 'success')
                            } else {
                              addNotification(data.error || 'Gagal sinkronisasi', 'error')
                            }
                          } catch {
                            addNotification('Gagal sinkronisasi ASN ke Sheets', 'error')
                          } finally {
                            setSyncingAsn(false)
                          }
                        }}
                      >
                        {syncingAsn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Sync Data ASN
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Info about Service Account */}
              <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/30 p-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">
                  Google Sheets menggunakan Service Account yang sama dengan Google Drive. Pastikan Google Drive API dan Google Sheets API sudah diaktifkan di Google Cloud Console, dan spreadsheet sudah dibagikan ke email Service Account.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Lainnya */}
        <TabsContent value="lainnya" className="space-y-4 mt-4">
          {/* Setup Wizard Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Setup Wizard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Jalankan kembali Setup Wizard untuk mengkonfigurasi ulang sistem dari awal. Ini akan mengatur ulang status setup tetapi tidak menghapus data yang sudah ada.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  try {
                    await fetch('/api/settings', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        settings: { setupCompleted: 'false' },
                        userId,
                      }),
                    })
                    addNotification('Setup Wizard akan ditampilkan saat login berikutnya', 'success')
                  } catch {
                    addNotification('Gagal mengatur ulang setup', 'error')
                  }
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Jalankan Setup Wizard
              </Button>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="border-border/60 bg-gradient-to-br from-[oklch(0.22_0.06_250)] to-[oklch(0.28_0.07_250)] text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Pratinjau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <img
                    src={settings.appLogo || '/logo.svg'}
                    alt="Logo BKAD"
                    className="w-8 h-8 object-contain brightness-0 invert"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {settings.appShortName || 'SIDATA BKAD'}
                  </h3>
                  <p className="text-[10px] text-white/50">
                    {settings.daerah || 'Kabupaten Seruyan'}
                  </p>
                </div>
              </div>
              <Separator className="bg-white/10 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/70">
                <div>
                  <span className="text-white/40 block mb-0.5">Nama Aplikasi</span>
                  <span className="text-white/90">{settings.appName || 'Sistem Pengumpulan Data ASN'}</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-0.5">Instansi</span>
                  <span className="text-white/90">{settings.instansiName || 'BKAD'}</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-0.5">Email</span>
                  <span className="text-white/90">{settings.instansiEmail || '-'}</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-0.5">Telepon</span>
                  <span className="text-white/90">{settings.instansiPhone || '-'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-white/40 block mb-0.5">Alamat</span>
                  <span className="text-white/90">{settings.instansiAddress || '-'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-white/40 block mb-0.5">Google Drive</span>
                  <span className="text-white/90 flex items-center gap-1.5">
                    {driveStatus?.connected ? (
                      <><Cloud className="w-3.5 h-3.5 text-emerald-400" /> Terhubung - {driveStatus.folder?.name}</>
                    ) : driveStatus?.configured ? (
                      <><CloudOff className="w-3.5 h-3.5 text-red-400" /> Tidak terhubung</>
                    ) : (
                      <><CloudOff className="w-3.5 h-3.5 text-white/40" /> Belum dikonfigurasi</>
                    )}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-white/40 block mb-0.5">Google Sheets</span>
                  <span className="text-white/90 flex items-center gap-1.5">
                    {sheetsStatus?.connected ? (
                      <><Table2 className="w-3.5 h-3.5 text-emerald-400" /> Terhubung - {sheetsStatus.spreadsheet?.title}</>
                    ) : sheetsStatus?.configured ? (
                      <><CloudOff className="w-3.5 h-3.5 text-red-400" /> Tidak terhubung</>
                    ) : (
                      <><Table2 className="w-3.5 h-3.5 text-white/40" /> Belum dikonfigurasi</>
                    )}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-white/40 block mb-0.5">Metode Login</span>
                  <span className="text-white/90 flex items-center gap-2">
                    {settings.loginWithNip !== 'false' && <Badge variant="outline" className="text-[9px] text-white/80 border-white/20">NIP/Password</Badge>}
                    {settings.loginWithGoogle === 'true' && <Badge variant="outline" className="text-[9px] text-white/80 border-white/20">Google</Badge>}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Drive Files Dialog */}
      <Dialog open={driveFilesDialogOpen} onOpenChange={setDriveFilesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              File di Google Drive
            </DialogTitle>
            <DialogDescription>
              File yang terupload ke folder Google Drive
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {driveStatus?.folder && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4" />
                <span>Folder: <strong>{driveStatus.folder.name}</strong></span>
              </div>
            )}
            <ScrollArea className="max-h-96">
              {driveStatus?.files && driveStatus.files.length > 0 ? (
                <div className="space-y-2">
                  {driveStatus.files.map((file: any, idx: number) => (
                    <div
                      key={file.id || idx}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {file.mimeType?.replace('application/', '').replace('image/', 'img: ')}
                          {file.size && ` • ${(Number(file.size) / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada file di folder</p>
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={checkDriveStatus} disabled={testingDrive}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testingDrive ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
