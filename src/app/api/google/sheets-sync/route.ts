import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncToSheet, getGoogleConfig } from '@/lib/google'

function parseFieldValue(value: string | null, type: string): string {
  if (!value) return '—'
  if (type === 'checkbox') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.join(', ')
      }
    } catch {
      // not JSON, return as is
    }
  }
  if (type === 'multi_upload') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return `${parsed.length} file`
      }
    } catch {
      // not JSON
    }
  }
  return value
}

function parseMultiUploadInfo(value: string | null): { count: number; links: Array<{ path: string; driveLink: string | null }> } {
  if (!value) return { count: 0, links: [] }
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      const links = parsed.map((item: any) => {
        if (typeof item === 'string') {
          return { path: item, driveLink: null }
        } else {
          return { path: item.path || '', driveLink: item.driveLink || null }
        }
      })
      return { count: links.length, links }
    }
  } catch {
    // not JSON
  }
  return { count: 0, links: [] }
}

// POST /api/google/sheets-sync - Sync form response data to Google Spreadsheet
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
    const { formId, spreadsheetId, sheetName } = body

    // Get the request origin to construct full local URLs
    const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host')
      ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`
      : `http://localhost:3000`

    if (!formId) {
      return NextResponse.json({ error: 'Form ID diperlukan' }, { status: 400 })
    }

    // Get form with fields and responses
    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        fields: { orderBy: { order: 'asc' } },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                nip: true,
                bidang: true,
                jabatan: true,
                pangkat: true,
              },
            },
            fields: { include: { field: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 })
    }

    if (form.responses.length === 0) {
      return NextResponse.json({ error: 'Tidak ada respons untuk disinkronkan' }, { status: 400 })
    }

    const targetSpreadsheetId = spreadsheetId || config.spreadsheetId
    if (!targetSpreadsheetId) {
      return NextResponse.json(
        { error: 'Spreadsheet ID belum diatur. Atur di pengaturan atau masukkan ID custom.' },
        { status: 400 }
      )
    }

    const targetSheetName = sheetName || form.title.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 100)

    // Build headers with extra "Link" columns for upload fields
    const headers = ['No', 'Nama', 'NIP', 'Bidang', 'Jabatan', 'Pangkat/Golongan']
    form.fields.forEach((field) => {
      headers.push(field.label)
      // Add link column for upload fields
      if (['file_upload', 'image_upload', 'multi_upload'].includes(field.type)) {
        headers.push(`Link ${field.label}`)
      }
    })
    headers.push('Tanggal Pengisian')

    // Build rows
    const rows = form.responses.map((response, idx) => {
      const row: string[] = [
        String(idx + 1),
        response.user.name,
        response.user.nip,
        response.user.bidang || '-',
        response.user.jabatan || '-',
        response.user.pangkat || '-',
      ]

      form.fields.forEach((field) => {
        const fieldResponse = response.fields.find((f) => f.fieldId === field.id)

        if (['file_upload', 'image_upload'].includes(field.type)) {
          // Show filename
          row.push(fieldResponse?.fileName || parseFieldValue(fieldResponse?.value || null, field.type))

          // Show link (Drive link or full local URL)
          let fileLink = '—'
          if (fieldResponse?.driveLink) {
            fileLink = fieldResponse.driveLink
          } else if (fieldResponse?.filePath) {
            fileLink = `${origin}${fieldResponse.filePath}`
          }
          row.push(fileLink)
        } else if (field.type === 'multi_upload') {
          // Show count
          const fileInfo = parseMultiUploadInfo(fieldResponse?.value || null)
          row.push(fileInfo.count > 0 ? `${fileInfo.count} file` : '—')

          // Show all links
          if (fileInfo.links.length > 0) {
            row.push(fileInfo.links.map(l => l.driveLink || `${origin}${l.path}`).join('\n'))
          } else {
            row.push('—')
          }
        } else {
          row.push(fieldResponse ? parseFieldValue(fieldResponse.value, field.type) : '—')
        }
      })

      row.push(new Date(response.submittedAt).toLocaleDateString('id-ID'))
      return row
    })

    const result = await syncToSheet(targetSpreadsheetId, targetSheetName, headers, rows)

    return NextResponse.json({
      success: result.success,
      rowsSynced: result.rowsSynced,
      spreadsheetUrl: result.spreadsheetUrl,
      sheetName: targetSheetName,
    })
  } catch (error: any) {
    console.error('Sheets sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menyinkronkan data ke Google Sheets' },
      { status: 500 }
    )
  }
}
