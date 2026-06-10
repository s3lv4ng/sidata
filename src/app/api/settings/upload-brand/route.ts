import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { saveUploadedFile, resolveFilePath } from '@/lib/upload-utils'
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

function getExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  return parts[parts.length - 1].toLowerCase()
}

async function deleteOldFile(settingKey: string) {
  try {
    const existing = await db.systemSetting.findUnique({ where: { key: settingKey } })
    if (existing?.value) {
      const resolved = await resolveFilePath(existing.value)
      if (resolved) {
        const { unlink } = await import('fs/promises')
        await unlink(resolved)
      }
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

    let logoPath: string | null = null
    let faviconPath: string | null = null

    // Handle logo upload
    if (logoFile) {
      // Delete old logo file
      await deleteOldFile('logoPath')

      const ext = getExtension(logoFile.name) || 'png'
      const uniqueName = `logo-${randomUUID()}.${ext}`
      const buffer = Buffer.from(await logoFile.arrayBuffer())

      // Save using upload-utils (handles read-only filesystem)
      const { accessPath } = await saveUploadedFile(buffer, uniqueName, 'brand')

      await db.systemSetting.upsert({
        where: { key: 'logoPath' },
        update: { value: accessPath },
        create: { key: 'logoPath', value: accessPath },
      })

      logoPath = accessPath
    }

    // Handle favicon upload
    if (faviconFile) {
      // Delete old favicon file
      await deleteOldFile('faviconPath')

      const ext = getExtension(faviconFile.name) || 'ico'
      const uniqueName = `favicon-${randomUUID()}.${ext}`
      const buffer = Buffer.from(await faviconFile.arrayBuffer())

      // Save using upload-utils (handles read-only filesystem)
      const { accessPath } = await saveUploadedFile(buffer, uniqueName, 'brand')

      await db.systemSetting.upsert({
        where: { key: 'faviconPath' },
        update: { value: accessPath },
        create: { key: 'faviconPath', value: accessPath },
      })

      faviconPath = accessPath
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
      // Delete the file from storage
      try {
        const resolved = await resolveFilePath(existing.value)
        if (resolved) {
          const { unlink } = await import('fs/promises')
          await unlink(resolved)
        }
      } catch {
        // Ignore file deletion errors
      }
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
