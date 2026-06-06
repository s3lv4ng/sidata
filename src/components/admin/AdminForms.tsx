'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  FileText,
  CalendarDays,
  AlertTriangle,
  Eye,
  ChevronUp,
  ChevronDown,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  options: string | null
  order: number
}

interface FormItem {
  id: string
  title: string
  description: string | null
  isActive: boolean
  isClosed: boolean
  deadline: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  fields: FormField[]
  responses: Array<{ id: string; userId?: string; submittedAt: string }>
  createdBy: { id: string; name: string; nip: string }
}

function getStatusInfo(form: FormItem): { label: string; color: string } {
  if (form.isClosed) return { label: 'Ditutup', color: 'red' }
  if (!form.isActive) return { label: 'Tidak Aktif', color: 'yellow' }
  return { label: 'Aktif', color: 'green' }
}

function getDeadlineInfo(deadline: string | null): { text: string; isOverdue: boolean; isUrgent: boolean } {
  if (!deadline) return { text: 'Tanpa deadline', isOverdue: false, isUrgent: false }
  const now = new Date()
  const dl = new Date(deadline)
  const diffMs = dl.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { text: 'Sudah Lewat', isOverdue: true, isUrgent: false }
  if (diffDays === 0) return { text: 'Hari ini', isOverdue: false, isUrgent: true }
  if (diffDays <= 3) return { text: `${diffDays} hari lagi`, isOverdue: false, isUrgent: true }
  return { text: `${diffDays} hari lagi`, isOverdue: false, isUrgent: false }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminForms() {
  const { data: session } = useSession()
  const { setCurrentView, setSelectedForm } = useAppStore()
  const [forms, setForms] = useState<FormItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<FormItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Sorting state
  type SortKey = 'title' | 'status' | 'deadline' | 'responseCount'
  type SortDir = 'asc' | 'desc'
  const [sortKey, setSortKey] = useState<SortKey>('deadline')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const userId = (session?.user as any)?.id || ''

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/forms')
      if (res.ok) {
        const data = await res.json()
        setForms(data)
      }
    } catch (err) {
      console.error('Failed to fetch forms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const filteredForms = forms.filter((form) => {
    const matchesSearch = form.title.toLowerCase().includes(searchQuery.toLowerCase())
    if (statusFilter === 'all') return matchesSearch
    if (statusFilter === 'aktif') return matchesSearch && form.isActive && !form.isClosed
    if (statusFilter === 'tidak-aktif') return matchesSearch && !form.isActive && !form.isClosed
    if (statusFilter === 'ditutup') return matchesSearch && form.isClosed
    return matchesSearch
  })

  // Sorted forms
  const sortedForms = [...filteredForms].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'title':
        return dir * a.title.localeCompare(b.title)
      case 'status': {
        const statusOrder = (f: FormItem) => {
          if (f.isClosed) return 2
          if (!f.isActive) return 1
          return 0
        }
        return dir * (statusOrder(a) - statusOrder(b))
      }
      case 'deadline': {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity
        const db2 = b.deadline ? new Date(b.deadline).getTime() : Infinity
        return dir * (da - db2)
      }
      case 'responseCount':
        return dir * ((a.responses?.length || 0) - (b.responses?.length || 0))
      default:
        return 0
    }
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'deadline' ? 'asc' : 'asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ChevronUp className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    )
  }

  const handleDuplicate = async (form: FormItem) => {
    try {
      setDuplicatingId(form.id)
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${form.title} (Salinan)`,
          description: form.description,
          deadline: form.deadline,
          createdById: userId,
          fields: form.fields.map((f) => ({
            label: f.label,
            type: f.type,
            required: f.required,
            options: f.options ? JSON.parse(f.options) : null,
          })),
        }),
      })
      if (res.ok) {
        await fetchForms()
        toast.success('Form berhasil diduplikat')
      } else {
        toast.error('Gagal menduplikat form')
      }
    } catch (err) {
      console.error('Failed to duplicate form:', err)
      toast.error('Gagal menduplikat form')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleToggleActive = async (form: FormItem) => {
    try {
      setTogglingId(form.id)
      const res = await fetch(`/api/forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !form.isActive,
          isClosed: form.isClosed,
          userId,
        }),
      })
      if (res.ok) {
        await fetchForms()
      }
    } catch (err) {
      console.error('Failed to toggle form status:', err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!formToDelete) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/forms/${formToDelete.id}?userId=${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchForms()
        setDeleteDialogOpen(false)
        setFormToDelete(null)
      }
    } catch (err) {
      console.error('Failed to delete form:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (form: FormItem) => {
    setSelectedForm(form.id, form.title)
    setCurrentView('admin-form-edit')
  }

  const handleCreateNew = () => {
    setSelectedForm(null)
    setCurrentView('admin-form-create')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data form...</span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Manajemen Form</h2>
              <p className="text-xs text-muted-foreground">{forms.length} form terdaftar</p>
            </div>
          </div>
          <Button onClick={handleCreateNew} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Buat Form Baru
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari form berdasarkan judul..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'aktif', label: 'Aktif' },
                  { key: 'tidak-aktif', label: 'Tidak Aktif' },
                  { key: 'ditutup', label: 'Ditutup' },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={statusFilter === filter.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(filter.key)}
                    className="text-xs"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms Table (desktop) */}
        {sortedForms.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Tidak ada form yang sesuai filter'
                  : 'Belum ada form yang dibuat'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Coba ubah kata kunci atau filter'
                  : 'Klik "Buat Form Baru" untuk menambahkan form'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table view */}
            <Card className="border-border/60 overflow-hidden hidden md:block">
              <ScrollArea className="max-h-[calc(100vh-320px)]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead className="min-w-[200px]">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('title')}>
                          Judul Form <SortIcon column="title" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px] text-center">
                        <button className="flex items-center gap-1 justify-center w-full hover:text-foreground transition-colors" onClick={() => handleSort('status')}>
                          Status <SortIcon column="status" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('deadline')}>
                          Deadline <SortIcon column="deadline" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[180px]">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('responseCount')}>
                          Jumlah Respons <SortIcon column="responseCount" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[170px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedForms.map((form, index) => {
                      const status = getStatusInfo(form)
                      const deadlineInfo = getDeadlineInfo(form.deadline)
                      const responseCount = form.responses?.length || 0

                      return (
                        <TableRow key={form.id} className="group">
                          <TableCell className="text-center text-muted-foreground text-sm">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate max-w-[250px]">
                                {form.title}
                              </p>
                              {form.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[250px] mt-0.5">
                                  {form.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground/60">
                                  {form.fields.length} field
                                </span>
                                <span className="text-[10px] text-muted-foreground/40">·</span>
                                <span className="text-[10px] text-muted-foreground/60">
                                  {formatDate(form.createdAt)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[11px] font-medium ${
                                status.color === 'green'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : status.color === 'yellow'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              }`}
                              variant="outline"
                            >
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {form.deadline ? (
                              <div className="flex items-center gap-1.5">
                                <CalendarDays
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    deadlineInfo.isOverdue
                                      ? 'text-red-500'
                                      : deadlineInfo.isUrgent
                                      ? 'text-amber-500'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                                <div>
                                  <p
                                    className={`text-xs font-medium ${
                                      deadlineInfo.isOverdue
                                        ? 'text-red-600'
                                        : deadlineInfo.isUrgent
                                        ? 'text-amber-600'
                                        : 'text-foreground'
                                    }`}
                                  >
                                    {deadlineInfo.text}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatDate(form.deadline)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">
                                  {responseCount} respons
                                </span>
                              </div>
                              <Progress
                                value={responseCount > 0 ? Math.min((responseCount / Math.max(responseCount, 1)) * 100, 100) : 0}
                                className="h-1.5"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleEdit(form)}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Form</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                                    onClick={() => handleDuplicate(form)}
                                    disabled={duplicatingId === form.id}
                                  >
                                    {duplicatingId === form.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplikat Form</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${
                                      form.isActive
                                        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                        : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                    onClick={() => handleToggleActive(form)}
                                    disabled={togglingId === form.id}
                                  >
                                    {togglingId === form.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : form.isActive ? (
                                      <ToggleRight className="w-4 h-4" />
                                    ) : (
                                      <ToggleLeft className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {form.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      setFormToDelete(form)
                                      setDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Hapus Form</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {sortedForms.map((form) => {
                const status = getStatusInfo(form)
                const deadlineInfo = getDeadlineInfo(form.deadline)
                const responseCount = form.responses?.length || 0

                return (
                  <Card key={form.id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground truncate">
                            {form.title}
                          </p>
                          {form.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {form.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground/60">
                              {form.fields.length} field
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">·</span>
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDate(form.createdAt)}
                            </span>
                          </div>
                        </div>
                        <Badge
                          className={`text-[11px] font-medium shrink-0 ${
                            status.color === 'green'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status.color === 'yellow'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                          variant="outline"
                        >
                          {status.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Deadline</p>
                          {form.deadline ? (
                            <div className="flex items-center gap-1">
                              <CalendarDays
                                className={`w-3 h-3 shrink-0 ${
                                  deadlineInfo.isOverdue
                                    ? 'text-red-500'
                                    : deadlineInfo.isUrgent
                                    ? 'text-amber-500'
                                    : 'text-muted-foreground'
                                }`}
                              />
                              <span
                                className={`text-xs font-medium ${
                                  deadlineInfo.isOverdue
                                    ? 'text-red-600'
                                    : deadlineInfo.isUrgent
                                    ? 'text-amber-600'
                                    : 'text-foreground'
                                }`}
                              >
                                {deadlineInfo.text}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Respons</p>
                          <span className="text-xs font-medium text-foreground">{responseCount} respons</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 flex-1"
                          onClick={() => handleEdit(form)}
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 flex-1 text-sky-600 border-sky-200 hover:bg-sky-50"
                          onClick={() => handleDuplicate(form)}
                          disabled={duplicatingId === form.id}
                        >
                          {duplicatingId === form.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Duplikat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-7 text-xs gap-1 flex-1 ${
                            form.isActive
                              ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                          }`}
                          onClick={() => handleToggleActive(form)}
                          disabled={togglingId === form.id}
                        >
                          {togglingId === form.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : form.isActive ? (
                            <ToggleRight className="w-3 h-3" />
                          ) : (
                            <ToggleLeft className="w-3 h-3" />
                          )}
                          {form.isActive ? 'Off' : 'On'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 flex-1 text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            setFormToDelete(form)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <DialogTitle className="text-lg">Hapus Form</DialogTitle>
              </div>
              <DialogDescription className="text-sm pl-[52px]">
                Apakah Anda yakin ingin menghapus form{' '}
                <span className="font-semibold text-foreground">&quot;{formToDelete?.title}&quot;</span>?
                Semua respons dan data terkait akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
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
                    Hapus Form
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
