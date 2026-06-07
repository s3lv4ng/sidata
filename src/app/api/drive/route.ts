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
