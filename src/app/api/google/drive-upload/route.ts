import { NextRequest, NextResponse } from 'next/server'
import { uploadToDriveOAuth, getGoogleConfig } from '@/lib/google'

// POST /api/google/drive-upload - Upload file to Google Drive
export async function POST(request: NextRequest) {
  try {
    const config = await getGoogleConfig()
    if (!config) {
      return NextResponse.json(
        { error: 'Konfigurasi Google API belum diatur. Silakan atur di halaman Pengaturan Sistem.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folderId = formData.get('folderId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadToDriveOAuth(
      buffer,
      file.name,
      file.type,
      folderId || undefined
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Drive upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal mengunggah file ke Google Drive' },
      { status: 500 }
    )
  }
}
