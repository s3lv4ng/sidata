'use client'

import { useState, useEffect, useCallback } from 'react'
import { PaginationBar } from '@/components/shared/PaginationBar'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Search,
} from 'lucide-react'

interface MasterDataItem {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export default function AdminMasterData() {
  const { addNotification } = useAppStore()

  // Bidang state
  const [bidangList, setBidangList] = useState<MasterDataItem[]>([])
  const [bidangLoading, setBidangLoading] = useState(true)
  const [bidangSearch, setBidangSearch] = useState('')

  // Status ASN state
  const [statusList, setStatusList] = useState<MasterDataItem[]>([])
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusSearch, setStatusSearch] = useState('')

  // Pagination state
  const [bidangPage, setBidangPage] = useState(1)
  const [statusPage, setStatusPage] = useState(1)
  const ITEMS_PER_PAGE = 9

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [dialogType, setDialogType] = useState<'bidang' | 'status'>('bidang')
  const [formName, setFormName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<MasterDataItem | null>(null)
  const [deletingType, setDeletingType] = useState<'bidang' | 'status'>('bidang')
  const [deleting, setDeleting] = useState(false)

  // Fetch bidang
  const fetchBidang = useCallback(async () => {
    try {
      setBidangLoading(true)
      const res = await fetch('/api/bidang')
      if (res.ok) {
        const data = await res.json()
        setBidangList(data)
      }
    } catch (err) {
      console.error('Failed to fetch bidang:', err)
    } finally {
      setBidangLoading(false)
    }
  }, [])

  // Fetch status ASN
  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      const res = await fetch('/api/status-asn')
      if (res.ok) {
        const data = await res.json()
        setStatusList(data)
      }
    } catch (err) {
      console.error('Failed to fetch status ASN:', err)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBidang()
    fetchStatus()
  }, [fetchBidang, fetchStatus])

  // Reset page when search changes
  useEffect(() => {
    setBidangPage(1)
  }, [bidangSearch])

  useEffect(() => {
    setStatusPage(1)
  }, [statusSearch])

  // Filtered lists
  const filteredBidang = bidangList.filter((b) => {
    if (!bidangSearch) return true
    return b.name.toLowerCase().includes(bidangSearch.toLowerCase())
  })

  const filteredStatus = statusList.filter((s) => {
    if (!statusSearch) return true
    return s.name.toLowerCase().includes(statusSearch.toLowerCase())
  })

  // Pagination computations
  const bidangTotalPages = Math.max(1, Math.ceil(filteredBidang.length / ITEMS_PER_PAGE))
  const paginatedBidang = filteredBidang.slice((bidangPage - 1) * ITEMS_PER_PAGE, bidangPage * ITEMS_PER_PAGE)

  const statusTotalPages = Math.max(1, Math.ceil(filteredStatus.length / ITEMS_PER_PAGE))
  const paginatedStatus = filteredStatus.slice((statusPage - 1) * ITEMS_PER_PAGE, statusPage * ITEMS_PER_PAGE)

  // Open create dialog
  const handleOpenCreate = (type: 'bidang' | 'status') => {
    setDialogType(type)
    setDialogMode('create')
    setFormName('')
    setEditingId(null)
    setDialogOpen(true)
  }

  // Open edit dialog
  const handleOpenEdit = (item: MasterDataItem, type: 'bidang' | 'status') => {
    setDialogType(type)
    setDialogMode('edit')
    setFormName(item.name)
    setEditingId(item.id)
    setDialogOpen(true)
  }

  // Save handler
  const handleSave = async () => {
    if (!formName.trim()) {
      addNotification('Nama harus diisi', 'warning')
      return
    }

    const apiPath = dialogType === 'bidang' ? '/api/bidang' : '/api/status-asn'
    const typeName = dialogType === 'bidang' ? 'Bidang' : 'Status ASN'

    try {
      setSaving(true)

      if (dialogMode === 'create') {
        const res = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim() }),
        })
        if (res.ok) {
          addNotification(`${typeName} berhasil ditambahkan`, 'success')
          if (dialogType === 'bidang') await fetchBidang()
          else await fetchStatus()
          setDialogOpen(false)
        } else {
          const data = await res.json()
          addNotification(data.error || `Gagal menambahkan ${typeName}`, 'error')
        }
      } else if (dialogMode === 'edit' && editingId) {
        const res = await fetch(apiPath, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, name: formName.trim() }),
        })
        if (res.ok) {
          addNotification(`${typeName} berhasil diperbarui`, 'success')
          if (dialogType === 'bidang') await fetchBidang()
          else await fetchStatus()
          setDialogOpen(false)
        } else {
          const data = await res.json()
          addNotification(data.error || `Gagal memperbarui ${typeName}`, 'error')
        }
      }
    } catch (err) {
      console.error('Failed to save:', err)
      addNotification('Gagal menyimpan data', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete handlers
  const confirmDelete = (item: MasterDataItem, type: 'bidang' | 'status') => {
    setDeletingItem(item)
    setDeletingType(type)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingItem) return

    const apiPath = deletingType === 'bidang' ? '/api/bidang' : '/api/status-asn'
    const typeName = deletingType === 'bidang' ? 'Bidang' : 'Status ASN'

    try {
      setDeleting(true)
      const res = await fetch(`${apiPath}?id=${deletingItem.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addNotification(`${typeName} berhasil dihapus`, 'success')
        if (deletingType === 'bidang') await fetchBidang()
        else await fetchStatus()
        setDeleteDialogOpen(false)
        setDeletingItem(null)
      } else {
        const data = await res.json()
        addNotification(data.error || `Gagal menghapus ${typeName}`, 'error')
      }
    } catch (err) {
      console.error('Failed to delete:', err)
      addNotification('Gagal menghapus data', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const dialogTypeName = dialogType === 'bidang' ? 'Bidang' : 'Status ASN'
  const deletingTypeName = deletingType === 'bidang' ? 'Bidang' : 'Status ASN'

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
          <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Data Master</h2>
          <p className="text-xs text-muted-foreground">
            Kelola data Bidang dan Status ASN
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bidang" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="bidang" className="gap-1.5">
            <Building2 className="w-4 h-4" />
            Bidang
          </TabsTrigger>
          <TabsTrigger value="status-asn" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Status ASN
          </TabsTrigger>
        </TabsList>

        {/* Bidang Tab */}
        <TabsContent value="bidang" className="space-y-4 mt-4">
          {/* Bidang header & add */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari bidang..."
                value={bidangSearch}
                onChange={(e) => setBidangSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenCreate('bidang')} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Tambah Bidang
            </Button>
          </div>

          {/* Bidang count */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800">
              {bidangList.length} Bidang
            </Badge>
          </div>

          {/* Bidang list */}
          {bidangLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Memuat data bidang...</span>
            </div>
          ) : filteredBidang.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  {bidangSearch
                    ? 'Tidak ada bidang yang sesuai'
                    : 'Belum ada data bidang'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {bidangSearch
                    ? 'Coba ubah kata kunci pencarian'
                    : 'Klik "Tambah Bidang" untuk menambahkan bidang baru'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {paginatedBidang.map((item) => (
                  <Card
                    key={item.id}
                    className="border-border/60 transition-colors hover:border-border group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 dark:bg-sky-900/30">
                            <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {item.name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Diperbarui {new Date(item.updatedAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 dark:border-slate-700"
                            onClick={() => handleOpenEdit(item, 'bidang')}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 dark:border-red-800"
                            onClick={() => confirmDelete(item, 'bidang')}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <PaginationBar
                currentPage={bidangPage}
                totalPages={bidangTotalPages}
                onPageChange={setBidangPage}
                totalItems={filteredBidang.length}
                itemsPerPage={ITEMS_PER_PAGE}
                itemName="bidang"
              />
            </Card>
          )}
        </TabsContent>

        {/* Status ASN Tab */}
        <TabsContent value="status-asn" className="space-y-4 mt-4">
          {/* Status header & add */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari status ASN..."
                value={statusSearch}
                onChange={(e) => setStatusSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => handleOpenCreate('status')} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Tambah Status ASN
            </Button>
          </div>

          {/* Status count */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
              {statusList.length} Status ASN
            </Badge>
          </div>

          {/* Status list */}
          {statusLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Memuat data status ASN...</span>
            </div>
          ) : filteredStatus.length === 0 ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ShieldCheck className="w-12 h-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">
                  {statusSearch
                    ? 'Tidak ada status ASN yang sesuai'
                    : 'Belum ada data status ASN'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {statusSearch
                    ? 'Coba ubah kata kunci pencarian'
                    : 'Klik "Tambah Status ASN" untuk menambahkan status baru'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 flex flex-col">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {paginatedStatus.map((item) => (
                  <Card
                    key={item.id}
                    className="border-border/60 transition-colors hover:border-border group"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 dark:bg-emerald-900/30">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {item.name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Diperbarui {new Date(item.updatedAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 dark:border-slate-700"
                            onClick={() => handleOpenEdit(item, 'status')}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 dark:border-red-800"
                            onClick={() => confirmDelete(item, 'status')}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <PaginationBar
                currentPage={statusPage}
                totalPages={statusTotalPages}
                onPageChange={setStatusPage}
                totalItems={filteredStatus.length}
                itemsPerPage={ITEMS_PER_PAGE}
                itemName="status"
              />
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                dialogType === 'bidang'
                  ? 'bg-sky-50 dark:bg-sky-900/30'
                  : 'bg-emerald-50 dark:bg-emerald-900/30'
              }`}>
                {dialogType === 'bidang' ? (
                  <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              {dialogMode === 'create'
                ? `Tambah ${dialogTypeName}`
                : `Edit ${dialogTypeName}`}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {dialogMode === 'create'
                ? `Masukkan nama ${dialogTypeName.toLowerCase()} baru`
                : `Perbarui nama ${dialogTypeName.toLowerCase()}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Nama {dialogTypeName} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={`Masukkan nama ${dialogTypeName.toLowerCase()}...`}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && formName.trim()) {
                    handleSave()
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  {dialogMode === 'create' ? (
                    <>
                      <Plus className="w-4 h-4" />
                      Tambah {dialogTypeName}
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4" />
                      Simpan Perubahan
                    </>
                  )}
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
              <DialogTitle className="text-lg">Hapus {deletingTypeName}</DialogTitle>
            </div>
            <DialogDescription className="text-sm pl-[52px]">
              Apakah Anda yakin ingin menghapus {deletingTypeName.toLowerCase()}{' '}
              <span className="font-semibold text-foreground">
                &quot;{deletingItem?.name}&quot;
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
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
                  Hapus {deletingTypeName}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
