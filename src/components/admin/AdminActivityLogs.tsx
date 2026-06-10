'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { RefreshCw, Search, Download, FileSpreadsheet } from 'lucide-react'
import { PaginationBar } from '@/components/shared/PaginationBar'

interface ActivityLog {
  id: string
  userId: string
  action: string
  details: string | null
  ipAddress: string | null
  createdAt: string
  user: {
    name: string
    nip: string
    role: string
  }
}

type ActionType =
  | 'LOGIN'
  | 'CREATE_FORM'
  | 'UPDATE_FORM'
  | 'DELETE_FORM'
  | 'SUBMIT_RESPONSE'
  | 'UPDATE_RESPONSE'
  | 'CREATE_ASN'
  | 'UPDATE_ASN'
  | 'DELETE_ASN'
  | 'CREATE_ANNOUNCEMENT'
  | 'UPDATE_ANNOUNCEMENT'
  | 'DELETE_ANNOUNCEMENT'
  | 'SEED_DATABASE'

const ACTION_TYPES: ActionType[] = [
  'LOGIN',
  'CREATE_FORM',
  'UPDATE_FORM',
  'DELETE_FORM',
  'SUBMIT_RESPONSE',
  'UPDATE_RESPONSE',
  'CREATE_ASN',
  'UPDATE_ASN',
  'DELETE_ASN',
  'CREATE_ANNOUNCEMENT',
  'UPDATE_ANNOUNCEMENT',
  'DELETE_ANNOUNCEMENT',
  'SEED_DATABASE',
]

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
  if (action === 'LOGIN') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
  if (action.startsWith('CREATE_')) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
  if (action.startsWith('UPDATE_')) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
  if (action.startsWith('DELETE_')) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800'
  if (action === 'SEED_DATABASE') return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800'
  return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-muted dark:text-muted-foreground dark:border-muted'
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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AdminActivityLogs() {
  const { addNotification } = useAppStore()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [exporting, setExporting] = useState(false)
  const pageSize = 10

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('limit', pageSize.toString())
      params.set('offset', ((page - 1) * pageSize).toString())
      if (actionFilter && actionFilter !== 'all') {
        params.set('action', actionFilter)
      }
      if (search.trim()) {
        params.set('search', search.trim())
      }
      const res = await fetch(`/api/activity-logs?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      } else {
        addNotification('Gagal memuat log aktivitas', 'error')
      }
    } catch {
      addNotification('Gagal memuat log aktivitas', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, search, addNotification])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchLogs()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchLogs])

  const handleSearch = () => {
    setPage(1)
    fetchLogs()
  }

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value)
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  const handleExportExcel = async () => {
    try {
      setExporting(true)
      // Fetch all matching logs for export
      const params = new URLSearchParams()
      params.set('limit', total.toString())
      params.set('offset', '0')
      if (actionFilter && actionFilter !== 'all') {
        params.set('action', actionFilter)
      }
      if (search.trim()) {
        params.set('search', search.trim())
      }
      const res = await fetch(`/api/activity-logs?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        addNotification('Gagal mengekspor data', 'error')
        return
      }

      // Dynamically import xlsx
      const XLSX = await import('xlsx')
      const exportData = (data.logs || []).map((log: ActivityLog, index: number) => ({
        No: index + 1,
        Waktu: formatDateTime(log.createdAt),
        User: log.user?.name || '-',
        NIP: log.user?.nip || '-',
        Aksi: ACTION_LABELS[log.action] || log.action,
        Detail: log.details || '-',
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Log Aktivitas')
      XLSX.writeFile(wb, `log-aktivitas-${new Date().toISOString().slice(0, 10)}.xlsx`)
      addNotification('Berhasil mengekspor log aktivitas', 'success')
    } catch {
      addNotification('Gagal mengekspor data', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Log Aktivitas</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Pantau semua aktivitas yang terjadi di sistem · Total: <span className="font-semibold">{total}</span> catatan
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          {/* Export Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting || total === 0}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            Ekspor Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan nama user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={handleActionFilterChange}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <Separator className="my-1" />
                <SelectItem value="CREATE_FORM">Buat Form</SelectItem>
                <SelectItem value="UPDATE_FORM">Ubah Form</SelectItem>
                <SelectItem value="DELETE_FORM">Hapus Form</SelectItem>
                <Separator className="my-1" />
                <SelectItem value="SUBMIT_RESPONSE">Kirim Respon</SelectItem>
                <SelectItem value="UPDATE_RESPONSE">Ubah Respon</SelectItem>
                <Separator className="my-1" />
                <SelectItem value="CREATE_ASN">Tambah ASN</SelectItem>
                <SelectItem value="UPDATE_ASN">Ubah ASN</SelectItem>
                <SelectItem value="DELETE_ASN">Hapus ASN</SelectItem>
                <Separator className="my-1" />
                <SelectItem value="CREATE_ANNOUNCEMENT">Buat Pengumuman</SelectItem>
                <SelectItem value="UPDATE_ANNOUNCEMENT">Ubah Pengumuman</SelectItem>
                <SelectItem value="DELETE_ANNOUNCEMENT">Hapus Pengumuman</SelectItem>
                <Separator className="my-1" />
                <SelectItem value="SEED_DATABASE">Seed Database</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="default" onClick={handleSearch} className="gap-1.5">
              <Search className="w-4 h-4" />
              Cari
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="flex flex-col max-h-[calc(100vh-340px)]">
        <CardContent className="p-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Memuat log aktivitas...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileSpreadsheet className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Tidak ada log aktivitas ditemukan</p>
              <p className="text-xs mt-1">Coba ubah filter pencarian Anda</p>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">No</TableHead>
                    <TableHead className="min-w-[180px]">Waktu</TableHead>
                    <TableHead className="min-w-[150px]">User</TableHead>
                    <TableHead className="min-w-[150px]">Aksi</TableHead>
                    <TableHead className="min-w-[200px]">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {(page - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{formatDateTime(log.createdAt)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatTimeAgo(log.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{log.user?.name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{log.user?.nip || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[11px] font-medium border ${getActionBadgeClasses(log.action)}`}
                          variant="outline"
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {log.details || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={total}
          itemsPerPage={pageSize}
          itemName="catatan"
        />
      </Card>
    </div>
  )
}
