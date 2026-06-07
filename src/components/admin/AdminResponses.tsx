'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination'
import {
  ClipboardList,
  Search,
  Eye,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  UserX,
  UserCheck,
  Users,
  FileText,
  Paperclip,
  ExternalLink,
  HardDrive,
  BarChart3,
  TrendingUp,
  Table2,
  Upload,
  ImageIcon,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import * as XLSX from 'xlsx'

interface FormOption {
  id: string
  title: string
}

interface FieldResponseItem {
  id: string
  fieldId: string
  value: string | null
  fileName: string | null
  filePath: string | null
  driveFileId: string | null
  driveLink: string | null
  field: {
    id: string
    label: string
    type: string
    options: string | null
    order: number
  }
}

interface ResponseItem {
  id: string
  formId: string
  userId: string
  isSubmitted: boolean
  submittedAt: string
  user: {
    id: string
    name: string
    nip: string
    bidang: string | null
    jabatan: string | null
    pangkat: string | null
  }
  fields: FieldResponseItem[]
}

interface FormDetail {
  id: string
  title: string
  description: string | null
  isActive: boolean
  isClosed: boolean
  deadline: string | null
  fields: Array<{
    id: string
    label: string
    type: string
    options: string | null
    order: number
  }>
  responses: Array<{
    id: string
    userId: string
    user: {
      id: string
      name: string
      nip: string
      bidang: string | null
    }
  }>
}

interface ASNItem {
  id: string
  nip: string
  name: string
  bidang: string | null
  statusASN: string | null
}

const ITEMS_PER_PAGE = 10
const BIDANG_OPTIONS = ['Pendapatan', 'Belanja', 'Aset', 'Umum']

function CircularProgress({ value, size = 80, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} stroke="oklch(0.92 0.01 220)" strokeWidth={strokeWidth} fill="none" />
      <circle cx={size/2} cy={size/2} r={radius} stroke="oklch(0.45 0.14 250)" strokeWidth={strokeWidth} fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-500" />
    </svg>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
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

function parseFieldValue(value: string | null, type: string): string {
  if (!value) return '—'
  if (type === 'checkbox') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.join(', ')
      }
    } catch {
      // not JSON, return as is
    }
  }
  return value
}

