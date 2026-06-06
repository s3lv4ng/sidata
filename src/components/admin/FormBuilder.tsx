'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  FileText,
  Save,
  Eye,
  GripVertical,
  CalendarDays,
  Type,
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  Upload,
  ChevronDownIcon,
  GripIcon,
  ShortText,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormFieldData {
  id?: string
  label: string
  type: FieldType
  required: boolean
  options: string[]
  order: number
}

type FieldType =
  | 'short_text'
  | 'paragraph'
  | 'number'
  | 'date'
  | 'multiple_choice'
  | 'checkbox'
  | 'file_upload'
  | 'dropdown'

interface FormDetail {
  id: string
  title: string
  description: string | null
  isActive: boolean
  isClosed: boolean
  deadline: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  fields: Array<{
    id: string
    label: string
    type: string
    required: boolean
    options: string | null
    order: number
  }>
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FIELD_TYPES: Array<{ value: FieldType; label: string; icon: React.ElementType }> = [
  { value: 'short_text', label: 'Isian Singkat', icon: Type },
  { value: 'paragraph', label: 'Paragraf', icon: AlignLeft },
  { value: 'number', label: 'Angka', icon: Hash },
  { value: 'date', label: 'Tanggal', icon: CalendarDays },
  { value: 'multiple_choice', label: 'Pilihan Ganda', icon: List },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'file_upload', label: 'Upload File', icon: Upload },
  { value: 'dropdown', label: 'Dropdown', icon: ChevronDownIcon },
]

const CHOICE_TYPES: FieldType[] = ['multiple_choice', 'checkbox', 'dropdown']

function getFieldTypeInfo(type: FieldType) {
  return FIELD_TYPES.find((ft) => ft.value === type) || FIELD_TYPES[0]
}

