import { NextRequest, NextResponse } from 'next/server'

// GET /api/drive - Check Drive configuration status and test connection
export async function GET(request: NextRequest) {
  try {
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

// POST /api/drive - Actions: create-shared-drive, test-upload
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
          message: 'Upload ke Google Drive gagal. Folder mungkin berada di "My Drive" - gunakan Shared Drive atau atur Email Delegasi.',
        }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error: any) {
    console.error('Drive POST error:', error)
    return NextResponse.json({ error: error.message || 'Gagal menjalankan aksi' }, { status: 500 })
  }
}
