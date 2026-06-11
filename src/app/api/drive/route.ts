import { NextRequest, NextResponse } from 'next/server'

// GET /api/drive - Check Drive configuration status and test connection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // List bidang subfolders
    if (action === 'list-bidang-folders') {
      const { listBidangFolders } = await import('@/lib/google-drive')
      const folders = await listBidangFolders()
      return NextResponse.json({ folders })
    }

    // List ASN subfolders within a bidang folder
    if (action === 'list-asn-folders') {
      const bidangFolderId = searchParams.get('bidangFolderId')
      if (!bidangFolderId) {
        return NextResponse.json({ error: 'bidangFolderId diperlukan' }, { status: 400 })
      }
      const { listAsnFolders } = await import('@/lib/google-drive')
      const folders = await listAsnFolders(bidangFolderId)
      return NextResponse.json({ folders })
    }

    const { testDriveConnection } = await import('@/lib/google-drive')
    const result = await testDriveConnection()

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: `Error: ${error.message || 'Koneksi gagal'}`,
    }, { status: 500 })
  }
}

// POST /api/drive - Actions: create-shared-drive, test-upload, create-bidang-folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'create-shared-drive') {
      const { createSharedDriveForUpload } = await import('@/lib/google-drive')
      const result = await createSharedDriveForUpload()

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        driveId: result.driveId,
        driveName: result.driveName,
        folderId: result.folderId,
        folderName: result.folderName,
      })
    }

    if (action === 'test-upload') {
      // Actually test uploading a small file to Google Drive
      const { uploadToDrive, deleteFromDrive } = await import('@/lib/google-drive')
      const testContent = `SIDATA BKAD Test Upload - ${new Date().toISOString()}`
      const testBuffer = Buffer.from(testContent, 'utf-8')

      const result = await uploadToDrive(testBuffer, 'test-upload.txt', 'text/plain')

      if (result) {
        // Upload succeeded! Clean up the test file
        await deleteFromDrive(result.fileId)
        return NextResponse.json({
          success: true,
          message: 'Upload ke Google Drive berhasil! File test telah dihapus otomatis.',
          fileId: result.fileId,
        })
      } else {
        return NextResponse.json({
          success: false,
          message: 'Upload ke Google Drive gagal. Folder mungkin berada di "My Drive" - gunakan OAuth2 atau atur Email Delegasi.',
        }, { status: 400 })
      }
    }

    if (action === 'test-oauth-upload') {
      // Test upload using OAuth2 credentials specifically
      const { testOAuthUpload } = await import('@/lib/google-drive')
      const result = await testOAuthUpload()
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    if (action === 'create-bidang-folder') {
      const { bidang } = body
      if (!bidang) {
        return NextResponse.json({ error: 'Nama bidang diperlukan' }, { status: 400 })
      }

      const { findOrCreateBidangFolder } = await import('@/lib/google-drive')
      const folderId = await findOrCreateBidangFolder(bidang)

      if (folderId) {
        return NextResponse.json({
          success: true,
          message: `Folder untuk bidang "${bidang}" berhasil dibuat/ditemukan di Google Drive.`,
          folderId,
        })
      } else {
        return NextResponse.json({
          success: false,
          message: `Gagal membuat folder untuk bidang "${bidang}". Pastikan Google Drive sudah dikonfigurasi dan dapat diakses.`,
        }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error: any) {
    console.error('Drive POST error:', error)
    return NextResponse.json({ error: error.message || 'Gagal menjalankan aksi' }, { status: 500 })
  }
}
