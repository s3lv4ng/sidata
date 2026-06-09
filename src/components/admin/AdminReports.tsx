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
import { PaginationBar } from '@/components/shared/PaginationBar'
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
  Printer,
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
const ITEMS_PER_PAGE = 10

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

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
        setCurrentPage(1)
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

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredResponses.length / ITEMS_PER_PAGE))
  const paginatedResponses = filteredResponses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

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

  const handlePrintReport = () => {
    if (!reportData || filteredResponses.length === 0) return

    const formTitle = reportData.form.title
    const now = new Date()
    const dateRangeText = startDate && endDate
      ? `${new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s/d ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : startDate
      ? `Mulai ${new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : endDate
      ? `Sampai ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : 'Semua Periode'

    // Build table headers
    const sortedFields = [...reportData.form.fields].sort((a, b) => a.order - b.order)

    // Build table rows HTML
    const tableHeaders = ['No', 'Nama', 'NIP', 'Bidang', ...sortedFields.map(f => f.label)].join('</th><th>')
    const tableRows = filteredResponses.map((r, idx) => {
      const cells = [
        String(idx + 1),
        r.user.name,
        r.user.nip,
        r.user.bidang || '-',
        ...sortedFields.map(field => {
          const fieldResp = r.fields.find(fr => fr.fieldId === field.id)
          return fieldResp ? parseFieldValue(fieldResp.value, field.type) : '—'
        }),
      ]
      return `<tr><td>${cells.join('</td><td>')}</td></tr>`
    }).join('')

    // Build rekap per bidang
    const rekapHeaders = ['Bidang', 'Sudah Mengisi', 'Belum Mengisi', 'Total', 'Persentase'].join('</th><th>')
    const rekapRows = rekapPerBidang.map(r =>
      `<tr><td>${r.bidang}</td><td>${r.responded}</td><td>${r.unresponded}</td><td>${r.total}</td><td>${r.percentage}%</td></tr>`
    ).join('')

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan ${formTitle} - BKAD Kabupaten Seruyan</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; line-height: 1.4; }
          .header { text-align: center; border-bottom: 3px double #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { font-size: 14pt; font-weight: bold; color: #1e40af; margin-bottom: 2px; }
          .header h2 { font-size: 12pt; font-weight: bold; margin-bottom: 2px; }
          .header p { font-size: 10pt; color: #555; }
          .header .logo-text { font-size: 10pt; color: #666; margin-top: 4px; }
          .report-info { margin-bottom: 20px; display: flex; justify-content: space-between; }
          .report-info div { font-size: 10pt; }
          .report-info .label { color: #666; }
          .report-info .value { font-weight: bold; }
          h3 { font-size: 12pt; color: #1e40af; margin: 20px 0 8px 0; border-bottom: 1px solid #1e40af; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9pt; }
          th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
          th { background-color: #1e40af; color: white; font-weight: bold; font-size: 9pt; }
          tr:nth-child(even) { background-color: #f5f5f5; }
          .stats-box { display: flex; gap: 20px; margin-bottom: 16px; }
          .stat-item { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; text-align: center; }
          .stat-item .number { font-size: 18pt; font-weight: bold; color: #1e40af; }
          .stat-item .label { font-size: 9pt; color: #666; }
          .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 8pt; color: #888; display: flex; justify-content: space-between; }
          .page-break { page-break-before: always; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { background-color: #1e40af !important; color: white !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="logo-text">PEMERINTAH KABUPATEN SERUYAN</p>
          <h2>BADAN KEUANGAN DAN ASET DAERAH</h2>
          <h1>LAPORAN PENGISIAN FORMULIR</h1>
          <p>Jl. Patin No. 1, Kuala Pembungan, Kab. Seruyan, Kalimantan Tengah</p>
        </div>

        <div class="report-info">
          <div>
            <span class="label">Judul Form:</span> <span class="value">${formTitle}</span><br/>
            <span class="label">Periode:</span> <span class="value">${dateRangeText}</span>
          </div>
          <div style="text-align: right;">
            <span class="label">Tanggal Cetak:</span> <span class="value">${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span><br/>
            <span class="label">Dicetak oleh:</span> <span class="value">${session?.user?.name || 'Administrator'}</span>
          </div>
        </div>

        <div class="stats-box">
          <div class="stat-item">
            <div class="number">${totalResponded}</div>
            <div class="label">Total Responden</div>
          </div>
          <div class="stat-item">
            <div class="number">${totalUnresponded}</div>
            <div class="label">Belum Mengisi</div>
          </div>
          <div class="stat-item">
            <div class="number">${completionRate}%</div>
            <div class="label">Tingkat Pengisian</div>
          </div>
        </div>

        <h3>Data Respons</h3>
        <table>
          <thead><tr><th>${tableHeaders}</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>

        <h3>Rekap Per Bidang</h3>
        <table>
          <thead><tr><th>${rekapHeaders}</th></tr></thead>
          <tbody>${rekapRows}</tbody>
        </table>

        ${reportData.unrespondedASN.length > 0 ? `
        <h3>ASN Belum Mengisi</h3>
        <table>
          <thead><tr><th>No</th><th>Nama</th><th>NIP</th><th>Bidang</th></tr></thead>
          <tbody>
            ${reportData.unrespondedASN.map((asn, idx) =>
              `<tr><td>${idx + 1}</td><td>${asn.name}</td><td>${asn.nip}</td><td>${asn.bidang || '-'}</td></tr>`
            ).join('')}
          </tbody>
        </table>
        ` : ''}

        <div class="footer">
          <div>SIDATA BKAD - Sistem Informasi Data ASN</div>
          <div>Dokumen ini digenerate otomatis oleh sistem</div>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printHtml)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
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
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
            onClick={handlePrintReport}
            disabled={!reportData || filteredResponses.length === 0}
          >
            <Printer className="w-4 h-4" />
            Print Laporan
          </Button>
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
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 dark:bg-blue-900/30">
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
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 dark:bg-red-900/30">
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
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 dark:bg-emerald-900/30">
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
            <Card className="border-border/60 overflow-hidden flex flex-col">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Data Respons — {reportData.form.title}
                  <Badge variant="outline" className="text-[10px] font-normal ml-2">
                    {filteredResponses.length} data
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-auto">
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
                      {paginatedResponses.map((r, index) => (
                        <TableRow
                          key={r.id}
                          className="group cursor-pointer"
                          onClick={() => handleViewDetail(r)}
                        >
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
              </CardContent>
              <PaginationBar
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredResponses.length}
                itemsPerPage={ITEMS_PER_PAGE}
                itemName="respons"
              />
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
                            className="text-[11px] font-medium bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800"
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
                  <Badge variant="outline" className="text-[10px] font-normal bg-red-50 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800">
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
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 dark:bg-muted">
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
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center dark:bg-blue-900/30">
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