export default function AdminResponses() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()

  // Form selection
  const [forms, setForms] = useState<FormOption[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>('')
  const [formDetail, setFormDetail] = useState<FormDetail | null>(null)
  const [responses, setResponses] = useState<ResponseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingForms, setLoadingForms] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Filters
  const [bidangFilter, setBidangFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null)

  // Expandable not-responded section
  const [notRespondedOpen, setNotRespondedOpen] = useState(false)

  // All ASN for not-responded list
  const [allASN, setAllASN] = useState<ASNItem[]>([])
  const [syncingToSheets, setSyncingToSheets] = useState(false)

  // Fetch forms list
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoadingForms(true)
        const res = await fetch('/api/forms')
        if (res.ok) {
          const data = await res.json()
          setForms(
            data.map((f: any) => ({
              id: f.id,
              title: f.title,
            }))
          )
          if (data.length > 0 && !selectedFormId) {
            setSelectedFormId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch forms:', err)
      } finally {
        setLoadingForms(false)
      }
    }
    fetchForms()
  }, [])

  // Fetch all ASN (for not-responded list)
  useEffect(() => {
    const fetchASN = async () => {
      try {
        const res = await fetch('/api/asn')
        if (res.ok) {
          const data = await res.json()
          setAllASN(data)
        }
      } catch (err) {
        console.error('Failed to fetch ASN:', err)
      }
    }
    fetchASN()
  }, [])

  // Fetch responses when form changes
  const fetchResponses = useCallback(async () => {
    if (!selectedFormId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/responses?formId=${selectedFormId}`)
      if (res.ok) {
        const data = await res.json()
        setResponses(data)
      }
    } catch (err) {
      console.error('Failed to fetch responses:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedFormId])

  // Fetch form detail
  const fetchFormDetail = useCallback(async () => {
    if (!selectedFormId) return
    try {
      setLoadingDetail(true)
      const res = await fetch(`/api/forms/${selectedFormId}`)
      if (res.ok) {
        const data = await res.json()
        setFormDetail(data)
      }
    } catch (err) {
      console.error('Failed to fetch form detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }, [selectedFormId])

  useEffect(() => {
    if (selectedFormId) {
      fetchResponses()
      fetchFormDetail()
      setCurrentPage(1)
      setBidangFilter('all')
      setSearchQuery('')
    }
  }, [selectedFormId, fetchResponses, fetchFormDetail])

  // Filtered responses
  const filteredResponses = responses.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user.nip.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesBidang =
      bidangFilter === 'all' || r.user.bidang === bidangFilter
    return matchesSearch && matchesBidang
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredResponses.length / ITEMS_PER_PAGE))
  const paginatedResponses = filteredResponses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  // Statistics
  const respondedUserIds = new Set(responses.map((r) => r.userId))
  const totalResponded = respondedUserIds.size
  const totalASN = allASN.length
  const totalNotResponded = allASN.filter((a) => !respondedUserIds.has(a.id)).length
  const notRespondedList = allASN.filter((a) => !respondedUserIds.has(a.id))

  // Filter not-responded list by bidang
  const filteredNotResponded = notRespondedList.filter((a) => {
    if (bidangFilter === 'all') return true
    return a.bidang === bidangFilter
  })

  const handleViewDetail = (response: ResponseItem) => {
    setSelectedResponse(response)
    setDetailDialogOpen(true)
  }

  const handleExport = () => {
    if (!formDetail || filteredResponses.length === 0) {
      addNotification('Tidak ada data untuk diekspor', 'warning')
      return
    }

    try {
      const fieldHeaders = formDetail.fields
        .sort((a, b) => a.order - b.order)
        .map((f) => f.label)

      const exportData = filteredResponses.map((r, index) => {
        const row: Record<string, string | number> = {
          No: index + 1,
          Nama: r.user.name,
          NIP: r.user.nip,
          Bidang: r.user.bidang || '-',
          'Tanggal Pengisian': formatDateTime(r.submittedAt),
        }

        // Add field responses
        formDetail.fields
          .sort((a, b) => a.order - b.order)
          .forEach((field) => {
            const fieldResp = r.fields.find((fr) => fr.fieldId === field.id)
            row[field.label] = fieldResp
              ? parseFieldValue(fieldResp.value, field.type)
              : '—'
          })

        return row
      })

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Respons')

      // Set column widths
      const colWidths = [
        { wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        ...fieldHeaders.map((h) => ({ wch: Math.max(h.length + 5, 15) })),
      ]
      ws['!cols'] = colWidths

      XLSX.writeFile(
        wb,
        `Respons_${formDetail.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      addNotification('Data respons berhasil diekspor', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      addNotification('Gagal mengekspor data', 'error')
    }
  }

  // Loading state for initial form load
  if (loadingForms) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data form...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Hasil Pengisian</h2>
            <p className="text-xs text-muted-foreground">
              Lihat respons pengisian form oleh ASN
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExport}
            disabled={!selectedFormId || filteredResponses.length === 0}
          >
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!selectedFormId || filteredResponses.length === 0 || syncingToSheets}
            onClick={async () => {
              if (!selectedFormId) return
              setSyncingToSheets(true)
              try {
                const res = await fetch('/api/google-sheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'sync-responses', formId: selectedFormId }),
                })
                const data = await res.json()
                if (res.ok && data.success) {
                  addNotification(data.message, 'success')
                } else {
                  addNotification(data.error || 'Gagal sinkronisasi ke Sheets', 'error')
                }
              } catch {
                addNotification('Gagal sinkronisasi ke Sheets', 'error')
              } finally {
                setSyncingToSheets(false)
              }
            }}
          >
            {syncingToSheets ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table2 className="w-4 h-4" />}
            {syncingToSheets ? 'Syncing...' : 'Sync ke Sheets'}
          </Button>
        </div>
      </div>

      {/* Form Selector */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-1.5 block">Pilih Form</Label>
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih form..." />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Filter Bidang</Label>
                <Select value={bidangFilter} onValueChange={(val) => { setBidangFilter(val); setCurrentPage(1) }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Bidang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Bidang</SelectItem>
                    {BIDANG_OPTIONS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Label className="text-sm font-medium mb-1.5 block invisible">Cari</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama/NIP..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    className="pl-9 w-[180px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedFormId ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              Pilih form untuk melihat respons
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Gunakan dropdown di atas untuk memilih form
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 dark:bg-emerald-900/30">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalResponded}</p>
                  <p className="text-xs text-muted-foreground">Sudah Mengisi</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 dark:bg-red-900/30">
                  <UserX className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalNotResponded}</p>
                  <p className="text-xs text-muted-foreground">Belum Mengisi</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 dark:bg-sky-900/30">
                  <Users className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalASN}</p>
                  <p className="text-xs text-muted-foreground">Total ASN</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Response Summary Analytics */}
          {!loading && formDetail && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Completion Rate */}
              <Card className="border-border/60">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <div className="relative">
                    <CircularProgress value={totalASN > 0 ? Math.round((totalResponded / totalASN) * 100) : 0} size={90} strokeWidth={7} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-foreground">
                        {totalASN > 0 ? Math.round((totalResponded / totalASN) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mt-2">Tingkat Penyelesaian</p>
                  <p className="text-[11px] text-muted-foreground/60">{totalResponded} dari {totalASN} ASN</p>
                </CardContent>
              </Card>

              {/* Per-Bidang Breakdown */}
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <p className="text-xs font-semibold text-foreground">Per Bidang</p>
                  </div>
                  <div className="space-y-2.5">
                    {(() => {
                      const bidangData = BIDANG_OPTIONS.map((bidang) => {
                        const totalInBidang = allASN.filter((a) => a.bidang === bidang).length
                        const respondedInBidang = allASN.filter(
                          (a) => a.bidang === bidang && respondedUserIds.has(a.id)
                        ).length
                        const pct = totalInBidang > 0 ? Math.round((respondedInBidang / totalInBidang) * 100) : 0
                        return { bidang, totalInBidang, respondedInBidang, pct }
                      })
                      return bidangData.map((bd) => (
                        <div key={bd.bidang}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-foreground">{bd.bidang}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {bd.respondedInBidang}/{bd.totalInBidang} ({bd.pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${bd.pct}%`,
                                backgroundColor:
                                  bd.pct >= 75
                                    ? 'oklch(0.6 0.15 160)'
                                    : bd.pct >= 50
                                    ? 'oklch(0.7 0.14 75)'
                                    : bd.pct > 0
                                    ? 'oklch(0.65 0.15 50)'
                                    : 'oklch(0.85 0.01 220)',
                              }}
                            />
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Response Timeline */}
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <p className="text-xs font-semibold text-foreground">Timeline Respons</p>
                  </div>
                  {(() => {
                    const timelineData = (() => {
                      if (responses.length === 0) return []
                      const dateMap = new Map<string, number>()
                      responses.forEach((r) => {
                        const dateKey = new Date(r.submittedAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                        })
                        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1)
                      })
                      return Array.from(dateMap.entries()).map(([date, count]) => ({
                        date,
                        jumlah: count,
                      }))
                    })()
                    if (timelineData.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-[100px] text-xs text-muted-foreground">
                          Belum ada respons
                        </div>
                      )
                    }
                    return (
                      <ResponsiveContainer width="100%" height={100}>
                        <AreaChart data={timelineData} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <RechartsTooltip
                            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid oklch(0.88 0.01 220)' }}
                            formatter={(value: number) => [`${value} respons`, 'Jumlah']}
                          />
                          <defs>
                            <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="oklch(0.55 0.15 170)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="oklch(0.55 0.15 170)" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="jumlah"
                            stroke="oklch(0.45 0.14 170)"
                            fill="url(#timelineGrad)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Field Completion Rate */}
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <p className="text-xs font-semibold text-foreground">Kelengkapan Isian</p>
                  </div>
                  {(() => {
                    const fieldData = formDetail.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => {
                        const filledCount = responses.filter((r) => {
                          const fr = r.fields.find((f) => f.fieldId === field.id)
                          return fr && fr.value && fr.value.trim() !== ''
                        }).length
                        const pct = responses.length > 0 ? Math.round((filledCount / responses.length) * 100) : 0
                        return { label: field.label, filledCount, pct }
                      })

                    if (fieldData.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-[100px] text-xs text-muted-foreground">
                          Tidak ada field
                        </div>
                      )
                    }

                    const chartData = fieldData.map((fd) => ({
                      name: fd.label.length > 14 ? fd.label.slice(0, 14) + '…' : fd.label,
                      fullName: fd.label,
                      pct: fd.pct,
                      filled: fd.filledCount,
                    }))

                    const barColors = chartData.map((d) =>
                      d.pct >= 80
                        ? 'oklch(0.6 0.15 160)'
                        : d.pct >= 50
                        ? 'oklch(0.7 0.14 75)'
                        : d.pct > 0
                        ? 'oklch(0.65 0.15 50)'
                        : 'oklch(0.85 0.01 220)'
                    )

                    return (
                      <ResponsiveContainer width="100%" height={Math.max(100, chartData.length * 24)}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 2, right: 10, left: 0, bottom: 2 }}>
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={(v: number) => `${v}%`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} />
                          <RechartsTooltip
                            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid oklch(0.88 0.01 220)' }}
                            formatter={(value: number, _name: string, props: any) => [
                              `${value}% (${props.payload.filled}/${responses.length})`,
                              props.payload.fullName,
                            ]}
                          />
                          <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={14}>
                            {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={barColors[index]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })()}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Responses Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">Memuat respons...</span>
            </div>
          ) : filteredResponses.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ClipboardList className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  Belum ada respons untuk form ini
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Respons akan muncul setelah ASN mengisi form
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 flex flex-col max-h-[calc(100vh-380px)]">
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead className="min-w-[180px]">Nama</TableHead>
                      <TableHead className="min-w-[140px]">NIP</TableHead>
                      <TableHead className="w-[120px]">Bidang</TableHead>
                      <TableHead className="w-[160px]">Tanggal Pengisian</TableHead>
                      <TableHead className="w-[80px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResponses.map((r, index) => (
                      <TableRow key={r.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleViewDetail(r)}>
                        <TableCell className="text-center text-muted-foreground text-sm">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm text-foreground">{r.user.name}</p>
                          {r.user.jabatan && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {r.user.jabatan}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-foreground">{r.user.nip}</span>
                        </TableCell>
                        <TableCell>
                          {r.user.bidang ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-medium bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800"
                            >
                              {r.user.bidang}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {formatDateTime(r.submittedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetail(r)
                              }}
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination - outside ScrollArea, pinned to bottom */}
              {totalPages > 1 && (
                <div className="border-t bg-muted/20 px-4 py-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredResponses.length)} dari{' '}
                      {filteredResponses.length} respons
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={
                              currentPage === 1
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                        {getPageNumbers().map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={page === currentPage}
                              onClick={() => setCurrentPage(page)}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={
                              currentPage === totalPages
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Not Responded Section */}
          <Collapsible open={notRespondedOpen} onOpenChange={setNotRespondedOpen}>
            <Card className="border-border/60">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center dark:bg-red-900/30">
                        <UserX className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          ASN yang Belum Mengisi
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {filteredNotResponded.length} ASN belum mengisi form ini
                        </p>
                      </div>
                    </div>
                    {notRespondedOpen ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                  <Separator className="mb-3" />
                  {filteredNotResponded.length === 0 ? (
                    <div className="text-center py-6">
                      <UserCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Semua ASN sudah mengisi form ini!
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">
                        {filteredNotResponded.map((asn) => (
                          <div
                            key={asn.id}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 dark:bg-muted">
                                <span className="text-xs font-semibold text-gray-500">
                                  {asn.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {asn.name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {asn.nip}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {asn.bidang && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800"
                                >
                                  {asn.bidang}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-red-50 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800"
                              >
                                Belum mengisi
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}

      {/* Response Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center dark:bg-teal-900/30">
                <ClipboardList className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              Detail Respons
            </DialogTitle>
            <DialogDescription className="text-sm">
              Respons dari {selectedResponse?.user.name} — {formDetail?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedResponse && (
            <div className="space-y-4">
              {/* Respondent Info */}
              <Card className="border-border/60">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nama</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedResponse.user.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">NIP</p>
                      <p className="text-sm font-mono text-foreground">
                        {selectedResponse.user.nip}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bidang</p>
                      <p className="text-sm text-foreground">
                        {selectedResponse.user.bidang || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tanggal Pengisian</p>
                      <p className="text-sm text-foreground">
                        {formatDateTime(selectedResponse.submittedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Field Responses */}
              <div className="space-y-3">
                {formDetail?.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => {
                    const fieldResp = selectedResponse.fields.find(
                      (fr) => fr.fieldId === field.id
                    )
                    const displayValue = fieldResp
                      ? parseFieldValue(fieldResp.value, field.type)
                      : '—'
                    const isSingleFileField = field.type === 'file_upload' || field.type === 'image_upload'
                    const isMultiFileField = field.type === 'multi_upload'
                    const isFileField = isSingleFileField || isMultiFileField
                    const hasFile = isSingleFileField && fieldResp?.filePath
                    const hasMultiFiles = isMultiFileField && fieldResp?.value
                    let multiFiles: Array<{ name: string; path: string; driveFileId?: string; driveLink?: string }> = []
                    if (hasMultiFiles) {
                      try {
                        const parsed = JSON.parse(fieldResp.value!)
                        if (Array.isArray(parsed)) {
                          multiFiles = parsed
                        }
                      } catch {
                        // not valid JSON
                      }
                    }
                    const isImageField = field.type === 'image_upload'

                    return (
                      <div
                        key={field.id}
                        className="p-3 rounded-lg border border-border/50 bg-muted/10"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground">
                            {field.label}
                            {!isFileField && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({field.type === 'short_text'
                                  ? 'Isian Singkat'
                                  : field.type === 'paragraph'
                                  ? 'Paragraf'
                                  : field.type === 'number'
                                  ? 'Angka'
                                  : field.type === 'date'
                                  ? 'Tanggal'
                                  : field.type === 'multiple_choice'
                                  ? 'Pilihan Ganda'
                                  : field.type === 'checkbox'
                                  ? 'Checkbox'
                                  : field.type === 'dropdown'
                                  ? 'Dropdown'
                                  : field.type === 'email'
                                  ? 'Email'
                                  : field.type === 'phone'
                                  ? 'Telepon'
                                  : field.type === 'url'
                                  ? 'URL'
                                  : field.type === 'rating'
                                  ? 'Rating'
                                  : ''})
                              </span>
                            )}
                            {isFileField && (
                              <Badge
                                variant="outline"
                                className="text-[10px] ml-1.5 py-0 px-1.5 bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800"
                              >
                                {field.type === 'file_upload'
                                  ? 'File'
                                  : field.type === 'image_upload'
                                  ? 'Gambar'
                                  : 'Multi File'}
                              </Badge>
                            )}
                          </p>
                        </div>

                        {isSingleFileField ? (
                          hasFile ? (
                            <div className="space-y-2 mt-1">
                              {isImageField && (
                                <div className="mt-1">
                                  <img
                                    src={fieldResp.filePath}
                                    alt={fieldResp.fileName || 'Preview gambar'}
                                    className="max-w-[200px] max-h-[150px] rounded-md border border-border/50 object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {isImageField ? (
                                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                                <a
                                  href={fieldResp.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {fieldResp.fileName || 'Lihat File'}
                                </a>
                                <a
                                  href={`${fieldResp.filePath}${fieldResp.filePath.includes('?') ? '&' : '?'}download=true`}
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  title="Unduh file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Unduh
                                </a>
                              </div>
                              {fieldResp?.driveLink && (
                                <div className="flex items-center gap-2 pl-5">
                                  <a
                                    href={fieldResp.driveLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                  >
                                    <HardDrive className="w-3 h-3" />
                                    Buka di Google Drive
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              Tidak ada file diunggah
                            </p>
                          )
                        ) : isMultiFileField ? (
                          hasMultiFiles && multiFiles.length > 0 ? (
                            <div className="space-y-2 mt-1">
                              {multiFiles.map((mf, mfIdx) => (
                                <div key={mfIdx} className="flex items-center gap-2 flex-wrap">
                                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                                  <a
                                    href={mf.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    {mf.name || `File ${mfIdx + 1}`}
                                  </a>
                                  <a
                                    href={`${mf.path}${mf.path.includes('?') ? '&' : '?'}download=true`}
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                    title="Unduh file"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Unduh
                                  </a>
                                  {mf.driveLink && (
                                    <a
                                      href={mf.driveLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                    >
                                      <HardDrive className="w-3 h-3" />
                                      Drive
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              Tidak ada file diunggah
                            </p>
                          )
                        ) : (
                          <p className="text-sm text-foreground whitespace-pre-wrap mt-1">
                            {displayValue}
                          </p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
