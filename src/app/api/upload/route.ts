import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/upload - Upload a file (locally + Google Drive)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar (maksimal 10MB)' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    const baseName = file.name.includes('.')
      ? file.name.slice(0, file.name.lastIndexOf('.'))
      : file.name
    const uniqueFileName = `${baseName}_${timestamp}_${randomSuffix}${ext}`

    // Save to local upload directory
    const uploadDir = path.join(process.cwd(), 'upload')
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, uniqueFileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const relativePath = `/api/file?path=/upload/${uniqueFileName}`

    // Try to upload to Google Drive (using dynamic import to avoid Turbopack issues)
    let driveFileId: string | null = null
    let driveLink: string | null = null

    try {
      const { uploadToDrive } = await import('@/lib/google-drive')
      const driveResult = await uploadToDrive(buffer, file.name, file.type || 'application/octet-stream')
      if (driveResult) {
        driveFileId = driveResult.fileId
        driveLink = driveResult.webViewLink
      }
    } catch (driveError) {
      // Google Drive upload failed, but local upload succeeded - continue
      console.error('Google Drive upload failed (non-blocking):', driveError)
    }

    return NextResponse.json(
      {
        fileName: file.name,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.type,
        driveFileId,
        driveLink,
        driveUploaded: driveFileId !== null,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message || 'Gagal mengunggah file' }, { status: 500 })
  }
}
