'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  AlertTriangle,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  Shield,
  User,
  Mail,
} from 'lucide-react'
import { PaginationBar } from '@/components/shared/PaginationBar'

interface UserItem {
  id: string
  nip: string
  name: string
  role: string
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

const ITEMS_PER_PAGE = 10

export default function AdminUsers() {
  const { data: session } = useSession()
  const { addNotification } = useAppStore()
  const userId = (session?.user as any)?.id || ''

  // Data
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formNip, setFormNip] = useState('')
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState('ASN')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formJabatan, setFormJabatan] = useState('')
  const [formPangkat, setFormPangkat] = useState('')
  const [formUnitKerja, setFormUnitKerja] = useState('BKAD Kabupaten Seruyan')
  const [formBidang, setFormBidang] = useState('')
  const [formStatusASN, setFormStatusASN] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reset password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Dynamic master data options
  const [bidangOptions, setBidangOptions] = useState<string[]>([])
  const [statusASNOptions, setStatusASNOptions] = useState<string[]>([])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch both ASN and Admin users
      const res = await fetch('/api/asn?allRoles=true')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        // Fallback: fetch ASN only
        const res2 = await fetch('/api/asn')
        if (res2.ok) {
          const data = await res2.json()
          setUsers(data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      addNotification('Gagal memuat data user', 'error')
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Fetch Bidang and Status ASN options from Data Master
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [bidangRes, statusRes] = await Promise.all([
          fetch('/api/bidang'),
          fetch('/api/status-asn'),
        ])
        if (bidangRes.ok) {
          const bidangData = await bidangRes.json()
          if (Array.isArray(bidangData)) {
            const names = bidangData.map((b: any) => b.name).filter(Boolean)
            setBidangOptions(names.length > 0 ? names : ['Pendapatan', 'Belanja', 'Aset', 'Umum'])
          } else {
            setBidangOptions(['Pendapatan', 'Belanja', 'Aset', 'Umum'])
          }
        } else {
          setBidangOptions(['Pendapatan', 'Belanja', 'Aset', 'Umum'])
        }
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (Array.isArray(statusData)) {
            const names = statusData.map((s: any) => s.name).filter(Boolean)
            setStatusASNOptions(names.length > 0 ? names : ['PNS', 'PPPK'])
          } else {
            setStatusASNOptions(['PNS', 'PPPK'])
          }
        } else {
          setStatusASNOptions(['PNS', 'PPPK'])
        }
      } catch {
        // Fallback to defaults
        setBidangOptions(['Pendapatan', 'Belanja', 'Aset', 'Umum'])
        setStatusASNOptions(['PNS', 'PPPK'])
      }
    }
    fetchMasterData()
  }, [])

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.nip.toLowerCase().includes(searchQuery.toLowerCase())
    return matchRole && matchSearch
  })

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter])

  const handleOpenCreate = () => {
    setDialogMode('create')
    setFormNip('')
    setFormName('')
    setFormRole('ASN')
    setFormEmail('')
    setFormPhone('')
    setFormJabatan('')
    setFormPangkat('')
    setFormUnitKerja('BKAD Kabupaten Seruyan')
    setFormBidang('')
    setFormStatusASN('')
    setFormPassword('')
    setFormIsActive(true)
    setEditingId(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (user: UserItem) => {
    setDialogMode('edit')
    setFormNip(user.nip)
    setFormName(user.name)
    setFormRole(user.role)
    setFormEmail(user.email || '')
    setFormPhone(user.phone || '')
    setFormJabatan(user.jabatan || '')
    setFormPangkat(user.pangkat || '')
    setFormUnitKerja(user.unitKerja || '')
    setFormBidang(user.bidang || '')
    setFormStatusASN(user.statusASN || '')
    setFormPassword('')
    setFormIsActive(user.isActive)
    setEditingId(user.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formNip.trim() || !formName.trim()) {
      addNotification('NIP dan Nama harus diisi', 'warning')
      return
    }

    try {
      setSaving(true)

      if (dialogMode === 'create') {
        const res = await fetch('/api/asn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nip: formNip.trim(),
            name: formName.trim(),
            role: formRole,
            email: formEmail.trim() || null,
            phone: formPhone.trim() || null,
            jabatan: formJabatan.trim() || null,
            pangkat: formPangkat.trim() || null,
            unitKerja: formUnitKerja.trim() || null,
            bidang: formBidang || null,
            statusASN: formStatusASN || null,
            password: formPassword.trim() || formNip.trim(),
            adminId: userId,
          }),
        })
        if (res.ok) {
          addNotification(
            `${formRole === 'ADMIN' ? 'Admin' : 'ASN'} berhasil ditambahkan`,
            'success'
          )
          await fetchUsers()
          setDialogOpen(false)
        } else {
          const data = await res.json()
          addNotification(data.error || 'Gagal menambahkan user', 'error')
        }
      } else if (dialogMode === 'edit' && editingId) {
        const res = await fetch(`/api/asn/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim() || null,
            phone: formPhone.trim() || null,
            jabatan: formJabatan.trim() || null,
            pangkat: formPangkat.trim() || null,
            unitKerja: formUnitKerja.trim() || null,
            bidang: formBidang || null,
            statusASN: formStatusASN || null,
            isActive: formIsActive,
            password: formPassword.trim() || undefined,
            adminId: userId,
          }),
        })
        if (res.ok) {
          addNotification('Data user berhasil diperbarui', 'success')
          await fetchUsers()
          setDialogOpen(false)
        } else {
          const data = await res.json()
          addNotification(data.error || 'Gagal memperbarui user', 'error')
        }
      }
    } catch (err) {
      console.error('Failed to save user:', err)
      addNotification('Gagal menyimpan data user', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/asn/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !user.isActive,
          adminId: userId,
        }),
      })
      if (res.ok) {
        addNotification(
          user.isActive
            ? `${user.name} berhasil dinonaktifkan`
            : `${user.name} berhasil diaktifkan`,
          'success'
        )
        await fetchUsers()
      } else {
        addNotification('Gagal mengubah status user', 'error')
      }
    } catch (err) {
      console.error('Failed to toggle active:', err)
      addNotification('Gagal mengubah status user', 'error')
    }
  }

  const handleResetPassword = async () => {
    if (!resettingId) return

    try {
      setResetting(true)
      const user = users.find((u) => u.id === resettingId)
      const res = await fetch(`/api/asn/${resettingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: user?.nip || 'reset123',
          adminId: userId,
        }),
      })
      if (res.ok) {
        addNotification(
          `Password ${user?.name || 'user'} berhasil direset ke NIP`,
          'success'
        )
        setResetDialogOpen(false)
        setResettingId(null)
      } else {
        addNotification('Gagal mereset password', 'error')
      }
    } catch (err) {
      console.error('Failed to reset password:', err)
      addNotification('Gagal mereset password', 'error')
    } finally {
      setResetting(false)
    }
  }

  const confirmResetPassword = (id: string) => {
    setResettingId(id)
    setResetDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingId) return

    try {
      setDeleting(true)
      const res = await fetch(`/api/asn/${deletingId}?userId=${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        addNotification('User berhasil dihapus', 'success')
        await fetchUsers()
        setDeleteDialogOpen(false)
        setDeletingId(null)
      } else {
        const data = await res.json()
        addNotification(data.error || 'Gagal menghapus user', 'error')
      }
    } catch (err) {
      console.error('Failed to delete user:', err)
      addNotification('Gagal menghapus user', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const confirmDelete = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const adminCount = users.filter((u) => u.role === 'ADMIN').length
  const asnCount = users.filter((u) => u.role === 'ASN').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data user...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Manajemen User</h2>
            <p className="text-xs text-muted-foreground">
              {users.length} user terdaftar
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Tambah User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 dark:bg-sky-900/30">
              <UserCog className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{users.length}</p>
              <p className="text-[10px] text-muted-foreground">Total User</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 dark:bg-violet-900/30">
              <Shield className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{adminCount}</p>
              <p className="text-[10px] text-muted-foreground">Admin</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 dark:bg-emerald-900/30">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{asnCount}</p>
              <p className="text-[10px] text-muted-foreground">ASN</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 dark:bg-amber-900/30">
              <ToggleLeft className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                {users.filter((u) => !u.isActive).length}
              </p>
              <p className="text-[10px] text-muted-foreground">Nonaktif</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan nama atau NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="ASN">ASN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="border-border/60 flex flex-col max-h-[calc(100vh-340px)]">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <UserCog className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery || roleFilter !== 'all'
                ? 'Tidak ada user yang sesuai filter'
                : 'Belum ada user terdaftar'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery || roleFilter !== 'all'
                ? 'Coba ubah filter atau kata kunci pencarian'
                : 'Klik "Tambah User" untuk menambahkan user baru'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b">
                    <TableHead className="w-[40px] text-center">No</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-[140px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user, idx) => (
                    <TableRow key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{user.nip}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                              user.role === 'ADMIN'
                                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                                : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                            }`}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" title={user.name}>{user.name}</p>
                            {user.bidang && (
                              <p className="text-[10px] text-muted-foreground truncate" title={user.bidang}>
                                {user.bidang}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[10px] font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-50 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800'
                              : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800'
                          }`}
                          variant="outline"
                        >
                          {user.role === 'ADMIN' ? (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              ASN
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate min-w-[200px] inline-block" title={user.email}>{user.email}</span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`text-[10px] font-medium ${
                            user.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-muted dark:text-muted-foreground dark:border-muted'
                          }`}
                          variant="outline"
                        >
                          {user.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className={`h-8 w-8 border-amber-200 dark:border-amber-800 ${
                              user.isActive
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30 dark:border-emerald-800'
                            }`}
                            onClick={() => handleToggleActive(user)}
                            title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {user.isActive ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-50 border-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 dark:border-slate-700"
                            onClick={() => handleOpenEdit(user)}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50 border-violet-200 dark:text-violet-400 dark:hover:text-violet-300 dark:hover:bg-violet-900/30 dark:border-violet-800"
                            onClick={() => confirmResetPassword(user.id)}
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 dark:border-red-800"
                            onClick={() => confirmDelete(user.id)}
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredUsers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              itemName="data"
            />
          </>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center dark:bg-sky-900/30">
                <UserCog className="w-4 h-4 text-sky-600" />
              </div>
              {dialogMode === 'create' ? 'Tambah User Baru' : 'Edit User'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {dialogMode === 'create'
                ? 'Tambahkan user baru ke dalam sistem'
                : 'Perbarui informasi user'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Role selection */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <p className="text-xs text-muted-foreground">
                  Admin memiliki akses penuh ke semua fitur
                </p>
              </div>
              <Select
                value={formRole}
                onValueChange={setFormRole}
                disabled={dialogMode === 'edit'}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="ASN">ASN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  NIP <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="NIP"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  disabled={dialogMode === 'edit'}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama lengkap"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Nomor HP</Label>
                <Input
                  placeholder="Nomor HP"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* ASN-specific fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Jabatan</Label>
                <Input
                  placeholder="Jabatan"
                  value={formJabatan}
                  onChange={(e) => setFormJabatan(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Pangkat/Golongan</Label>
                <Input
                  placeholder="Pangkat/Golongan"
                  value={formPangkat}
                  onChange={(e) => setFormPangkat(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Unit Kerja</Label>
                <Input
                  placeholder="Unit Kerja"
                  value={formUnitKerja}
                  onChange={(e) => setFormUnitKerja(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Bidang</Label>
                <Select value={formBidang} onValueChange={setFormBidang}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bidang" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show current bidang if it exists but isn't in master data */}
                    {formBidang && !bidangOptions.includes(formBidang) && (
                      <SelectItem key={formBidang} value={formBidang}>{formBidang}</SelectItem>
                    )}
                    {bidangOptions.map((bidang) => (
                      <SelectItem key={bidang} value={bidang}>{bidang}</SelectItem>
                    ))}
                    {bidangOptions.length === 0 && !formBidang && (
                      <SelectItem value="_empty" disabled>Tidak ada data bidang</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Status ASN</Label>
                <Select value={formStatusASN} onValueChange={setFormStatusASN}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Show current status if it exists but isn't in master data */}
                    {formStatusASN && !statusASNOptions.includes(formStatusASN) && (
                      <SelectItem key={formStatusASN} value={formStatusASN}>{formStatusASN}</SelectItem>
                    )}
                    {statusASNOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                    {statusASNOptions.length === 0 && !formStatusASN && (
                      <SelectItem value="_empty" disabled>Tidak ada data status</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Password{' '}
                  {dialogMode === 'create' && (
                    <span className="text-muted-foreground font-normal">
                      (default: NIP)
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={
                    dialogMode === 'create'
                      ? 'Kosongkan untuk menggunakan NIP'
                      : 'Kosongkan jika tidak diubah'
                  }
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
              <div>
                <Label className="text-sm font-medium">Status Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  {formIsActive
                    ? 'User dapat mengakses sistem'
                    : 'User tidak dapat mengakses sistem'}
                </p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
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
              disabled={saving || !formNip.trim() || !formName.trim()}
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
                      Tambah User
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
              <DialogTitle className="text-lg">Hapus User</DialogTitle>
            </div>
            <DialogDescription className="text-sm pl-[52px]">
              Apakah Anda yakin ingin menghapus user ini? Semua data terkait (respon, log
              aktivitas) juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
                  Hapus User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center dark:bg-sky-900/30">
                <KeyRound className="w-5 h-5 text-sky-600" />
              </div>
              <DialogTitle className="text-lg">Reset Password</DialogTitle>
            </div>
            <DialogDescription className="text-sm pl-[52px]">
              Password user akan direset menjadi NIP mereka. User akan dapat mengubah
              password setelah login kembali.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetting}
            >
              Batal
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetting}
              className="gap-2"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mereset...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