function createEmptyField(order: number): FormFieldData {
  return {
    label: '',
    type: 'short_text',
    required: false,
    options: [],
    order,
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FormBuilder() {
  const { data: session } = useSession()
  const { currentView, selectedFormId, setCurrentView, setSelectedForm } = useAppStore()

  const isEditing = currentView === 'admin-form-edit' && !!selectedFormId

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [fields, setFields] = useState<FormFieldData[]>([createEmptyField(0)])
  const [saving, setSaving] = useState(false)
  const [loadingForm, setLoadingForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const userId = (session?.user as any)?.id || ''

  // ─── Fetch form data when editing ──────────────────────────────────────

  const fetchFormData = useCallback(async () => {
    if (!selectedFormId) return
    try {
      setLoadingForm(true)
      const res = await fetch(`/api/forms/${selectedFormId}`)
      if (res.ok) {
        const data: FormDetail = await res.json()
        setTitle(data.title)
        setDescription(data.description || '')
        setDeadline(data.deadline ? new Date(data.deadline) : undefined)
        setFields(
          data.fields.length > 0
            ? data.fields.map((f, idx) => ({
                id: f.id,
                label: f.label,
                type: f.type as FieldType,
                required: f.required,
                options: f.options ? JSON.parse(f.options) : [],
                order: idx,
              }))
            : [createEmptyField(0)]
        )
      }
    } catch (err) {
      console.error('Failed to fetch form:', err)
    } finally {
      setLoadingForm(false)
    }
  }, [selectedFormId])

  useEffect(() => {
    if (isEditing) {
      fetchFormData()
    } else {
      // Reset for new form
      setTitle('')
      setDescription('')
      setDeadline(undefined)
      setFields([createEmptyField(0)])
    }
  }, [isEditing, fetchFormData])

  // ─── Field operations ──────────────────────────────────────────────────

  const addField = () => {
    setFields([...fields, createEmptyField(fields.length)])
  }

  const removeField = (index: number) => {
    if (fields.length <= 1) return
    const updated = fields.filter((_, i) => i !== index)
    setFields(updated.map((f, i) => ({ ...f, order: i })))
  }

  const updateField = (index: number, updates: Partial<FormFieldData>) => {
    const updated = [...fields]
    updated[index] = { ...updated[index], ...updates }
    // If type changed to a non-choice type, clear options
    if (updates.type && !CHOICE_TYPES.includes(updates.type)) {
      updated[index].options = []
    }
    // If type changed to a choice type and no options, add default
    if (updates.type && CHOICE_TYPES.includes(updates.type) && updated[index].options.length === 0) {
      updated[index].options = ['Pilihan 1', 'Pilihan 2']
    }
    setFields(updated)
  }

  const moveFieldUp = (index: number) => {
    if (index === 0) return
    const updated = [...fields]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    setFields(updated.map((f, i) => ({ ...f, order: i })))
  }

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return
    const updated = [...fields]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    setFields(updated.map((f, i) => ({ ...f, order: i })))
  }

  const addOption = (fieldIndex: number) => {
    const updated = [...fields]
    const currentOptions = updated[fieldIndex].options
    updated[fieldIndex].options = [...currentOptions, `Pilihan ${currentOptions.length + 1}`]
    setFields(updated)
  }

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const updated = [...fields]
    updated[fieldIndex].options[optionIndex] = value
    setFields(updated)
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...fields]
    updated[fieldIndex].options = updated[fieldIndex].options.filter((_, i) => i !== optionIndex)
    setFields(updated)
  }

  // ─── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!title.trim()) return

    try {
      setSaving(true)
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline ? deadline.toISOString() : null,
        createdById: userId,
        fields: fields.map((f) => ({
          label: f.label.trim(),
          type: f.type,
          required: f.required,
          options: CHOICE_TYPES.includes(f.type) && f.options.length > 0 ? f.options : null,
        })),
        userId,
      }

      if (isEditing && selectedFormId) {
        const res = await fetch(`/api/forms/${selectedFormId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            isActive: true,
            isClosed: false,
          }),
        })
        if (res.ok) {
          setCurrentView('admin-forms')
        }
      } else {
        const res = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setSelectedForm(null)
          setCurrentView('admin-forms')
        }
      }
    } catch (err) {
      console.error('Failed to save form:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    setSelectedForm(null)
    setCurrentView('admin-forms')
  }

  // ─── Loading ───────────────────────────────────────────────────────────

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data form...</span>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">
              {isEditing ? 'Edit Form' : 'Buat Form Baru'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEditing ? 'Ubah detail dan field form' : 'Isi detail dan tambahkan field untuk form baru'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{showPreview ? 'Sembunyikan' : 'Preview'}</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="gap-2 shadow-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>

        <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          {/* ─── Editor Column ────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Form Details Card */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Detail Form</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form-title" className="text-xs font-medium">
                    Judul Form <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="form-title"
                    placeholder="Masukkan judul form..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-desc" className="text-xs font-medium">
                    Deskripsi
                  </Label>
                  <Textarea
                    id="form-desc"
                    placeholder="Deskripsi singkat tentang form ini (opsional)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Deadline</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-left font-normal"
                      >
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        {deadline ? (
                          format(deadline, 'dd MMMM yyyy', { locale: idLocale })
                        ) : (
                          <span className="text-muted-foreground">Pilih tanggal deadline (opsional)</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={(date) => {
                          setDeadline(date)
                          setCalendarOpen(false)
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                      {deadline && (
                        <div className="px-3 pb-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeadline(undefined)
                              setCalendarOpen(false)
                            }}
                            className="text-xs text-muted-foreground"
                          >
                            Hapus deadline
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Fields Builder Card */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <GripIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Field Form</CardTitle>
                      <p className="text-[11px] text-muted-foreground">{fields.length} field</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={addField} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fields.map((field, index) => (
                  <FieldEditor
                    key={index}
                    field={field}
                    index={index}
                    total={fields.length}
                    onUpdate={(updates) => updateField(index, updates)}
                    onRemove={() => removeField(index)}
                    onMoveUp={() => moveFieldUp(index)}
                    onMoveDown={() => moveFieldDown(index)}
                    onAddOption={() => addOption(index)}
                    onUpdateOption={(optIdx, val) => updateOption(index, optIdx, val)}
                    onRemoveOption={(optIdx) => removeOption(index, optIdx)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ─── Preview Column ───────────────────────────────────────── */}
          {showPreview && (
            <div className="lg:sticky lg:top-20 lg:self-start">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-violet-600" />
                    </div>
                    <CardTitle className="text-sm font-semibold">Pratinjau Form</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-white space-y-4">
                    {/* Preview Title */}
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {title || 'Judul Form'}
                      </h3>
                      {description && (
                        <p className="text-xs text-muted-foreground mt-1">{description}</p>
                      )}
                      {deadline && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">
                            Deadline: {format(deadline, 'dd MMMM yyyy', { locale: idLocale })}
                          </span>
                        </div>
                      )}
                    </div>
                    <Separator />
                    {/* Preview Fields */}
                    <div className="space-y-4">
                      {fields.map((field, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            {field.label || 'Label Field'}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          {renderPreviewField(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// ─── Field Editor Sub-component ─────────────────────────────────────────────

function FieldEditor({
  field,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: {
  field: FormFieldData
  index: number
  total: number
  onUpdate: (updates: Partial<FormFieldData>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddOption: () => void
  onUpdateOption: (optIdx: number, val: string) => void
  onRemoveOption: (optIdx: number) => void
}) {
  const typeInfo = getFieldTypeInfo(field.type)
  const isChoiceType = CHOICE_TYPES.includes(field.type)

  return (
    <div className="border rounded-lg bg-white p-4 space-y-3 group hover:border-primary/30 transition-colors">
      {/* Field header */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onMoveUp}
                disabled={index === 0}
                className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label="Pindah ke atas"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Pindah ke atas</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onMoveDown}
                disabled={index === total - 1}
                className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label="Pindah ke bawah"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Pindah ke bawah</TooltipContent>
          </Tooltip>
        </div>

        <Badge variant="secondary" className="text-[10px] font-mono px-1.5">
          {index + 1}
        </Badge>

        <div className="flex-1 min-w-0">
          <Input
            placeholder="Label field..."
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-8 text-sm border-transparent hover:border-input focus:border-input bg-transparent hover:bg-background focus:bg-background transition-colors font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Required toggle */}
          <div className="flex items-center gap-1.5">
            <Label className="text-[11px] text-muted-foreground cursor-pointer select-none">Wajib</Label>
            <Switch
              checked={field.required}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
          </div>

          {/* Remove button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
                onClick={onRemove}
                disabled={total <= 1}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hapus Field</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Field type selector */}
      <div className="flex items-center gap-2 pl-7">
        <Label className="text-[11px] text-muted-foreground w-12 shrink-0">Tipe</Label>
        <Select value={field.type} onValueChange={(val) => onUpdate({ type: val as FieldType })}>
          <SelectTrigger className="h-8 text-xs w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((ft) => {
              const Icon = ft.icon
              return (
                <SelectItem key={ft.value} value={ft.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{ft.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
          {(() => {
            const Icon = typeInfo.icon
            return <Icon className="w-3 h-3" />
          })()}
          {typeInfo.label}
        </Badge>
      </div>

      {/* Options editor for choice types */}
      {isChoiceType && (
        <div className="pl-7 space-y-2">
          <Label className="text-[11px] text-muted-foreground">Pilihan</Label>
          <div className="space-y-1.5">
            {field.options.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">
                  {optIdx + 1}.
                </span>
                <Input
                  value={opt}
                  onChange={(e) => onUpdateOption(optIdx, e.target.value)}
                  className="h-7 text-xs"
                  placeholder={`Pilihan ${optIdx + 1}`}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 shrink-0"
                      onClick={() => onRemoveOption(optIdx)}
                      disabled={field.options.length <= 1}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus pilihan</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddOption}
            className="gap-1.5 text-xs h-7"
          >
            <Plus className="w-3 h-3" />
            Tambah Pilihan
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Preview Renderer ───────────────────────────────────────────────────────

function renderPreviewField(field: FormFieldData) {
  switch (field.type) {
    case 'short_text':
      return (
        <Input
          disabled
          placeholder="Isian singkat..."
          className="h-8 text-xs bg-muted/30"
        />
      )
    case 'paragraph':
      return (
        <Textarea
          disabled
          placeholder="Paragraf..."
          rows={3}
          className="text-xs bg-muted/30 resize-none"
        />
      )
    case 'number':
      return (
        <Input
          disabled
          type="number"
          placeholder="0"
          className="h-8 text-xs bg-muted/30"
        />
      )
    case 'date':
      return (
        <Input
          disabled
          type="date"
          className="h-8 text-xs bg-muted/30"
        />
      )
    case 'multiple_choice':
      return (
        <div className="space-y-1.5">
          {field.options.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-not-allowed">
              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
              <span className="text-xs text-muted-foreground">{opt || `Pilihan ${idx + 1}`}</span>
            </label>
          ))}
        </div>
      )
    case 'checkbox':
      return (
        <div className="space-y-1.5">
          {field.options.map((opt, idx) => (
            <label key={idx} className="flex items-center gap-2 cursor-not-allowed">
              <div className="w-3.5 h-3.5 rounded border border-muted-foreground/30 shrink-0" />
              <span className="text-xs text-muted-foreground">{opt || `Pilihan ${idx + 1}`}</span>
            </label>
          ))}
        </div>
      )
    case 'dropdown':
      return (
        <Select disabled>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={field.options[0] || 'Pilih...'} />
          </SelectTrigger>
        </Select>
      )
    case 'file_upload':
      return (
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center">
          <Upload className="w-5 h-5 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-[11px] text-muted-foreground/50">Upload file</p>
        </div>
      )
    default:
      return null
  }
}
