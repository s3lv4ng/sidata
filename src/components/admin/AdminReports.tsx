'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
  UserX,
  TrendingUp,
  Search,
  Eye,
  CalendarDays,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface FormOption {
  id: string
  title: string
}

interface ReportField {
  id: string
  label: string
  type: string
  options: string | null
  order: number
}

interface ReportResponse {
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
    unitKerja: string | null
  }
  fields: Array<{
    id: string
    fieldId: string
    value: string | null
    fileName: string | null
    filePath: string | null
    field: {
      id: string
      label: string
      type: string
      options: string | null
      order: number
    }
  }>
}

interface UnrespondedASN {
  id: string
  name: string
  nip: string
  bidang: string | null
  jabatan: string | null
}

interface ReportData {
  form: {
    id: string
    title: string
    description: string | null
    fields: ReportField[]
  }
  responses: ReportResponse[]
  unrespondedASN: UnrespondedASN[]
  totalResponded: number
  totalUnresponded: number
}

const BIDANG_OPTIONS = ['Pendapatan', 'Belanja', 'Aset', 'Umum']

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

export default function AdminReports() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()

  // Form selection
  const [forms, setForms] = useState<FormOption[]>([])
  const [loadingForms, setLoadingForms] = useState(true)
  const [selectedFormId, setSelectedFormId] = useState<string>('')

  // Filters
  const [bidangFilter, setBidangFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Report data
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  // Search in table
  const [searchQuery, setSearchQuery] = useState('')

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<ReportResponse | null>(null)

  // Export loading
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Fetch forms list
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoadingForms(true)
        const res = await fetch('/api/forms')
        if (res.ok) {
          const data = await res.json()
          setForms(
            data.map((f: { id: string; title: string }) => ({
              id: f.id,
              title: f.title,
            }))
          )
        }
      } catch (err) {
        console.error('Failed to fetch forms:', err)
      } finally {
        setLoadingForms(false)
      }
    }
    fetchForms()
  }, [])

  const handleFetchReport = async () => {
    if (!selectedFormId) {
      addNotification('Pilih form terlebih dahulu', 'warning')
      return
    }

    try {
      setLoading(true)
      setHasFetched(true)
      const params = new URLSearchParams()
      params.set('formId', selectedFormId)
      if (bidangFilter && bidangFilter !== 'all') params.set('bidang', bidangFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/reports?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setReportData(data)
      } else {
        const errData = await res.json()
        addNotification(errData.error || 'Gagal memuat laporan', 'error')
      }
    } catch (err) {
      console.error('Failed to fetch report:', err)
      addNotification('Gagal memuat laporan', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filtered responses for table search
  const filteredResponses = (reportData?.responses || []).filter((r) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      r.user.name.toLowerCase().includes(q) ||
      r.user.nip.toLowerCase().includes(q) ||
      (r.user.bidang || '').toLowerCase().includes(q)
    )
  })

  // Statistics
  const totalResponded = reportData?.totalResponded || 0
  const totalUnresponded = reportData?.totalUnresponded || 0
  const totalASN = totalResponded + totalUnresponded
  const completionRate = totalASN > 0 ? ((totalResponded / totalASN) * 100).toFixed(1) : '0.0'

  // Rekap per bidang
  const rekapPerBidang = (() => {
    if (!reportData) return []
    const bidangMap: Record<string, { responded: number; unresponded: number; total: number }> = {}

    // Count responded per bidang
    reportData.responses.forEach((r) => {
      const b = r.user.bidang || 'Lainnya'
      if (!bidangMap[b]) bidangMap[b] = { responded: 0, unresponded: 0, total: 0 }
      bidangMap[b].responded++
    })

    // Count unresponded per bidang
    reportData.unrespondedASN.forEach((a) => {
      const b = a.bidang || 'Lainnya'
      if (!bidangMap[b]) bidangMap[b] = { responded: 0, unresponded: 0, total: 0 }
      bidangMap[b].unresponded++
    })

    return Object.entries(bidangMap).map(([bidang, data]) => ({
      bidang,
      ...data,
      total: data.responded + data.unresponded,
      percentage: data.responded + data.unresponded > 0
        ? ((data.responded / (data.responded + data.unresponded)) * 100).toFixed(1)
        : '0.0',
    }))
  })()

  const handleExportExcel = async () => {
    if (!selectedFormId) return

    try {
      setExportingExcel(true)
      const params = new URLSearchParams()
      params.set('formId', selectedFormId)
      params.set('format', 'excel')
      if (bidangFilter && bidangFilter !== 'all') params.set('bidang', bidangFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/reports?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `laporan-${(reportData?.form.title || 'report').replace(/\s+/g, '-')}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addNotification('Laporan Excel berhasil diunduh', 'success')
      } else {
        addNotification('Gagal mengekspor laporan Excel', 'error')
      }
    } catch (err) {
      console.error('Excel export failed:', err)
      addNotification('Gagal mengekspor laporan Excel', 'error')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportPdf = () => {
    if (!reportData || filteredResponses.length === 0) {
      addNotification('Tidak ada data untuk diekspor', 'warning')
      return
    }

    try {
      setExportingPdf(true)
      const formTitle = reportData.form.title
      const doc = new jsPDF()

      doc.setFontSize(16)
      doc.text('Laporan ' + formTitle, 14, 20)
      doc.setFontSize(10)
      doc.text('BKAD Kabupaten Seruyan', 14, 28)
      doc.text('Tanggal: ' + new Date().toLocaleDateString('id-ID'), 14, 34)

      // Build headers
      const headers = ['No', 'Nama', 'NIP', 'Bidang']
      reportData.form.fields
        .sort((a, b) => a.order - b.order)
        .forEach((f) => headers.push(f.label))

      // Build rows
      const rows = filteredResponses.map((r, idx) => {
        const row: string[] = [
          String(idx + 1),
          r.user.name,
          r.user.nip,
          r.user.bidang || '-',
        ]
        reportData.form.fields
          .sort((a, b) => a.order - b.order)
          .forEach((field) => {
            const fieldResp = r.fields.find((fr) => fr.fieldId === field.id)
            row.push(fieldResp ? parseFieldValue(fieldResp.value, field.type) : '—')
          })
        return row
      })

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
      })

      // Add rekap section
      const finalY = (doc as any).lastAutoTable?.finalY || 40
      const rekapStartY = finalY + 15

      if (rekapStartY + 60 > doc.internal.pageSize.height) {
        doc.addPage()
        doc.setFontSize(12)
        doc.text('Rekap Per Bidang', 14, 20)
        autoTable(doc, {
          head: [['Bidang', 'Sudah Mengisi', 'Belum Mengisi', 'Total', 'Persentase (%)']],
          body: rekapPerBidang.map((r) => [
            r.bidang,
            String(r.responded),
            String(r.unresponded),
            String(r.total),
            r.percentage + '%',
          ]),
          startY: 28,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
        })
      } else {
        doc.setFontSize(12)
        doc.text('Rekap Per Bidang', 14, rekapStartY)
        autoTable(doc, {
          head: [['Bidang', 'Sudah Mengisi', 'Belum Mengisi', 'Total', 'Persentase (%)']],
          body: rekapPerBidang.map((r) => [
            r.bidang,
            String(r.responded),
            String(r.unresponded),
            String(r.total),
            r.percentage + '%',
          ]),
          startY: rekapStartY + 5,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
        })
      }

      doc.save('laporan-' + formTitle.replace(/\s+/g, '-') + '.pdf')
      addNotification('Laporan PDF berhasil diunduh', 'success')
    } catch (err) {
      console.error('PDF export failed:', err)
      addNotification('Gagal mengekspor laporan PDF', 'error')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleViewDetail = (response: ReportResponse) => {
    setSelectedResponse(response)
    setDetailDialogOpen(true)
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
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Laporan</h2>
            <p className="text-xs text-muted-foreground">
              Lihat dan ekspor laporan pengisian form
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportExcel}
            disabled={!selectedFormId || exportingExcel}
          >
            {exportingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportPdf}
            disabled={!reportData || filteredResponses.length === 0 || exportingPdf}
          >
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="lg:col-span-1">
              <Label className="text-sm font-medium mb-1.5 block">
                Pilih Form <span className="text-red-500">*</span>
              </Label>
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
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Filter Bidang</Label>
              <Select value={bidangFilter} onValueChange={setBidangFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Bidang" />
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
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Tanggal Mulai</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Tanggal Akhir</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Button
                onClick={handleFetchReport}
                className="w-full gap-2"
                disabled={!selectedFormId || loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Tampilkan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasFetched ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              Pilih form dan klik &quot;Tampilkan&quot; untuk melihat laporan
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Gunakan filter di atas untuk menyaring data
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Memuat laporan...</span>
        </div>
      ) : reportData ? (
        <>
          {/* Statistics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalResponded}</p>
                  <p className="text-xs text-muted-foreground">Total Responden</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalUnresponded}</p>
                  <p className="text-xs text-muted-foreground">ASN Belum Mengisi</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Tingkat Pengisian</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar */}
          {filteredResponses.length > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIP, atau bidang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Response Table */}
          {filteredResponses.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  Tidak ada respons ditemukan
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Coba ubah filter atau pilih form lain
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Data Respons — {reportData.form.title}
                  <Badge variant="outline" className="text-[10px] font-normal ml-2">
                    {filteredResponses.length} data
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[calc(100vh-560px)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[50px] text-center">No</TableHead>
                        <TableHead className="min-w-[180px]">Nama</TableHead>
                        <TableHead className="min-w-[140px]">NIP</TableHead>
                        <TableHead className="w-[120px]">Bidang</TableHead>
                        <TableHead className="w-[160px]">Tanggal Pengisian</TableHead>
                        {reportData.form.fields
                          .sort((a, b) => a.order - b.order)
                          .slice(0, 3)
                          .map((field) => (
                            <TableHead key={field.id} className="min-w-[120px]">
                              {field.label}
                            </TableHead>
                          ))}
                        {reportData.form.fields.length > 3 && (
                          <TableHead className="w-[80px] text-center">Lainnya</TableHead>
                        )}
                        <TableHead className="w-[80px] text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResponses.map((r, index) => (
                        <TableRow
                          key={r.id}
                          className="group cursor-pointer"
                          onClick={() => handleViewDetail(r)}
                        >
                          <TableCell className="text-center text-muted-foreground text-sm">
                            {index + 1}
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
                                className="text-[11px] font-medium bg-sky-50 text-sky-700 border-sky-200"
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
                          {reportData.form.fields
                            .sort((a, b) => a.order - b.order)
                            .slice(0, 3)
                            .map((field) => {
                              const fieldResp = r.fields.find((fr) => fr.fieldId === field.id)
                              return (
                                <TableCell key={field.id}>
                                  <span className="text-sm text-foreground truncate max-w-[150px] block">
                                    {fieldResp
                                      ? parseFieldValue(fieldResp.value, field.type)
                                      : '—'}
                                  </span>
                                </TableCell>
                              )
                            })}
                          {reportData.form.fields.length > 3 && (
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[10px]">
                                +{reportData.form.fields.length - 3} field
                              </Badge>
                            </TableCell>
                          )}
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
              </CardContent>
            </Card>
          )}

          {/* Rekap Per Bidang */}
          {rekapPerBidang.length > 0 && (
            <Card className="border-border/60 overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Rekap Per Bidang
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead>Bidang</TableHead>
                      <TableHead className="w-[120px] text-center">Sudah Mengisi</TableHead>
                      <TableHead className="w-[120px] text-center">Belum Mengisi</TableHead>
                      <TableHead className="w-[80px] text-center">Total</TableHead>
                      <TableHead className="w-[120px] text-center">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rekapPerBidang.map((item, index) => (
                      <TableRow key={item.bidang}>
                        <TableCell className="text-center text-muted-foreground text-sm">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[11px] font-medium bg-sky-50 text-sky-700 border-sky-200"
                          >
                            {item.bidang}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-emerald-600">
                            {item.responded}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-red-500">
                            {item.unresponded}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium text-foreground">{item.total}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(parseFloat(item.percentage), 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              {item.percentage}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Unresponded ASN List */}
          {reportData.unrespondedASN.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserX className="w-4 h-4 text-red-500" />
                  ASN Belum Mengisi
                  <Badge variant="outline" className="text-[10px] font-normal bg-red-50 text-red-600 border-red-200">
                    {reportData.unrespondedASN.length} orang
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {reportData.unrespondedASN.map((asn) => (
                      <div
                        key={asn.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-gray-500">
                              {asn.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {asn.name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">{asn.nip}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {asn.bidang && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-sky-50 text-sky-700 border-sky-200"
                            >
                              {asn.bidang}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-red-50 text-red-600 border-red-200"
                          >
                            Belum mengisi
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}

      {/* Response Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              Detail Respons
            </DialogTitle>
            <DialogDescription className="text-sm">
              Respons dari {selectedResponse?.user.name} — {reportData?.form.title}
            </DialogDescription>
          </DialogHeader>

          {selectedResponse && reportData && (
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
                {reportData.form.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => {
                    const fieldResp = selectedResponse.fields.find(
                      (fr) => fr.fieldId === field.id
                    )
                    const displayValue = fieldResp
                      ? parseFieldValue(fieldResp.value, field.type)
                      : '—'
                    const isFileField = field.type === 'file_upload'
                    const hasFile = isFileField && fieldResp?.filePath

                    return (
                      <div
                        key={field.id}
                        className="p-3 rounded-lg border border-border/50 bg-muted/10"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground">
                            {field.label}
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
                                : 'Upload File'})
                            </span>
                          </p>
                        </div>

                        {isFileField ? (
                          hasFile ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">📎</span>
                              <a
                                href={fieldResp.filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {fieldResp.fileName || 'Unduh File'}
                              </a>
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
