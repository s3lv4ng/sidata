import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/google-sheets - Check Google Sheets configuration status
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: ['googleSheetsApiKey', 'googleSheetsSpreadsheetId', 'googleSheetsSheetName'],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => (settingsMap[s.key] = s.value))

    const configured = !!(settingsMap.googleSheetsApiKey && settingsMap.googleSheetsSpreadsheetId)

    return NextResponse.json({
      configured,
      spreadsheetId: settingsMap.googleSheetsSpreadsheetId || '',
      sheetName: settingsMap.googleSheetsSheetName || 'Sheet1',
      hasApiKey: !!settingsMap.googleSheetsApiKey,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/google-sheets - Sync data to Google Sheets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Get settings
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: ['googleSheetsApiKey', 'googleSheetsSpreadsheetId', 'googleSheetsSheetName'],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => (settingsMap[s.key] = s.value))

    const apiKey = settingsMap.googleSheetsApiKey
    const spreadsheetId = settingsMap.googleSheetsSpreadsheetId
    const sheetName = settingsMap.googleSheetsSheetName || 'Sheet1'

    if (!apiKey || !spreadsheetId) {
      return NextResponse.json({ error: 'Google Sheets belum dikonfigurasi' }, { status: 400 })
    }

    if (action === 'sync-asn') {
      // Fetch all ASN data
      const asnList = await db.user.findMany({
        where: { role: 'ASN' },
        orderBy: { name: 'asc' },
        select: {
          nip: true,
          name: true,
          jabatan: true,
          pangkat: true,
          unitKerja: true,
          bidang: true,
          statusASN: true,
          email: true,
          phone: true,
          isActive: true,
        },
      })

      // Prepare data for Google Sheets
      const headers = ['NIP', 'Nama', 'Jabatan', 'Pangkat/Gol.', 'Unit Kerja', 'Bidang', 'Status ASN', 'Email', 'No HP', 'Status']
      const rows = asnList.map(asn => [
        asn.nip,
        asn.name,
        asn.jabatan || '',
        asn.pangkat || '',
        asn.unitKerja || '',
        asn.bidang || '',
        asn.statusASN || '',
        asn.email || '',
        asn.phone || '',
        asn.isActive ? 'Aktif' : 'Nonaktif',
      ])

      // Clear existing data and write new data using Google Sheets API with API key
      // Note: API key only allows reading. For writing, we need to use a service account or OAuth.
      // For this implementation, we'll provide the data in a format that can be manually imported
      // or we'll use the service account from Google Drive settings.

      const driveSettings = await db.systemSetting.findMany({
        where: {
          key: {
            in: ['googleDriveClientEmail', 'googleDrivePrivateKey'],
          },
        },
      })

      const driveSettingsMap: Record<string, string> = {}
      driveSettings.forEach((s) => (driveSettingsMap[s.key] = s.value))

      if (driveSettingsMap.googleDriveClientEmail && driveSettingsMap.googleDrivePrivateKey) {
        // Use Service Account to write to Google Sheets
        const { google } = await import('googleapis')

        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: driveSettingsMap.googleDriveClientEmail,
            private_key: driveSettingsMap.googleDrivePrivateKey.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })

        const sheets = google.sheets({ version: 'v4', auth })

        // Clear existing data
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A:J`,
        })

        // Write headers and data
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers, ...rows],
          },
        })

        return NextResponse.json({
          success: true,
          message: `${asnList.length} data ASN berhasil disinkronkan ke Google Sheets`,
          count: asnList.length,
        })
      } else {
        return NextResponse.json({
          error: 'Untuk menulis ke Google Sheets, diperlukan Service Account Google Drive yang sudah dikonfigurasi',
        }, { status: 400 })
      }
    }

    if (action === 'sync-responses') {
      const { formId } = body
      if (!formId) {
        return NextResponse.json({ error: 'Form ID wajib diisi' }, { status: 400 })
      }

      const form = await db.form.findUnique({
        where: { id: formId },
        include: {
          fields: { orderBy: { order: 'asc' } },
          responses: {
            include: {
              user: { select: { nip: true, name: true, bidang: true, jabatan: true } },
              fields: { include: { field: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
        },
      })

      if (!form) {
        return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 })
      }

      // Build headers
      const headers = ['NIP', 'Nama', 'Bidang', 'Jabatan', 'Waktu Pengisian', ...form.fields.map(f => f.label)]

      // Build rows
      const rows = form.responses.map(resp => {
        const row = [
          resp.user.nip,
          resp.user.name,
          resp.user.bidang || '',
          resp.user.jabatan || '',
          new Date(resp.submittedAt).toLocaleString('id-ID'),
        ]
        form.fields.forEach(field => {
          const fieldResp = resp.fields.find(f => f.fieldId === field.id)
          row.push(fieldResp?.value || '')
        })
        return row
      })

      const driveSettings = await db.systemSetting.findMany({
        where: {
          key: {
            in: ['googleDriveClientEmail', 'googleDrivePrivateKey'],
          },
        },
      })

      const driveSettingsMap: Record<string, string> = {}
      driveSettings.forEach((s) => (driveSettingsMap[s.key] = s.value))

      if (!driveSettingsMap.googleDriveClientEmail || !driveSettingsMap.googleDrivePrivateKey) {
        return NextResponse.json({
          error: 'Service Account Google Drive belum dikonfigurasi',
        }, { status: 400 })
      }

      const { google } = await import('googleapis')

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: driveSettingsMap.googleDriveClientEmail,
          private_key: driveSettingsMap.googleDrivePrivateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })

      const sheets = google.sheets({ version: 'v4', auth })

      const targetSheetName = form.title.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50) || 'Responses'

      // Check if sheet exists, if not create it
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
      const sheetExists = spreadsheet.data.sheets?.some(
        s => s.properties?.title === targetSheetName
      )

      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: { title: targetSheetName }
              }
            }]
          }
        })
      }

      // Clear and write
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${targetSheetName}!A:ZZ`,
      })

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers, ...rows],
        },
      })

      return NextResponse.json({
        success: true,
        message: `${form.responses.length} respon berhasil disinkronkan ke sheet "${targetSheetName}"`,
        count: form.responses.length,
        sheetName: targetSheetName,
      })
    }

    // Read data from Google Sheets using API key
    if (action === 'read') {
      const { google } = await import('googleapis')

      const sheets = google.sheets({ version: 'v4', auth: apiKey })

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:ZZ`,
      })

      return NextResponse.json({
        rows: response.data.values || [],
        sheetName,
      })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error: any) {
    console.error('Google Sheets error:', error)
    return NextResponse.json({ error: error.message || 'Gagal sinkronisasi Google Sheets' }, { status: 500 })
  }
}
