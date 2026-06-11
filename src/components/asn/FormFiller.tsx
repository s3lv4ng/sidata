'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  FileText,
  Save,
  Clock,
  Star,
  ImageIcon,
} from 'lucide-react'

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  options: string | null
  placeholder: string | null
  order: number
}

interface FormResponse {
  id: string
  submittedAt: string
  fields: Array<{
    id: string
    fieldId: string
    value: string | null
    fileName: string | null
    filePath: string | null
    driveFileId: string | null
    driveLink: string | null
    field: FormField
  }>
}

interface FormData {
  id: string
  title: string
  description: string | null
  isActive: boolean
  isClosed: boolean
  deadline: string | null
  fields: FormField[]
  responses: FormResponse[]
}

interface FieldAnswer {
  fieldId: string
  value: string
  fileName?: string
  filePath?: string
  driveFileId?: string
  driveLink?: string
  files?: Array<{ name: string; path: string; driveFileId?: string; driveLink?: string }>
}

export default function FormFiller() {
  const { data: session } = useSession()
  const { selectedFormId, selectedFormTitle, setCurrentView } = useAppStore()

  const [formData, setFormData] = useState<FormData | null>(null)
  const [answers, setAnswers] = useState<FieldAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set())
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; path: string; driveLink?: string; driveUploaded?: boolean }>>({})
  const [multiUploadedFiles, setMultiUploadedFiles] = useState<Record<string, Array<{ name: string; path: string; driveLink?: string; driveUploaded?: boolean }>>>({})
  const [ratingValues, setRatingValues] = useState<Record<string, number>>({})

  const userId = (session?.user as any)?.id || ''
  const userName = session?.user?.name || ''

  const fetchFormData = useCallback(async () => {
    if (!selectedFormId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/forms/${selectedFormId}?userId=${userId}`)
      if (res.ok) {
        const data: FormData = await res.json()
        setFormData(data)

        // Initialize answers from existing response or empty
        if (data.responses && data.responses.length > 0) {
          const existingAnswers: FieldAnswer[] = data.fields.map((field) => {
            const existingField = data.responses[0].fields.find(
              (f) => f.fieldId === field.id
            )
            return {
              fieldId: field.id,
              value: existingField?.value || '',
              fileName: existingField?.fileName || undefined,
              filePath: existingField?.filePath || undefined,
              driveFileId: existingField?.driveFileId || undefined,
              driveLink: existingField?.driveLink || undefined,
            }
          })
          setAnswers(existingAnswers)

          // Set uploaded files info for existing file fields
          const existingFiles: Record<string, { name: string; path: string; driveLink?: string; driveUploaded?: boolean }> = {}
          data.responses[0].fields.forEach((f) => {
            const fieldType = f.field?.type
            if ((fieldType === 'file_upload' || fieldType === 'image_upload' || fieldType === 'multi_upload') && f.fileName && f.filePath) {
              existingFiles[f.fieldId] = {
                name: f.fileName,
                path: f.filePath,
                driveLink: f.driveLink || undefined,
                driveUploaded: !!f.driveLink,
              }
            }
          })
          setUploadedFiles(existingFiles)
        } else {
          setAnswers(
            data.fields.map((field) => ({
              fieldId: field.id,
              value: '',
            }))
          )
        }
      }
    } catch (err) {
      console.error('Failed to fetch form:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedFormId, userId])

  useEffect(() => {
    fetchFormData()
  }, [fetchFormData])

  const updateAnswer = (fieldId: string, value: string) => {
    setAnswers((prev) =>
      prev.map((a) => (a.fieldId === fieldId ? { ...a, value } : a))
    )
  }

  // Get user's bidang from session for Drive folder organization
  const userBidang = (session?.user as any)?.bidang || ''

  const handleFileUpload = async (fieldId: string, file: File) => {
    setUploadingFields((prev) => new Set(prev).add(fieldId))
    setUploadErrors((prev) => { const next = { ...prev }; delete next[fieldId]; return next })
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (userBidang) formData.append('bidang', userBidang)
      if (userId) formData.append('userId', userId)
      if (userName) formData.append('userName', userName)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setUploadedFiles((prev) => ({
          ...prev,
          [fieldId]: {
            name: data.fileName,
            path: data.filePath,
            driveLink: data.driveLink || undefined,
            driveUploaded: data.driveUploaded || false,
          },
        }))
        setAnswers((prev) =>
          prev.map((a) =>
            a.fieldId === fieldId
              ? {
                  ...a,
                  value: data.filePath,
                  fileName: data.fileName,
                  filePath: data.filePath,
                  driveFileId: data.driveFileId || undefined,
                  driveLink: data.driveLink || undefined,
                }
              : a
          )
        )
      } else {
        const data = await res.json().catch(() => ({ error: 'Gagal mengunggah file' }))
        setUploadErrors((prev) => ({ ...prev, [fieldId]: data.error || 'Gagal mengunggah file' }))
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadErrors((prev) => ({ ...prev, [fieldId]: 'Terjadi kesalahan jaringan. Coba lagi.' }))
    } finally {
      setUploadingFields((prev) => {
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    }
  }

  const removeFile = (fieldId: string) => {
    setUploadedFiles((prev) => {
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
    updateAnswer(fieldId, '')
  }

  const handleMultiFileUpload = async (fieldId: string, files: FileList) => {
    setUploadingFields((prev) => new Set(prev).add(fieldId))
    setUploadErrors((prev) => { const next = { ...prev }; delete next[fieldId]; return next })
    try {
      const uploaded: Array<{ name: string; path: string; driveFileId?: string; driveLink?: string; driveUploaded?: boolean }> = []
      let hasError = false
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        if (userBidang) formData.append('bidang', userBidang)
        if (userId) formData.append('userId', userId)
        if (userName) formData.append('userName', userName)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          uploaded.push({
            name: data.fileName,
            path: data.filePath,
            driveFileId: data.driveFileId || undefined,
            driveLink: data.driveLink || undefined,
            driveUploaded: data.driveUploaded || false,
          })
        } else {
          hasError = true
        }
      }
      if (hasError && uploaded.length === 0) {
        setUploadErrors((prev) => ({ ...prev, [fieldId]: 'Gagal mengunggah beberapa file. Coba lagi.' }))
      }

      setMultiUploadedFiles((prev) => ({
        ...prev,
        [fieldId]: [...(prev[fieldId] || []), ...uploaded],
      }))

      // Store as JSON array of file info
      const allFiles = [...(multiUploadedFiles[fieldId] || []), ...uploaded]
      updateAnswer(fieldId, JSON.stringify(allFiles.map((f) => ({ name: f.name, path: f.path, driveFileId: f.driveFileId, driveLink: f.driveLink }))))
    } catch (err) {
      console.error('Multi upload failed:', err)
    } finally {
      setUploadingFields((prev) => {
        const next = new Set(prev)
        next.delete(fieldId)
        return next
      })
    }
  }

  const removeMultiFile = (fieldId: string, fileIndex: number) => {
    setMultiUploadedFiles((prev) => {
      const files = [...(prev[fieldId] || [])]
      files.splice(fileIndex, 1)
      const updated = { ...prev, [fieldId]: files }
      // Update answer with remaining files
      const remaining = files.map((f) => ({ name: f.name, path: f.path, driveFileId: f.driveFileId, driveLink: f.driveLink }))
      updateAnswer(fieldId, remaining.length > 0 ? JSON.stringify(remaining) : '')
      return updated
    })
  }

  const handleRatingClick = (fieldId: string, rating: number) => {
    setRatingValues((prev) => ({ ...prev, [fieldId]: rating }))
    updateAnswer(fieldId, String(rating))
  }

  const handleSubmit = async () => {
    if (!formData || !selectedFormId) return

    // Validate required fields
    const missingRequired = formData.fields
      .filter((field) => {
        if (!field.required) return false
        const answer = answers.find((a) => a.fieldId === field.id)
        return !answer || !answer.value.trim()
      })
      .map((f) => f.label)

    if (missingRequired.length > 0) {
      setSubmitError(`Field wajib belum diisi: ${missingRequired.join(', ')}`)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const fields = answers.map((a) => ({
        fieldId: a.fieldId,
        value: a.value || null,
        fileName: a.fileName || null,
        filePath: a.filePath || null,
        driveFileId: a.driveFileId || null,
        driveLink: a.driveLink || null,
      }))

      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: selectedFormId,
          userId,
          fields,
        }),
      })

      if (res.ok) {
        setSubmitSuccess(true)
      } else {
        const data = await res.json()
        setSubmitError(data.error || 'Gagal mengirim formulir')
      }
    } catch {
      setSubmitError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const parseOptions = (options: string | null): string[] => {
    if (!options) return []
    try {
      return JSON.parse(options)
    } catch {
      return options.split(',').map((o) => o.trim())
    }
  }

  const getCheckboxValues = (fieldId: string): string[] => {
    const answer = answers.find((a) => a.fieldId === fieldId)
    if (!answer?.value) return []
    try {
      return JSON.parse(answer.value)
    } catch {
      return answer.value.split(',').map((v) => v.trim()).filter(Boolean)
    }
  }

  const toggleCheckboxValue = (fieldId: string, option: string) => {
    const current = getCheckboxValues(fieldId)
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option]
    updateAnswer(fieldId, JSON.stringify(next))
  }

  const isFormClosed =
    formData?.isClosed ||
    (formData?.deadline && new Date(formData.deadline) < new Date())

  const isExistingResponse = formData?.responses && formData.responses.length > 0

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Memuat formulir...</p>
      </div>
    )
  }

  // Success state
  if (submitSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Formulir Berhasil Dikirim!
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Jawaban Anda telah berhasil disimpan. Terima kasih telah mengisi formulir.
          </p>
          <Button onClick={() => setCurrentView('asn-home')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    )
  }

  // No form selected
  if (!formData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Formulir tidak ditemukan</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCurrentView('asn-home')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView('asn-home')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {formData.title || selectedFormTitle}
            </h1>
            {formData.description && (
              <p className="text-xs text-muted-foreground truncate">
                {formData.description}
              </p>
            )}
          </div>
          {isExistingResponse && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Sudah Diisi
            </Badge>
          )}
        </div>
      </header>

      {/* Form content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Form info card */}
        <Card className="border-primary/10 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  {formData.title}
                </h2>
                {formData.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {formData.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Deadline: {new Date(formData.deadline).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
              <span>{formData.fields.length} field</span>
              {isExistingResponse && (
                <span className="text-emerald-600">
                  Terakhir diisi: {new Date(formData.responses[0].submittedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {isFormClosed && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-600">
                  Formulir ini sudah ditutup. Anda tidak dapat mengirim jawaban baru.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form fields */}
        <div className="space-y-4">
          {formData.fields.map((field, index) => {
            const answer = answers.find((a) => a.fieldId === field.id)
            const options = parseOptions(field.options)

            return (
              <Card key={field.id} className="border-border/50">
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-3">
                    {/* Field label */}
                    <Label className="text-sm font-medium flex items-start gap-1">
                      <span className="text-muted-foreground mr-1 text-xs">{index + 1}.</span>
                      {field.label}
                      {field.required && (
                        <span className="text-destructive ml-0.5">*</span>
                      )}
                    </Label>

                    {/* Field types */}
                    {field.type === 'short_text' && (
                      <Input
                        placeholder={field.placeholder || 'Masukkan jawaban...'}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        className="h-10"
                      />
                    )}

                    {field.type === 'paragraph' && (
                      <Textarea
                        placeholder={field.placeholder || 'Masukkan jawaban...'}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        rows={4}
                        className="resize-y"
                      />
                    )}

                    {field.type === 'number' && (
                      <Input
                        type="number"
                        placeholder={field.placeholder || 'Masukkan angka...'}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        className="h-10"
                      />
                    )}

                    {field.type === 'date' && (
                      <Input
                        type="date"
                        placeholder={field.placeholder || ''}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        className="h-10"
                      />
                    )}

                    {field.type === 'multiple_choice' && options.length > 0 && (
                      <RadioGroup
                        value={answer?.value || ''}
                        onValueChange={(val) => updateAnswer(field.id, val)}
                        disabled={isFormClosed}
                        className="space-y-2"
                      >
                        {options.map((option, i) => (
                          <div
                            key={i}
                            className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => !isFormClosed && updateAnswer(field.id, option)}
                          >
                            <RadioGroupItem value={option} id={`${field.id}-${i}`} />
                            <Label
                              htmlFor={`${field.id}-${i}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {field.type === 'checkbox' && options.length > 0 && (
                      <div className="space-y-2">
                        {options.map((option, i) => {
                          const checked = getCheckboxValues(field.id).includes(option)
                          return (
                            <div
                              key={i}
                              className={`flex items-center space-x-2 rounded-md border p-3 transition-colors cursor-pointer ${
                                checked ? 'bg-primary/5 border-primary/20' : 'hover:bg-accent/50'
                              }`}
                              onClick={() => !isFormClosed && toggleCheckboxValue(field.id, option)}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  !isFormClosed && toggleCheckboxValue(field.id, option)
                                }
                                id={`${field.id}-${i}`}
                              />
                              <Label
                                htmlFor={`${field.id}-${i}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {option}
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {field.type === 'dropdown' && options.length > 0 && (
                      <Select
                        value={answer?.value || ''}
                        onValueChange={(val) => updateAnswer(field.id, val)}
                        disabled={isFormClosed}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={field.placeholder || 'Pilih opsi...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option, i) => (
                            <SelectItem key={i} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === 'file_upload' && (
                      <div className="space-y-2">
                        {uploadErrors[field.id] && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {uploadErrors[field.id]}
                          </p>
                        )}
                        {uploadedFiles[field.id] ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm flex-1 truncate">
                                {uploadedFiles[field.id].name}
                              </span>
                              {uploadedFiles[field.id].driveUploaded && (
                                <a
                                  href={uploadedFiles[field.id].driveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0"
                                  title="Buka di Google Drive"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
                                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 13.8z" fill="#ea4335"/>
                                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                  </svg>
                                  Drive
                                </a>
                              )}
                              {!isFormClosed && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => removeFile(field.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            {uploadedFiles[field.id].driveUploaded && (
                              <p className="text-[11px] text-emerald-600 flex items-center gap-1 pl-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Tersimpan di Google Drive
                              </p>
                            )}
                          </div>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
                              isFormClosed
                                ? 'opacity-50 cursor-not-allowed border-muted'
                                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                            }`}
                          >
                            {uploadingFields.has(field.id) ? (
                              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                            ) : (
                              <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {uploadingFields.has(field.id)
                                ? 'Mengunggah...'
                                : field.placeholder || 'Klik untuk unggah file'}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              disabled={isFormClosed || uploadingFields.has(field.id)}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(field.id, file)
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {field.type === 'multi_upload' && (
                      <div className="space-y-3">
                        {uploadErrors[field.id] && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {uploadErrors[field.id]}
                          </p>
                        )}
                        {multiUploadedFiles[field.id] && multiUploadedFiles[field.id].length > 0 && (
                          <div className="space-y-1.5">
                            {multiUploadedFiles[field.id].map((f, fIdx) => (
                              <div key={fIdx} className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-sm flex-1 truncate">{f.name}</span>
                                {f.driveUploaded && f.driveLink && (
                                  <a
                                    href={f.driveLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0"
                                    title="Buka di Google Drive"
                                  >
                                    Drive
                                  </a>
                                )}
                                {!isFormClosed && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => removeMultiFile(field.id, fIdx)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <label
                          className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
                            isFormClosed
                              ? 'opacity-50 cursor-not-allowed border-muted'
                              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                          }`}
                        >
                          {uploadingFields.has(field.id) ? (
                            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                          ) : (
                            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {uploadingFields.has(field.id)
                              ? 'Mengunggah...'
                              : field.placeholder || 'Klik untuk unggah beberapa file'}
                          </span>
                          <span className="text-[11px] text-muted-foreground/70 mt-1">Pilih beberapa file sekaligus</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            disabled={isFormClosed || uploadingFields.has(field.id)}
                            onChange={(e) => {
                              const files = e.target.files
                              if (files && files.length > 0) handleMultiFileUpload(field.id, files)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {field.type === 'email' && (
                      <Input
                        type="email"
                        placeholder={field.placeholder || 'email@contoh.com'}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        className="h-10"
                      />
                    )}

                    {field.type === 'phone' && (
                      <Input
                        type="tel"
                        placeholder={field.placeholder || '08xxxxxxxxxx'}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        className="h-10"
                      />
                    )}

                    {field.type === 'url' && (
                      <Input
                        type="url"
                        placeholder={field.placeholder || 'https://...'}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        className="h-10"
                      />
                    )}

                    {field.type === 'time' && (
                      <Input
                        type="time"
                        placeholder={field.placeholder || ''}
                        value={answer?.value || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                        disabled={isFormClosed}
                        className="h-10"
                      />
                    )}

                    {field.type === 'rating' && (
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const currentRating = ratingValues[field.id] || (answer?.value ? parseInt(answer.value) : 0)
                          return (
                            <button
                              key={star}
                              type="button"
                              disabled={isFormClosed}
                              onClick={() => handleRatingClick(field.id, star)}
                              className={`transition-colors ${
                                isFormClosed ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                              }`}
                            >
                              <Star
                                className={`w-7 h-7 transition-colors ${
                                  star <= currentRating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            </button>
                          )
                        })}
                        {ratingValues[field.id] || (answer?.value ? parseInt(answer.value) : 0) ? (
                          <span className="text-sm text-muted-foreground ml-2">
                            {ratingValues[field.id] || parseInt(answer?.value || '0')} / 5
                          </span>
                        ) : null}
                      </div>
                    )}

                    {field.type === 'image_upload' && (
                      <div className="space-y-2">
                        {uploadErrors[field.id] && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {uploadErrors[field.id]}
                          </p>
                        )}
                        {uploadedFiles[field.id] ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                              <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm flex-1 truncate">
                                {uploadedFiles[field.id].name}
                              </span>
                              {!isFormClosed && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => removeFile(field.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors ${
                              isFormClosed
                                ? 'opacity-50 cursor-not-allowed border-muted'
                                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                            }`}
                          >
                            {uploadingFields.has(field.id) ? (
                              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-muted-foreground mb-2" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {uploadingFields.has(field.id)
                                ? 'Mengunggah...'
                                : field.placeholder || 'Klik untuk unggah gambar'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isFormClosed || uploadingFields.has(field.id)}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(field.id, file)
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Error message */}
        {submitError && (
          <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit section */}
        {!isFormClosed && formData.fields.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCurrentView('asn-home')}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isExistingResponse ? 'Perbarui Jawaban' : 'Kirim Jawaban'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-8" />
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm mt-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 BKAD Kabupaten Seruyan
          </p>
        </div>
      </footer>
    </div>
  )
}
