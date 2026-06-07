import { NextRequest, NextResponse } from 'next/server'

// GET /api/drive - Check Drive configuration status and list files
export async function GET(request: NextRequest) {
  try {
    const { isDriveConfigured, listDriveFiles, getFolderInfo } = await import('@/lib/google-drive')

    const configured = await isDriveConfigured()

    if (!configured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'Google Drive belum dikonfigurasi. Silakan atur Service Account Email, Private Key, dan Folder ID di halaman Pengaturan.',
      })
    }

    // Try to get folder info to verify connection
    const folderInfo = await getFolderInfo()
    if (!folderInfo) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: 'Koneksi ke Google Drive gagal. Periksa kembali kredensial yang dimasukkan.',
      })
    }

    // List recent files
    const files = await listDriveFiles(10)

    return NextResponse.json({
      configured: true,
      connected: true,
      folder: folderInfo,
      files: files || [],
      message: 'Google Drive terhubung dengan sukses.',
    })
  } catch (error: any) {
    return NextResponse.json({
      configured: true,
      connected: false,
      message: `Error: ${error.message || 'Koneksi gagal'}`,
    }, { status: 500 })
  }
}
