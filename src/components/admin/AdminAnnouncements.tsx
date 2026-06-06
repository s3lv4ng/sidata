'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Pin,
  Search,
  Loader2,
  AlertTriangle,
  PinOff,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
} from 'lucide-react'

interface AnnouncementItem {
  id: string
  title: string
  content: string
  isPinned: boolean
  isActive: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
  }
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

export default function AdminAnnouncements() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()
  const userId = (session?.user as any)?.id || ''

  // Data
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formIsPinned, setFormIsPinned] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/announcements')
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data)
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const filteredAnnouncements = announcements.filter((a) => {
    if (!searchQuery) return true
    return a.title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleOpenCreate = () => {
    setDialogMode('create')
    setFormTitle('')
    setFormContent('')
    setFormIsPinned(false)
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (announcement: AnnouncementItem) => {
    setDialogMode('edit')
    setFormTitle(announcement.title)
    setFormContent(announcement.content)
    setFormIsPinned(announcement.isPinned)
    setEditingId(announcement.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      addNotification('Judul dan konten harus diisi', 'warning')
      return
    }

    try {
      setSaving(true)

      if (dialogMode === 'create') {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            content: formContent.trim(),
            isPinned: formIsPinned,
            createdById: userId,
          }),
        })
        if (res.ok) {
          addNotification('Pengumuman berhasil dibuat', 'success')
          await fetchAnnouncements()
          setDialogOpen(false)
        } else {
          const data = await res.json()
          addNotification(data.error || 'Gagal membuat pengumuman', 'error')
        }
      } else if (dialogMode === 'edit' && editingId) {
        const res = await fetch('/api/announcements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            title: formTitle.trim(),
            content: formContent.trim(),
            isPinned: formIsPinned,
            userId,
          }),
        })
        if (res.ok) {
          addNotification('Pengumuman berhasil diperbarui', 'success')
          await fetchAnnouncements()
          setDialogOpen(false)
        } else {
          const data = await res.json()
          addNotification(data.error || 'Gagal memperbarui pengumuman', 'error')
        }
      }
    } catch (err) {
      console.error('Failed to save announcement:', err)
      addNotification('Gagal menyimpan pengumuman', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (announcement: AnnouncementItem) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: announcement.id,
          isActive: !announcement.isActive,
          userId,
        }),
      })
      if (res.ok) {
        addNotification(
          announcement.isActive
            ? 'Pengumuman berhasil dinonaktifkan'
            : 'Pengumuman berhasil diaktifkan',
          'success'
        )
        await fetchAnnouncements()
      } else {
        addNotification('Gagal mengubah status pengumuman', 'error')
      }
    } catch (err) {
      console.error('Failed to toggle announcement:', err)
      addNotification('Gagal mengubah status pengumuman', 'error')
    }
  }

  const handleTogglePin = async (announcement: AnnouncementItem) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: announcement.id,
          isPinned: !announcement.isPinned,
          userId,
        }),
      })
      if (res.ok) {
        addNotification(
          announcement.isPinned
            ? 'Pin berhasil dilepas'
            : 'Pengumuman berhasil disematkan',
          'success'
        )
        await fetchAnnouncements()
      } else {
        addNotification('Gagal mengubah pin pengumuman', 'error')
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err)
      addNotification('Gagal mengubah pin pengumuman', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/announcements?id=${deletingId}&userId=${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addNotification('Pengumuman berhasil dihapus', 'success')
        await fetchAnnouncements()
        setDeleteDialogOpen(false)
        setDeletingId(null)
      } else {
        const data = await res.json()
        addNotification(data.error || 'Gagal menghapus pengumuman', 'error')
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err)
      addNotification('Gagal menghapus pengumuman', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const confirmDelete = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat pengumuman...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Pengumuman</h2>
            <p className="text-xs text-muted-foreground">
              {announcements.length} pengumuman terdaftar
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Tambah Pengumuman
        </Button>
      </div>

      {/* Search */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pengumuman berdasarkan judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery
                ? 'Tidak ada pengumuman yang sesuai'
                : 'Belum ada pengumuman'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery
                ? 'Coba ubah kata kunci pencarian'
                : 'Klik "Tambah Pengumuman" untuk membuat pengumuman baru'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-260px)]">
          <div className="space-y-3">
            {filteredAnnouncements.map((announcement) => (
              <Card
                key={announcement.id}
                className={`border-border/60 transition-colors hover:border-border ${
                  announcement.isPinned ? 'ring-1 ring-amber-200 bg-amber-50/30 dark:ring-amber-800 dark:bg-amber-950/20' : ''
                } ${!announcement.isActive ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 dark:bg-amber-900/30">
                      <Megaphone className="w-5 h-5 text-amber-600" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          {announcement.title}
                        </h3>
                        {announcement.isPinned && (
                          <Badge className="text-[10px] font-medium bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800" variant="outline">
                            <Pin className="w-3 h-3 mr-1" />
                            Disematkan
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] font-medium ${
                            announcement.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100'
                          }`}
                          variant="outline"
                        >
                          {announcement.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDateTime(announcement.createdAt)}
                        </span>
                        <span>oleh {announcement.createdBy.name}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 sm:ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          announcement.isPinned
                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        onClick={() => handleTogglePin(announcement)}
                        title={announcement.isPinned ? 'Lepas Pin' : 'Sematkan'}
                      >
                        {announcement.isPinned ? (
                          <PinOff className="w-4 h-4" />
                        ) : (
                          <Pin className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          announcement.isActive
                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        onClick={() => handleToggleActive(announcement)}
                        title={announcement.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {announcement.isActive ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => handleOpenEdit(announcement)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => confirmDelete(announcement.id)}
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
        </ScrollArea>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center dark:bg-amber-900/30">
                <Megaphone className="w-4 h-4 text-amber-600" />
              </div>
              {dialogMode === 'create' ? 'Tambah Pengumuman' : 'Edit Pengumuman'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {dialogMode === 'create'
                ? 'Buat pengumuman baru yang akan ditampilkan kepada ASN'
                : 'Perbarui informasi pengumuman'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Judul <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Masukkan judul pengumuman..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Konten <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Tulis isi pengumuman..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
              <div>
                <Label className="text-sm font-medium">Sematkan Pengumuman</Label>
                <p className="text-xs text-muted-foreground">
                  Pengumuman yang disematkan akan tampil di bagian atas
                </p>
              </div>
              <Switch
                checked={formIsPinned}
                onCheckedChange={setFormIsPinned}
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
              disabled={saving || !formTitle.trim() || !formContent.trim()}
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
                      Buat Pengumuman
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
              <DialogTitle className="text-lg">Hapus Pengumuman</DialogTitle>
            </div>
            <DialogDescription className="text-sm pl-[52px]">
              Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.
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
                  Hapus Pengumuman
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
