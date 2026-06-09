import { NextRequest, NextResponse } from 'next/server'
import { verifyDriveFolder } from '@/lib/google'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const folderId = body.folderId

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID diperlukan' },
        { status: 400 }
      )
    }

    const result = await verifyDriveFolder(folderId)
    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memverifikasi folder'
    console.error('Failed to verify drive folder:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
