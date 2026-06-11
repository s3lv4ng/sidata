import { NextRequest, NextResponse } from 'next/server'
import { saveUploadedFile } from '@/lib/upload-utils'
import { uploadToBidangFolder, isDriveConfigured, isOAuthDriveConfigured } from '@/lib/google-drive'
import { db } from '@/lib/db'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  // Images
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain', 'text/csv',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  // Audio/Video
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/quicktime',
]

// POST /api/upload - Upload a file (used by FormFiller)
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
        { error: `Ukuran file terlalu besar (maksimal 10MB). File Anda: ${(file.size / 1024 / 1024).toFixed(1)}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      // Allow unknown types for flexibility (some browsers don't report MIME for certain files)
      console.log(`Upload with unlisted MIME type: ${file.type} for file: ${file.name}`)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    const baseName = file.name.includes('.')
      ? file.name.slice(0, file.name.lastIndexOf('.'))
      : file.name
    const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
    const uniqueFilename = `${safeName}_${timestamp}_${randomSuffix}${ext}`

    // Read file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save locally (handles read-only filesystem with /tmp fallback)
    const subdir = bidang ? bidang.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : undefined
    const { accessPath } = await saveUploadedFile(buffer, uniqueFilename, subdir)

    // Attempt Google Drive upload (non-blocking)
    // Check both OAuth2 (My Drive) and Service Account configurations
    let driveFileId: string | null = null
    let driveLink: string | null = null
    let driveUploaded = false

    try {
      const driveConfigured = await isDriveConfigured()
      const oauthConfigured = await isOAuthDriveConfigured()
      const anyDriveAvailable = driveConfigured || oauthConfigured

      if (anyDriveAvailable) {
        if (bidang) {
          const driveResult = await uploadToBidangFolder(buffer, uniqueFilename, file.type, bidang)
          if (driveResult) {
            driveFileId = driveResult.fileId
            driveLink = driveResult.webViewLink
            driveUploaded = true
          }
        } else {
          // No bidang, upload to main folder
          const { uploadToDrive } = await import('@/lib/google-drive')
          const driveResult = await uploadToDrive(buffer, uniqueFilename, file.type)
          if (driveResult) {
            driveFileId = driveResult.fileId
            driveLink = driveResult.webViewLink
            driveUploaded = true
          }
        }
      } else {
        console.log('Google Drive not configured (neither OAuth2 nor Service Account). Skipping Drive upload.')
      }
    } catch (driveError: any) {
      console.warn('Google Drive upload failed (non-blocking):', driveError?.message || driveError)
      // Provide more specific error info
      if (driveError?.code === 403 || driveError?.message?.includes('forbidden') || driveError?.message?.includes('delegation')) {
        console.warn('Hint: If using Service Account with Gmail account, domain-wide delegation is not supported. Use OAuth2 flow instead.')
      }
      // Don't fail the whole upload if Drive fails
    }

    // Log activity
    if (userId) {
      try {
        await db.activityLog.create({
          data: {
            userId,
            action: 'FILE_UPLOAD',
            details: `Mengunggah file "${file.name}"${bidang ? ` (Bidang: ${bidang})` : ''}${driveUploaded ? ' + Google Drive' : ''}`,
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
        driveFileId,
        driveLink,
        driveUploaded,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah file' },
      { status: 500 }
    )
  }
}
