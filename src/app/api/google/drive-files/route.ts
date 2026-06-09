import { NextRequest, NextResponse } from 'next/server'
import { listDriveFiles, getGoogleConfig } from '@/lib/google'

// GET /api/google/drive-files - List files in Google Drive folder
export async function GET(request: NextRequest) {
  try {
    const config = await getGoogleConfig()
    if (!config) {
      return NextResponse.json(
        { error: 'Konfigurasi Google API belum diatur. Silakan atur di halaman Pengaturan Sistem.' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId') || config.driveFolderId

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID belum diatur' },
        { status: 400 }
      )
    }

    const files = await listDriveFiles(folderId)
    return NextResponse.json({ files })
  } catch (error: any) {
    console.error('Drive files list error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal mengambil daftar file dari Google Drive' },
      { status: 500 }
    )
  }
}
