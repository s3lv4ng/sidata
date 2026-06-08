import { NextRequest, NextResponse } from 'next/server'
import { saveUploadedFile } from '@/lib/upload-utils'
import { uploadToBidangFolder, isDriveConfigured } from '@/lib/google-drive'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB for general uploads
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'image/x-icon', 'image/vnd.microsoft.icon',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bidang = formData.get('bidang') as string | null
    const userId = formData.get('userId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar (maksimal 10MB)' },
        { status: 400 }
      )
    }

    // Validate file type - allow all common types
    if (file.type && !ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    const baseName = file.name.includes('.') ? file.name.slice(0, file.name.lastIndexOf('.')) : file.name
    const filename = `${baseName}_${timestamp}_${randomSuffix}${ext}`

    // Save file locally (handles read-only filesystem via /tmp fallback)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create subdirectory based on bidang if available
    const subdir = bidang ? bidang.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : undefined
    const { accessPath } = await saveUploadedFile(buffer, filename, subdir)

    // Build the full local URL for the file
    const fullLocalUrl = accessPath

    // Try uploading to Google Drive (non-blocking attempt)
    let driveFileId: string | null = null
    let driveLink: string | null = null
    let driveUploaded = false

    try {
      const driveConfigured = await isDriveConfigured()
      if (driveConfigured) {
        // Upload to bidang-specific folder or main folder
        const bidangName = bidang || 'Umum'
        const driveResult = await uploadToBidangFolder(
          buffer,
          file.name,
          file.type || 'application/octet-stream',
          bidangName
        )

        if (driveResult) {
          driveFileId = driveResult.fileId
          driveLink = driveResult.webViewLink
          driveUploaded = true
          console.log(`File uploaded to Drive (bidang: ${bidangName}): ${driveResult.webViewLink}`)
        }
      }
    } catch (driveError: any) {
      // Drive upload failure should not block the form submission
      console.warn('Drive upload failed (non-blocking):', driveError?.message || driveError)
    }

    // Log activity if userId provided
    if (userId) {
      try {
        const { db } = await import('@/lib/db')
        await db.activityLog.create({
          data: {
            userId,
            action: 'UPLOAD_FILE',
            details: `Mengunggah file: ${file.name}${bidang ? ` (Bidang: ${bidang})` : ''}${driveUploaded ? ' → Drive' : ''}`,
          },
        })
      } catch {
        // Skip activity log if userId is invalid
      }
    }

    return NextResponse.json(
      {
        fileName: file.name,
        filePath: fullLocalUrl,
        fileSize: file.size,
        mimeType: file.type,
        driveFileId,
        driveLink,
        driveUploaded,
        bidang: bidang || null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Gagal mengunggah file' }, { status: 500 })
  }
}
