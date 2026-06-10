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
  Shield,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

interface StatusASNItem {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ASNItem {
  id: string
  statusASN: string | null
}

interface StatusASNFormData {
  name: string
  description: string
}

const emptyForm: StatusASNFormData = {
  name: '',
  description: '',
}

export default function AdminStatusASN() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()
  const adminId = (session?.user as any)?.id || ''

  const [statusList, setStatusList] = useState<StatusASNItem[]>([])
  const [asnList, setAsnList] = useState<ASNItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<StatusASNFormData>({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statusToDelete, setStatusToDelete] = useState<StatusASNItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchStatusASN = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/status-asn')
      if (res.ok) {
        const data = await res.json()
        setStatusList(data)
      }
    } catch (err) {
      console.error('Failed to fetch status ASN:', err)
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
    fetchStatusASN()
    fetchASNCounts()
  }, [fetchStatusASN, fetchASNCounts])

  const getASNCount = (statusName: string): number => {
    return asnList.filter((asn) => asn.statusASN === statusName).length
  }

  const filteredStatus = statusList.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    )
  })

  const handleOpenAdd = () => {
    setEditMode(false)
    setEditingId(null)
    setFormData({ ...emptyForm })
    setFormError(null)
    setFormDialogOpen(true)
  }

  const handleOpenEdit = (status: StatusASNItem) => {
    setEditMode(true)
    setEditingId(status.id)
    setFormData({
      name: status.name,
      description: status.description || '',
    })
    setFormError(null)
    setFormDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Nama Status ASN wajib diisi')
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      if (editMode && editingId) {
        const res = await fetch(`/api/status-asn/${editingId}`, {
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
          throw new Error(data.error || 'Gagal mengubah status ASN')
        }

        toast.success('Status ASN berhasil diperbarui')
      } else {
        const res = await fetch('/api/status-asn', {
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
          throw new Error(data.error || 'Gagal menambah status ASN')
        }

        toast.success('Status ASN baru berhasil ditambahkan')
      }

      setFormDialogOpen(false)
      await fetchStatusASN()
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (status: StatusASNItem) => {
    try {
      const res = await fetch(`/api/status-asn/${status.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !status.isActive,
          adminId,
        }),
      })

      if (res.ok) {
        toast.success(
          status.isActive
            ? `Status "${status.name}" berhasil dinonaktifkan`
            : `Status "${status.name}" berhasil diaktifkan`
        )
        await fetchStatusASN()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal mengubah status ASN')
      }
    } catch (err) {
      console.error('Failed to toggle status ASN:', err)
      toast.error('Gagal mengubah status ASN')
    }
  }

  const handleDelete = async () => {
    if (!statusToDelete) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/status-asn/${statusToDelete.id}?adminId=${adminId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Status ASN "${statusToDelete.name}" berhasil dihapus`)
        await fetchStatusASN()
        setDeleteDialogOpen(false)
        setStatusToDelete(null)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menghapus status ASN')
      }
    } catch (err) {
      console.error('Failed to delete status ASN:', err)
      toast.error('Gagal menghapus status ASN')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data status ASN...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Manajemen Status ASN</h2>
            <p className="text-xs text-muted-foreground">
              {statusList.length} status ASN terdaftar
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-2 shadow-sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4" />
          Tambah Status
        </Button>
      </div>

      {/* Search */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau deskripsi status ASN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status ASN Table */}
      {filteredStatus.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery
                ? 'Tidak ada status ASN yang sesuai pencarian'
                : 'Belum ada data status ASN'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery
                ? 'Coba ubah kata kunci pencarian'
                : 'Klik "Tambah Status" untuk menambahkan data'}
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
                  <TableHead className="min-w-[160px]">Nama Status</TableHead>
                  <TableHead className="min-w-[200px]">Deskripsi</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Jumlah ASN</TableHead>
                  <TableHead className="w-[130px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStatus.map((status, index) => {
                  const asnCount = getASNCount(status.name)
                  return (
                    <TableRow key={status.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                            <Shield className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          </div>
                          <span className="font-medium text-sm text-foreground">
                            {status.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {status.description || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[11px] font-medium ${
                            status.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-muted dark:text-muted-foreground dark:border-muted'
                          }`}
                          variant="outline"
                        >
                          {status.isActive ? 'Aktif' : 'Nonaktif'}
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
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 dark:border-slate-700"
                            onClick={() => handleOpenEdit(status)}
                            title="Edit Status ASN"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className={`h-8 w-8 border-amber-200 dark:border-amber-800 ${
                              status.isActive
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30 dark:border-emerald-800'
                            }`}
                            onClick={() => handleToggleActive(status)}
                            title={status.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {status.isActive ? (
                              <ToggleRight className="w-3.5 h-3.5" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 dark:border-red-800"
                            onClick={() => {
                              setStatusToDelete(status)
                              setDeleteDialogOpen(true)
                            }}
                            title="Hapus Status ASN"
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

      {/* Add/Edit Status ASN Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              {editMode ? 'Edit Status ASN' : 'Tambah Status ASN Baru'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editMode
                ? 'Perbarui informasi status ASN di bawah ini.'
                : 'Isi formulir berikut untuk menambahkan status ASN baru.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 dark:bg-red-950/30 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="status-name" className="text-sm font-medium">
                Nama Status <span className="text-red-500">*</span>
              </Label>
              <Input
                id="status-name"
                placeholder="Masukkan nama status ASN"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-desc" className="text-sm font-medium">
                Deskripsi
              </Label>
              <Textarea
                id="status-desc"
                placeholder="Deskripsi status ASN (opsional)"
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
                  Tambah Status
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
              <DialogTitle className="text-lg">Hapus Status ASN</DialogTitle>
            </div>
            <DialogDescription className="text-sm pl-[52px]">
              Apakah Anda yakin ingin menghapus status ASN{' '}
              <span className="font-semibold text-foreground">
                &quot;{statusToDelete?.name}&quot;
              </span>
              ? {statusToDelete && getASNCount(statusToDelete.name) > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Status ini masih digunakan oleh {getASNCount(statusToDelete.name)} ASN.
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
                  Hapus Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
