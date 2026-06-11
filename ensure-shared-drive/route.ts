import { NextRequest, NextResponse } from 'next/server'
import { ensureSharedDriveUploadFolder } from '@/lib/google'

export async function POST(request: NextRequest) {
  try {
    const result = await ensureSharedDriveUploadFolder()

    return NextResponse.json({
      success: true,
      driveId: result.driveId,
      folderId: result.folderId,
      folderLink: result.folderLink,
      isNew: result.isNew,
      message: result.isNew
        ? `Shared Drive berhasil dibuat. Folder upload: ${result.folderLink}`
        : `Menggunakan Shared Drive yang sudah ada: ${result.folderLink}`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat Shared Drive'
    console.error('Failed to ensure Shared Drive:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
