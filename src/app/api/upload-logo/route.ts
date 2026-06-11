import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { invalidateSettingsCache } from '@/lib/auth'
import { saveUploadedFile, resolveFilePath } from '@/lib/upload-utils'

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB for logos
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']

// Delete old brand file from disk
async function deleteOldBrandFile(settingKey: string) {
  try {
    const existing = await db.systemSetting.findUnique({ where: { key: settingKey } })
    if (existing?.value) {
      // Try to resolve the file path from the stored access path
      const accessPath = existing.value
      // Extract the path parameter from /api/file?path=xxx format
      const pathMatch = accessPath.match(/[?&]path=([^&]+)/)
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1])
        const resolved = await resolveFilePath(filePath)
        if (resolved) {
          const { unlink } = await import('fs/promises')
          await unlink(resolved)
          console.log(`[Upload Logo] Deleted old file: ${resolved}`)
        }
      }
    }
  } catch (err) {
    // Silently ignore errors - old file might not exist
    console.log('[Upload Logo] Could not delete old file:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null // 'logo' or 'favicon'
    const userId = formData.get('userId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    if (!type || (type !== 'logo' && type !== 'favicon')) {
      return NextResponse.json({ error: 'Tipe upload tidak valid (harus logo atau favicon)' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar (maksimal 2MB)' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung. Gunakan PNG, JPG, SVG, WebP, atau ICO' },
        { status: 400 }
      )
    }

    // Generate filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)

    let filename: string
    if (type === 'favicon') {
      const ext = file.name.endsWith('.ico') ? '.ico' :
                  file.name.endsWith('.png') ? '.png' :
                  file.name.endsWith('.svg') ? '.svg' :
                  file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ? '.jpg' :
                  '.png'
      filename = `favicon_${timestamp}_${randomSuffix}${ext}`
    } else {
      const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.png'
      filename = `logo_${timestamp}_${randomSuffix}${ext}`
    }

    // Save file using upload utils (handles read-only filesystem)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const { accessPath } = await saveUploadedFile(buffer, filename, 'brand')

    // Verify the saved file is accessible
    const pathMatch = accessPath.match(/[?&]path=([^&]+)/)
    if (pathMatch) {
      const filePath = decodeURIComponent(pathMatch[1])
      const resolved = await resolveFilePath(filePath)
      if (!resolved) {
        console.error('[Upload Logo] Warning: File saved but could not be resolved:', filePath)
      }
    }

    // Delete old brand file
    const settingKey = type === 'logo' ? 'appLogo' : 'appFavicon'
    await deleteOldBrandFile(settingKey)

    // Store path in settings
    await db.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: accessPath },
      create: { key: settingKey, value: accessPath },
    })

    // Invalidate settings cache
    invalidateSettingsCache()

    // Log activity
    if (userId) {
      try {
        await db.activityLog.create({
          data: {
            userId,
            action: 'UPDATE_SETTINGS',
            details: `Mengunggah ${type === 'logo' ? 'logo' : 'favicon'} aplikasi`,
          },
        })
      } catch {
        // Skip activity log if userId is invalid
      }
    }

    return NextResponse.json(
      {
        fileName: file.name,
        filePath: accessPath,
        fileSize: file.size,
        mimeType: file.type,
        settingKey,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Upload brand error:', error)
    return NextResponse.json({ error: error.message || 'Gagal mengunggah file' }, { status: 500 })
  }
}
