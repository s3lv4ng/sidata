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

export default function AdminSettings() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()
  const userId = (session?.user as any)?.id || ''

  const [settings, setSettings] = useState<SettingsMap>({})
  const [originalSettings, setOriginalSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [saveAllLoading, setSaveAllLoading] = useState(false)

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

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const isChanged = (key: string) => {
    return (settings[key] || '') !== (originalSettings[key] || '')
  }

  const hasAnyChange = settingsConfig.some((c) => isChanged(c.key))

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
        const label = settingsConfig.find((c) => c.key === key)?.label || key
        addNotification(`"${label}" berhasil disimpan`, 'success')
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

  const handleSaveAll = async () => {
    try {
      setSaveAllLoading(true)
      const changedSettings: SettingsMap = {}
      settingsConfig.forEach((c) => {
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
          onClick={handleSaveAll}
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
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
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
                          className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200"
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
                          className="text-[9px] font-medium bg-amber-50 text-amber-600 border-amber-200"
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
