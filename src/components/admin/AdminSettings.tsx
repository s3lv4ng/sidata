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
} from 'lucide-react'

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
    sensitive: true,
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

  // Google Drive state
  const [driveStatus, setDriveStatus] = useState<{
    configured: boolean
    connected: boolean
    folder?: { name: string; id: string }
    files?: any[]
    message: string
  } | null>(null)
  const [testingDrive, setTestingDrive] = useState(false)
  const [driveFilesDialogOpen, setDriveFilesDialogOpen] = useState(false)
  const [showDriveCredentials, setShowDriveCredentials] = useState(false)

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

      {/* Google Drive Integration Section */}
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
                    driveStatus.connected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                      : driveStatus.configured
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                        : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800'
                  }`}
                >
                  {driveStatus.connected ? (
                    <><Cloud className="w-3 h-3 mr-1" /> Terhubung</>
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection info */}
          {driveStatus && driveStatus.connected && driveStatus.folder && (
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
          )}

          {driveStatus && !driveStatus.connected && driveStatus.configured && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-900/10">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{driveStatus.message}</p>
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
                      {config.sensitive && hasExistingValue && !changed && (
                        <Badge variant="outline" className="text-[9px] font-medium bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                          Terisi
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                    {config.type === 'textarea' ? (
                      <Textarea
                        placeholder={config.placeholder}
                        value={isPrivateKey && hasExistingValue && !changed ? '••••••••••••••••' : (settings[config.key] || '')}
                        onChange={(e) => handleChange(config.key, e.target.value)}
                        onFocus={() => {
                          if (isPrivateKey && hasExistingValue && settings[config.key] === originalSettings[config.key]) {
                            handleChange(config.key, '')
                          }
                        }}
                        rows={4}
                        className={`resize-y font-mono text-xs ${changed ? 'border-amber-300 focus-visible:ring-amber-200' : ''}`}
                      />
                    ) : (
                      <Input
                        placeholder={config.placeholder}
                        value={isPrivateKey && hasExistingValue && !changed ? '••••••••••••••••' : (settings[config.key] || '')}
                        onChange={(e) => handleChange(config.key, e.target.value)}
                        onFocus={() => {
                          if (config.sensitive && hasExistingValue && settings[config.key] === originalSettings[config.key]) {
                            handleChange(config.key, '')
                          }
                        }}
                        className={changed ? 'border-amber-300 focus-visible:ring-amber-200' : ''}
                      />
                    )}
                    {config.key === 'googleDriveFolderId' && (
                      <p className="text-[11px] text-muted-foreground">
                        Dapatkan dari URL folder: drive.google.com/drive/folders/<strong className="text-foreground">FOLDER_ID</strong>
                      </p>
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
                src="/logo.svg"
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
          </div>
        </CardContent>
      </Card>

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
