import { NextRequest, NextResponse } from 'next/server'
import { createSpreadsheet, getGoogleConfig } from '@/lib/google'

// POST /api/google/create-spreadsheet - Create a new Google Spreadsheet
export async function POST(request: NextRequest) {
  try {
    const config = await getGoogleConfig()
    if (!config) {
      return NextResponse.json(
        { error: 'Konfigurasi Google API belum diatur. Silakan atur di halaman Pengaturan Sistem.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: 'Judul spreadsheet diperlukan' }, { status: 400 })
    }

    const result = await createSpreadsheet(title)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Create spreadsheet error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal membuat Google Spreadsheet' },
      { status: 500 }
    )
  }
}
