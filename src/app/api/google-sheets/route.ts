import { NextRequest, NextResponse } from 'next/server'

// GET /api/google-sheets - Check Google Sheets configuration status and test connection
export async function GET() {
  try {
    const { testSheetsConnection } = await import('@/lib/google-sheets')
    const result = await testSheetsConnection()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: `Error: ${error.message || 'Koneksi gagal'}`,
    }, { status: 500 })
  }
}

// POST /api/google-sheets - Sync data to Google Sheets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'sync-asn') {
      const { syncAsnData } = await import('@/lib/google-sheets')
      const result = await syncAsnData()

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        count: result.count,
      })
    }

    if (action === 'sync-responses') {
      const { formId } = body
      if (!formId) {
        return NextResponse.json({ error: 'Form ID wajib diisi' }, { status: 400 })
      }

      const { syncFormResponses } = await import('@/lib/google-sheets')
      const result = await syncFormResponses(formId)

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        count: result.count,
        sheetName: result.sheetName,
      })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error: any) {
    console.error('Google Sheets error:', error)
    return NextResponse.json({ error: error.message || 'Gagal sinkronisasi Google Sheets' }, { status: 500 })
  }
}
