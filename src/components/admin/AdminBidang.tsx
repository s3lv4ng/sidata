'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Users,
  FolderOpen,
  ExternalLink,
  Cloud,
} from 'lucide-react'
import { toast } from 'sonner'

interface BidangItem {
  id: string
  name: string
  description: string | null
  driveFolderId: string | null
  driveFolderLink: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ASNItem {
  id: string
  bidang: string | null
}

interface BidangFormData {
  name: string
  description: string
}

const emptyForm: BidangFormData = {
  name: '',
  description: '',
}

export default function AdminBidang() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()
  const adminId = (session?.user as any)?.id || ''

  const [bidangList, setBidangList] = useState<BidangItem[]>([])
  const [asnList, setAsnList] = useState<ASNItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<BidangFormData>({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bidangToDelete, setBidangToDelete] = useState<BidangItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchBidang = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/bidang')
      if (res.ok) {
        const data = await res.json()
        setBidangList(data)
      }
    } catch (err) {
      console.error('Failed to fetch bidang:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchASNCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/asn')
      if (res.ok) {
        const data = await res.json()
        setAsnList(data)
      }
    } catch (err) {
      console.error('Failed to fetch ASN:', err)
    }
  }, [])

  useEffect(() => {
    fetchBidang()
    fetchASNCounts()
  }, [fetchBidang, fetchASNCounts])

  const getASNCount = (bidangName: string): number => {
    return asnList.filter((asn) => asn.bidang === bidangName).length
  }

  const filteredBidang = bidangList.filter((b) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q))
    )
  })

  const handleOpenAdd = () => {
    setEditMode(false)
    setEditingId(null)
    setFormData({ ...emptyForm })
    setFormError(null)
    setFormDialogOpen(true)
  }

  const handleOpenEdit = (bidang: BidangItem) => {
    setEditMode(true)
    setEditingId(bidang.id)
    setFormData({
      name: bidang.name,
      description: bidang.description || '',
    })
    setFormError(null)
    setFormDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Nama Bidang wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      if (editMode && editingId) {
        const res = await fetch(`/api/bidang/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            adminId,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Gagal mengubah bidang')
        }

        toast.success('Bidang berhasil diperbarui')
      } else {
        const res = await fetch('/api/bidang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            adminId,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Gagal menambah bidang')
        }

        toast.success('Bidang baru berhasil ditambahkan')
      }

      setFormDialogOpen(false)
      await fetchBidang()
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (bidang: BidangItem) => {
    try {
      const res = await fetch(`/api/bidang/${bidang.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !bidang.isActive,
          adminId,
        }),
      })

      if (res.ok) {
        toast.success(
          bidang.isActive
            ? `Bidang "${bidang.name}" berhasil dinonaktifkan`
            : `Bidang "${bidang.name}" berhasil diaktifkan`
        )
        await fetchBidang()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal mengubah status bidang')
      }
    } catch (err) {
      console.error('Failed to toggle bidang:', err)
      toast.error('Gagal mengubah status bidang')
    }
  }

  const handleDelete = async () => {
    if (!bidangToDelete) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/bidang/${bidangToDelete.id}?adminId=${adminId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Bidang "${bidangToDelete.name}" berhasil dihapus`)
        await fetchBidang()
        setDeleteDialogOpen(false)
        setBidangToDelete(null)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus bidang')
      }
    } catch (err) {
      console.error('Failed to delete bidang:', err)
      toast.error('Gagal menghapus bidang')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data bidang...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Manajemen Bidang</h2>
            <p className="text-xs text-muted-foreground">
              {bidangList.length} bidang terdaftar
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-2 shadow-sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          Tambah Bidang
        </Button>
      </div>

      {/* Search */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau deskripsi bidang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bidang Table */}
      {filteredBidang.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery
                ? 'Tidak ada bidang yang sesuai pencarian'
                : 'Belum ada data bidang'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery
                ? 'Coba ubah kata kunci pencarian'
                : 'Klik "Tambah Bidang" untuk menambahkan data'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 overflow-hidden">
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[50px] text-center">No</TableHead>
                  <TableHead className="min-w-[160px]">Nama Bidang</TableHead>
                  <TableHead className="min-w-[200px]">Deskripsi</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Jumlah ASN</TableHead>
                  <TableHead className="w-[160px] text-center">Folder Drive</TableHead>
                  <TableHead className="w-[130px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBidang.map((bidang, index) => {
                  const asnCount = getASNCount(bidang.name)
                  return (
                    <TableRow key={bidang.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <span className="font-medium text-sm text-foreground">
                            {bidang.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {bidang.description || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[11px] font-medium ${
                            bidang.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-muted dark:text-muted-foreground dark:border-muted'
                          }`}
                          variant="outline"
                        >
                          {bidang.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className={`text-sm font-medium ${asnCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {asnCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {bidang.driveFolderId ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5 font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                              onClick={() => bidang.driveFolderLink && window.open(bidang.driveFolderLink, '_blank')}
                            >
                              <Cloud className="w-3 h-3 mr-0.5" />
                              Terhubung
                            </Badge>
                            {bidang.driveFolderLink && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                onClick={() => window.open(bidang.driveFolderLink, '_blank')}
                                title="Buka folder di Google Drive"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground/40" />
                            <span className="text-[11px] text-muted-foreground/50">Otomatis dibuat</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(bidang)}
                            title="Edit Bidang"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              bidang.isActive
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30'
                            }`}
                            onClick={() => handleToggleActive(bidang)}
                            title={bidang.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {bidang.isActive ? (
                              <ToggleRight className="w-3.5 h-3.5" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
                            onClick={() => {
                              setBidangToDelete(bidang)
                              setDeleteDialogOpen(true)
                            }}
                            title="Hapus Bidang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Add/Edit Bidang Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              {editMode ? 'Edit Bidang' : 'Tambah Bidang Baru'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editMode
                ? 'Perbarui informasi bidang di bawah ini.'
                : 'Isi formulir berikut untuk menambahkan bidang baru.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 dark:bg-red-950/30 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bidang-name" className="text-sm font-medium">
                Nama Bidang <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bidang-name"
                placeholder="Masukkan nama bidang"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bidang-desc" className="text-sm font-medium">
                Deskripsi
              </Label>
              <Textarea
                id="bidang-desc"
                placeholder="Deskripsi bidang (opsional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="resize-none"
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
                <>
                  <Plus className="w-4 h-4" />
                  Tambah Bidang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg">Hapus Bidang</DialogTitle>
            </div>
            <DialogDescription className="text-sm pl-[52px]">
              Apakah Anda yakin ingin menghapus bidang{' '}
              <span className="font-semibold text-foreground">
                &quot;{bidangToDelete?.name}&quot;
              </span>
              ? {bidangToDelete && getASNCount(bidangToDelete.name) > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Bidang ini masih digunakan oleh {getASNCount(bidangToDelete.name)} ASN.
                </span>
              )}
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
                  Hapus Bidang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
