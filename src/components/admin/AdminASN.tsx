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
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination'
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Download,
  Upload,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import ChangePasswordDialog from '@/components/shared/ChangePasswordDialog'

interface ASNItem {
  id: string
  nip: string
  name: string
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

interface ASNFormData {
  nip: string
  name: string
  jabatan: string
  pangkat: string
  unitKerja: string
  bidang: string
  statusASN: string
  email: string
  phone: string
  password: string
}

const emptyForm: ASNFormData = {
  nip: '',
  name: '',
  jabatan: '',
  pangkat: '',
  unitKerja: 'BKAD Kabupaten Seruyan',
  bidang: '',
  statusASN: '',
  email: '',
  phone: '',
  password: '',
}

const BIDANG_OPTIONS = ['Pendapatan', 'Belanja', 'Aset', 'Umum']
const STATUS_ASN_OPTIONS = ['PNS', 'PPPK']
const ITEMS_PER_PAGE = 10

export default function AdminASN() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()
  const [asnList, setAsnList] = useState<ASNItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [bidangFilter, setBidangFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ASNFormData>({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [asnToDelete, setAsnToDelete] = useState<ASNItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  // Change password dialog
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [changePasswordUserId, setChangePasswordUserId] = useState<string>('')

  const adminId = (session?.user as any)?.id || ''

  const fetchASN = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (bidangFilter !== 'all') params.set('bidang', bidangFilter)
      if (statusFilter !== 'all') params.set('statusASN', statusFilter)

      const res = await fetch(`/api/asn?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setAsnList(data)
      }
    } catch (err) {
      console.error('Failed to fetch ASN:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, bidangFilter, statusFilter])

  useEffect(() => {
    fetchASN()
  }, [fetchASN])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, bidangFilter, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(asnList.length / ITEMS_PER_PAGE))
  const paginatedList = asnList.slice(
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

  const handleOpenAdd = () => {
    setEditMode(false)
    setEditingId(null)
    setFormData({ ...emptyForm })
    setFormError(null)
    setFormDialogOpen(true)
  }

  const handleOpenEdit = (asn: ASNItem) => {
    setEditMode(true)
    setEditingId(asn.id)
    setFormData({
      nip: asn.nip,
      name: asn.name,
      jabatan: asn.jabatan || '',
      pangkat: asn.pangkat || '',
      unitKerja: asn.unitKerja || 'BKAD Kabupaten Seruyan',
      bidang: asn.bidang || '',
      statusASN: asn.statusASN || '',
      email: asn.email || '',
      phone: asn.phone || '',
      password: '',
    })
    setFormError(null)
    setFormDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.nip.trim() || !formData.name.trim()) {
      setFormError('NIP dan Nama Lengkap wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      if (editMode && editingId) {
        const body: Record<string, unknown> = {
          ...formData,
          adminId,
        }
        if (!formData.password) {
          delete body.password
        }

        const res = await fetch(`/api/asn/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Gagal mengubah data ASN')
        }

        addNotification('Data ASN berhasil diperbarui', 'success')
      } else {
        const res = await fetch('/api/asn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            password: formData.password || formData.nip,
            adminId,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Gagal menambah ASN')
        }

        addNotification('ASN baru berhasil ditambahkan', 'success')
      }

      setFormDialogOpen(false)
      await fetchASN()
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!asnToDelete) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/asn/${asnToDelete.id}?adminId=${adminId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addNotification('ASN berhasil dihapus', 'success')
        await fetchASN()
        setDeleteDialogOpen(false)
        setAsnToDelete(null)
      } else {
        const data = await res.json()
        addNotification(data.error || 'Gagal menghapus ASN', 'error')
      }
    } catch (err) {
      console.error('Failed to delete ASN:', err)
      addNotification('Gagal menghapus ASN', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = () => {
    try {
      const exportData = asnList.map((asn, index) => ({
        No: index + 1,
        NIP: asn.nip,
        'Nama Lengkap': asn.name,
        Jabatan: asn.jabatan || '-',
        'Pangkat/Golongan': asn.pangkat || '-',
        'Unit Kerja': asn.unitKerja || '-',
        Bidang: asn.bidang || '-',
        'Status ASN': asn.statusASN || '-',
        Email: asn.email || '-',
        'Nomor HP': asn.phone || '-',
        Status: asn.isActive ? 'Aktif' : 'Nonaktif',
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data ASN')

      // Set column widths
      ws['!cols'] = [
        { wch: 5 }, { wch: 20 }, { wch: 30 }, { wch: 25 },
        { wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
        { wch: 25 }, { wch: 15 }, { wch: 10 },
      ]

      XLSX.writeFile(wb, `Data_ASN_BKAD_${new Date().toISOString().slice(0, 10)}.xlsx`)
      addNotification('Data ASN berhasil diekspor', 'success')
    } catch (err) {
      console.error('Export failed:', err)
      addNotification('Gagal mengekspor data', 'error')
    }
  }

  const handleImportClick = () => {
    setImportFile(null)
    setImportResults(null)
    setImportDialogOpen(true)
  }

  const downloadTemplate = () => {
    const headers = ['NIP', 'Nama Lengkap', 'Jabatan', 'Pangkat', 'Unit Kerja', 'Bidang', 'Status ASN', 'Email', 'No HP']
    const example = ['199001012010011001', 'Nama Contoh', 'Jabatan Contoh', 'III/a', 'BKAD Kabupaten Seruyan', 'Pendapatan', 'PNS', 'email@example.com', '081234567890']
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template ASN")
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template-asn-bkad.xlsx"
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template berhasil diunduh')
  }

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Pilih file Excel terlebih dahulu')
      return
    }

    try {
      setImporting(true)
      setImportResults(null)

      const formData = new FormData()
      formData.append('file', importFile)
      if (adminId) formData.append('adminId', adminId)

      const res = await fetch('/api/asn/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengimport data')
      }

      setImportResults(data)
      if (data.success > 0) {
        toast.success(`${data.success} ASN berhasil diimport`)
        await fetchASN()
      }
      if (data.failed > 0 && data.success === 0) {
        toast.error('Semua data gagal diimport')
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengimport data')
    } finally {
      setImporting(false)
    }
  }

  const handleChangePassword = (asn: ASNItem) => {
    setChangePasswordUserId(asn.id)
    setChangePasswordOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data ASN...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Data ASN</h2>
            <p className="text-xs text-muted-foreground">{asnList.length} ASN terdaftar</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleImportClick}>
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="gap-2 shadow-sm" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" />
            Tambah ASN
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIP, atau jabatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={bidangFilter} onValueChange={setBidangFilter}>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {STATUS_ASN_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ASN Table */}
      {asnList.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery || bidangFilter !== 'all' || statusFilter !== 'all'
                ? 'Tidak ada ASN yang sesuai filter'
                : 'Belum ada data ASN'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery || bidangFilter !== 'all' || statusFilter !== 'all'
                ? 'Coba ubah kata kunci atau filter'
                : 'Klik "Tambah ASN" untuk menambahkan data'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 overflow-hidden">
          <ScrollArea className="max-h-[calc(100vh-360px)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[50px] text-center">No</TableHead>
                  <TableHead className="min-w-[140px]">NIP</TableHead>
                  <TableHead className="min-w-[180px]">Nama</TableHead>
                  <TableHead className="min-w-[150px]">Jabatan</TableHead>
                  <TableHead className="w-[130px]">Pangkat/Gol.</TableHead>
                  <TableHead className="w-[110px]">Bidang</TableHead>
                  <TableHead className="w-[90px] text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.map((asn, index) => (
                  <TableRow key={asn.id} className="group">
                    <TableCell className="text-center text-muted-foreground text-sm">
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-foreground">{asn.nip}</span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate max-w-[200px]">
                          {asn.name}
                        </p>
                        {asn.email && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {asn.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground truncate max-w-[180px] block">
                        {asn.jabatan || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{asn.pangkat || '—'}</span>
                    </TableCell>
                    <TableCell>
                      {asn.bidang ? (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium bg-sky-50 text-sky-700 border-sky-200"
                        >
                          {asn.bidang}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`text-[11px] font-medium ${
                          asn.statusASN === 'PNS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : asn.statusASN === 'PPPK'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                        variant="outline"
                      >
                        {asn.statusASN || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEdit(asn)}
                          title="Edit ASN"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/5"
                          onClick={() => handleChangePassword(asn)}
                          title="Ubah Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setAsnToDelete(asn)
                            setDeleteDialogOpen(true)
                          }}
                          title="Hapus ASN"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, asnList.length)} dari {asnList.length} data
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

      {/* Add/Edit ASN Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              {editMode ? 'Edit Data ASN' : 'Tambah ASN Baru'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editMode
                ? 'Perbarui informasi data ASN di bawah ini.'
                : 'Isi formulir berikut untuk menambahkan ASN baru. Password default adalah NIP jika tidak diisi.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* NIP */}
            <div className="space-y-2">
              <Label htmlFor="nip" className="text-sm font-medium">
                NIP <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nip"
                placeholder="Masukkan NIP"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                className="font-mono"
              />
            </div>

            {/* Nama Lengkap */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Jabatan */}
            <div className="space-y-2">
              <Label htmlFor="jabatan" className="text-sm font-medium">
                Jabatan
              </Label>
              <Input
                id="jabatan"
                placeholder="Masukkan jabatan"
                value={formData.jabatan}
                onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
              />
            </div>

            {/* Pangkat/Golongan */}
            <div className="space-y-2">
              <Label htmlFor="pangkat" className="text-sm font-medium">
                Pangkat/Golongan
              </Label>
              <Input
                id="pangkat"
                placeholder="Contoh: III/a"
                value={formData.pangkat}
                onChange={(e) => setFormData({ ...formData, pangkat: e.target.value })}
              />
            </div>

            {/* Unit Kerja */}
            <div className="space-y-2">
              <Label htmlFor="unitKerja" className="text-sm font-medium">
                Unit Kerja
              </Label>
              <Input
                id="unitKerja"
                placeholder="Unit kerja"
                value={formData.unitKerja}
                onChange={(e) => setFormData({ ...formData, unitKerja: e.target.value })}
              />
            </div>

            {/* Bidang and Status ASN in one row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bidang</Label>
                <Select
                  value={formData.bidang}
                  onValueChange={(val) => setFormData({ ...formData, bidang: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bidang" />
                  </SelectTrigger>
                  <SelectContent>
                    {BIDANG_OPTIONS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Status ASN</Label>
                <Select
                  value={formData.statusASN}
                  onValueChange={(val) => setFormData({ ...formData, statusASN: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ASN_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email and Phone in one row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Nomor HP
                </Label>
                <Input
                  id="phone"
                  placeholder="08xxxxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password{' '}
                {!editMode && (
                  <span className="text-muted-foreground font-normal text-xs">
                    (default: NIP)
                  </span>
                )}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={editMode ? 'Kosongkan jika tidak diubah' : 'Kosongkan untuk menggunakan NIP'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFormDialogOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : editMode ? (
                'Simpan Perubahan'
              ) : (
                'Tambah ASN'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Excel Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Upload className="w-4 h-4 text-emerald-600" />
              </div>
              Import ASN dari Excel
            </DialogTitle>
            <DialogDescription className="text-sm">
              Upload file Excel (.xlsx, .xls) untuk menambahkan data ASN secara bulk. Password default: asn123
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Download Template */}
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Download Template</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Unduh template Excel terlebih dahulu, isi data ASN, lalu upload kembali.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={downloadTemplate}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih File Excel</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setImportFile(file)
                  setImportResults(null)
                }}
                className="cursor-pointer"
              />
              {importFile && (
                <p className="text-xs text-muted-foreground">
                  File: <span className="font-medium text-foreground">{importFile.name}</span> ({(importFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Import Results */}
            {importResults && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold text-foreground">Hasil Import</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-50 p-3 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xl font-bold text-emerald-700">{importResults.success}</p>
                    <p className="text-xs text-emerald-600">Berhasil</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-red-700">{importResults.failed}</p>
                    <p className="text-xs text-red-600">Gagal</p>
                  </div>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-700">Detail Kesalahan:</p>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {importResults.errors.map((err, idx) => (
                          <p key={idx} className="text-xs text-red-600">• {err}</p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
            >
              Tutup
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !importFile}
              className="gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        userId={changePasswordUserId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg">Hapus ASN</DialogTitle>
            </div>
            <DialogDescription className="text-sm pl-[52px]">
              Apakah Anda yakin ingin menghapus ASN{' '}
              <span className="font-semibold text-foreground">
                &quot;{asnToDelete?.name}&quot;
              </span>{' '}
              (NIP: {asnToDelete?.nip})? Data respons yang terkait mungkin juga terpengaruh.
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Hapus ASN
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
