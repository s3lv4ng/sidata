import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/webp',
])

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'brand')

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

function getExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].toLowerCase()
}

function deleteFileIfExists(filePath: string) {
  try {
    const fullPath = join(process.cwd(), 'public', filePath)
    if (existsSync(fullPath)) {
      unlinkSync(fullPath)
    }
  } catch {
    // Silently ignore errors
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const logoFile = formData.get('logo') as File | null
    const faviconFile = formData.get('favicon') as File | null

    if (!logoFile && !faviconFile) {
      return NextResponse.json(
        { error: 'Tidak ada file yang diunggah' },
        { status: 400 }
      )
    }

    // Validate files
    for (const file of [logoFile, faviconFile].filter(Boolean) as File[]) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Format file "${file.name}" tidak didukung. Gunakan PNG, JPG, SVG, ICO, atau WEBP.` },
          { status: 400 }
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Ukuran file "${file.name}" melebihi batas 2MB.` },
          { status: 400 }
        )
      }
    }

    ensureUploadDir()

    let logoPath: string | null = null
    let faviconPath: string | null = null

    // Handle logo upload
    if (logoFile) {
      // Delete old logo
      const oldLogo = await db.systemSetting.findUnique({ where: { key: 'logoPath' } })
      if (oldLogo?.value) {
        deleteFileIfExists(oldLogo.value)
      }

      const ext = getExtension(logoFile.name) || 'png'
      const uniqueName = `logo-${randomUUID()}.${ext}`
      const relativePath = `/uploads/brand/${uniqueName}`
      const fullPath = join(UPLOAD_DIR, uniqueName)

      const buffer = Buffer.from(await logoFile.arrayBuffer())
      writeFileSync(fullPath, buffer)

      await db.systemSetting.upsert({
        where: { key: 'logoPath' },
        update: { value: relativePath },
        create: { key: 'logoPath', value: relativePath },
      })

      logoPath = relativePath
    }

    // Handle favicon upload
    if (faviconFile) {
      // Delete old favicon
      const oldFavicon = await db.systemSetting.findUnique({ where: { key: 'faviconPath' } })
      if (oldFavicon?.value) {
        deleteFileIfExists(oldFavicon.value)
      }

      const ext = getExtension(faviconFile.name) || 'ico'
      const uniqueName = `favicon-${randomUUID()}.${ext}`
      const relativePath = `/uploads/brand/${uniqueName}`
      const fullPath = join(UPLOAD_DIR, uniqueName)

      const buffer = Buffer.from(await faviconFile.arrayBuffer())
      writeFileSync(fullPath, buffer)

      await db.systemSetting.upsert({
        where: { key: 'faviconPath' },
        update: { value: relativePath },
        create: { key: 'faviconPath', value: relativePath },
      })

      faviconPath = relativePath
    }

    // Get current values for response
    if (!logoPath) {
      const existing = await db.systemSetting.findUnique({ where: { key: 'logoPath' } })
      logoPath = existing?.value || '/logo.svg'
    }
    if (!faviconPath) {
      const existing = await db.systemSetting.findUnique({ where: { key: 'faviconPath' } })
      faviconPath = existing?.value || '/logo.svg'
    }

    return NextResponse.json({ logoPath, faviconPath })
  } catch (error: any) {
    console.error('Upload brand error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah file' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/upload-brand - Remove logo or favicon
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'logo' or 'favicon'

    if (!type || !['logo', 'favicon'].includes(type)) {
      return NextResponse.json(
        { error: 'Parameter type tidak valid' },
        { status: 400 }
      )
    }

    const key = type === 'logo' ? 'logoPath' : 'faviconPath'
    const existing = await db.systemSetting.findUnique({ where: { key } })

    if (existing?.value) {
      deleteFileIfExists(existing.value)
      await db.systemSetting.delete({ where: { key } })
    }

    return NextResponse.json({ message: `${type === 'logo' ? 'Logo' : 'Favicon'} berhasil dihapus` })
  } catch (error: any) {
    console.error('Delete brand error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus file' },
      { status: 500 }
    )
  }
}
