import { google } from 'googleapis'
import { db } from './db'

// Google Sheets configuration interface
interface SheetsConfig {
  clientEmail: string
  privateKey: string
  spreadsheetId: string
  sheetName: string
}

// Error type for detailed Google Sheets API errors
export interface SheetsError {
  message: string
  code?: number
  reason?: string
  isApiDisabled?: boolean
  isAuthError?: boolean
  isNotFoundError?: boolean
  isPermissionError?: boolean
}

// Parse Google API error into user-friendly SheetsError
function parseSheetsError(error: any): SheetsError {
  const errMsg = error?.message || String(error)
  const code = error?.code || error?.response?.status

  if (errMsg.includes('has not been used') || errMsg.includes('is disabled') || errMsg.includes('SERVICE_DISABLED')) {
    return {
      message: 'Google Sheets API belum diaktifkan di project Google Cloud. Aktifkan di Google Cloud Console → APIs & Services → Library → Google Sheets API.',
      code,
      reason: 'SERVICE_DISABLED',
      isApiDisabled: true,
    }
  }

  if (errMsg.includes('invalid_grant') || errMsg.includes('Invalid JWT') || errMsg.includes('invalid_client')) {
    return {
      message: 'Kredensial Service Account tidak valid. Periksa kembali Service Account Email dan Private Key di tab Google Drive.',
      code,
      reason: 'INVALID_CREDENTIALS',
      isAuthError: true,
    }
  }

  if (errMsg.includes('notFound') || errMsg.includes('Unable to parse')) {
    return {
      message: 'Spreadsheet ID tidak ditemukan. Pastikan ID benar dan Spreadsheet sudah dibagikan ke Service Account.',
      code,
      reason: 'NOT_FOUND',
      isNotFoundError: true,
    }
  }

  if (errMsg.includes('insufficientPermissions') || errMsg.includes('forbidden') || errMsg.includes('ACCESS_DENIED') || errMsg.includes('PERMISSION_DENIED')) {
    return {
      message: 'Service Account tidak memiliki akses ke Spreadsheet. Bagikan Spreadsheet ke email Service Account dengan akses Editor.',
      code,
      reason: 'PERMISSION_DENIED',
      isPermissionError: true,
    }
  }

  if (errMsg.includes('unregistered') || errMsg.includes('unregistered callers')) {
    return {
      message: 'Google Sheets API belum diaktifkan di project Anda. Aktifkan di Google Cloud Console → APIs & Services.',
      code,
      reason: 'API_NOT_ENABLED',
      isApiDisabled: true,
    }
  }

  if (errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('network')) {
    return {
      message: 'Tidak dapat terhubung ke server Google. Periksa koneksi internet.',
      code,
      reason: 'NETWORK_ERROR',
    }
  }

  return {
    message: `Koneksi ke Google Sheets gagal: ${errMsg}`,
    code,
    reason: 'UNKNOWN',
  }
}

// Get Google Sheets configuration from database settings
export async function getSheetsConfig(): Promise<SheetsConfig | null> {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: [
            'googleDriveClientEmail',
            'googleDrivePrivateKey',
            'googleSheetsSpreadsheetId',
            'googleSheetsSheetName',
          ],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => (settingsMap[s.key] = s.value))

    const clientEmail = settingsMap.googleDriveClientEmail
    const privateKey = settingsMap.googleDrivePrivateKey?.replace(/\\n/g, '\n')
    const spreadsheetId = settingsMap.googleSheetsSpreadsheetId
    const sheetName = settingsMap.googleSheetsSheetName || 'Sheet1'

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return null
    }

    return { clientEmail, privateKey, spreadsheetId, sheetName }
  } catch (error) {
    console.error('Error getting Sheets config:', error)
    return null
  }
}

// Check if Google Sheets is configured
export async function isSheetsConfigured(): Promise<boolean> {
  const config = await getSheetsConfig()
  return config !== null
}

// Create an authenticated Google Sheets client using Service Account
function createSheetsClient(config: SheetsConfig) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

// Get spreadsheet info - throws on error
export async function getSpreadsheetInfo(): Promise<{
  title: string
  id: string
  url: string
  sheets: Array<{ title: string; sheetId: number }>
}> {
  const config = await getSheetsConfig()
  if (!config) throw new Error('Google Sheets belum dikonfigurasi')

  const sheets = createSheetsClient(config)
  const response = await sheets.spreadsheets.get({
    spreadsheetId: config.spreadsheetId,
    fields: 'properties.title,spreadsheetId,sheets.properties(title,sheetId)',
  })

  const title = response.data.properties?.title || 'Unknown'
  const sheetList = (response.data.sheets || []).map((s) => ({
    title: s.properties?.title || '',
    sheetId: s.properties?.sheetId || 0,
  }))

  return {
    title,
    id: config.spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`,
    sheets: sheetList,
  }
}

// Test connection - returns detailed result
export async function testSheetsConnection(): Promise<{
  configured: boolean
  connected: boolean
  spreadsheet?: { title: string; id: string; url: string; sheets: Array<{ title: string; sheetId: number }> }
  error?: SheetsError
  message: string
}> {
  try {
    const config = await getSheetsConfig()
    if (!config) {
      return {
        configured: false,
        connected: false,
        message: 'Google Sheets belum dikonfigurasi. Atur Spreadsheet ID di tab Google Sheets dan Service Account di tab Google Drive.',
      }
    }

    try {
      const info = await getSpreadsheetInfo()
      return {
        configured: true,
        connected: true,
        spreadsheet: info,
        message: `Google Sheets terhubung: "${info.title}" (${info.sheets.length} sheet)`,
      }
    } catch (error: any) {
      const sheetsError = parseSheetsError(error)
      return {
        configured: true,
        connected: false,
        error: sheetsError,
        message: sheetsError.message,
      }
    }
  } catch (error: any) {
    return {
      configured: false,
      connected: false,
      error: parseSheetsError(error),
      message: `Error: ${error.message || 'Koneksi gagal'}`,
    }
  }
}

// Sync ASN data to Google Sheets
export async function syncAsnData(): Promise<{
  success: boolean
  message: string
  count: number
}> {
  const config = await getSheetsConfig()
  if (!config) {
    return { success: false, message: 'Google Sheets belum dikonfigurasi', count: 0 }
  }

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

  const headers = ['NIP', 'Nama', 'Jabatan', 'Pangkat/Gol.', 'Unit Kerja', 'Bidang', 'Status ASN', 'Email', 'No HP', 'Status']
  const rows = asnList.map((asn) => [
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

  const sheets = createSheetsClient(config)

  // Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A:J`,
  })

  // Write headers and data
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  })

  return {
    success: true,
    message: `${asnList.length} data ASN berhasil disinkronkan ke Google Sheets`,
    count: asnList.length,
  }
}

// Sync form responses to Google Sheets
export async function syncFormResponses(formId: string): Promise<{
  success: boolean
  message: string
  count: number
  sheetName: string
}> {
  const config = await getSheetsConfig()
  if (!config) {
    return { success: false, message: 'Google Sheets belum dikonfigurasi', count: 0, sheetName: '' }
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
    return { success: false, message: 'Form tidak ditemukan', count: 0, sheetName: '' }
  }

  // Build headers
  const headers = ['NIP', 'Nama', 'Bidang', 'Jabatan', 'Waktu Pengisian', ...form.fields.map((f) => f.label)]

  // Build rows - include Drive links for file upload fields
  const rows = form.responses.map((resp) => {
    const row = [
      resp.user.nip,
      resp.user.name,
      resp.user.bidang || '',
      resp.user.jabatan || '',
      new Date(resp.submittedAt).toLocaleString('id-ID'),
    ]
    form.fields.forEach((field) => {
      const fieldResp = resp.fields.find((f) => f.fieldId === field.id)
      // For file upload fields, prefer Drive link if available
      if (fieldResp?.driveLink && (field.type === 'file_upload' || field.type === 'image_upload' || field.type === 'multi_upload')) {
        row.push(fieldResp.driveLink)
      } else {
        row.push(fieldResp?.value || '')
      }
    })
    return row
  })

  const sheets = createSheetsClient(config)

  // Use form title as sheet name (sanitized)
  const targetSheetName = form.title.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50) || 'Responses'

  // Check if sheet exists, if not create it
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: config.spreadsheetId })
  const sheetExists = spreadsheet.data.sheets?.some(
    (s) => s.properties?.title === targetSheetName
  )

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: targetSheetName },
            },
          },
        ],
      },
    })
  }

  // Clear and write
  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range: `${targetSheetName}!A:ZZ`,
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${targetSheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows],
    },
  })

  return {
    success: true,
    message: `${form.responses.length} respon berhasil disinkronkan ke sheet "${targetSheetName}"`,
    count: form.responses.length,
    sheetName: targetSheetName,
  }
}

// Append a single form response to Google Sheets (for auto-sync)
export async function appendFormResponse(
  formId: string,
  responseData: {
    nip: string
    name: string
    bidang: string
    jabatan: string
    submittedAt: Date
    fields: Array<{ label: string; value: string; driveLink?: string; fileName?: string }>
  }
): Promise<boolean> {
  try {
    const config = await getSheetsConfig()
    if (!config) return false

    const form = await db.form.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { order: 'asc' } } },
    })
    if (!form) return false

    const sheets = createSheetsClient(config)
    const targetSheetName = form.title.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50) || 'Responses'

    // Build row data with Drive links for file fields
    const row = [
      responseData.nip,
      responseData.name,
      responseData.bidang,
      responseData.jabatan,
      new Date(responseData.submittedAt).toLocaleString('id-ID'),
      ...form.fields.map((field) => {
        const match = responseData.fields.find((f) => f.label === field.label)
        if (!match) return ''
        // For file upload fields, include Drive link if available
        if (match.driveLink && (field.type === 'file_upload' || field.type === 'image_upload' || field.type === 'multi_upload')) {
          return match.driveLink
        }
        return match.value || ''
      }),
    ]

    // Check if sheet exists
    try {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: config.spreadsheetId })
      const sheetExists = spreadsheet.data.sheets?.some(
        (s) => s.properties?.title === targetSheetName
      )

      if (!sheetExists) {
        // Create sheet with headers first
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: config.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: targetSheetName },
                },
              },
            ],
          },
        })

        // Write headers
        const headers = ['NIP', 'Nama', 'Bidang', 'Jabatan', 'Waktu Pengisian', ...form.fields.map((f) => f.label)]
        await sheets.spreadsheets.values.update({
          spreadsheetId: config.spreadsheetId,
          range: `${targetSheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] },
        })
      }
    } catch {
      // If sheet check fails, just try to append anyway
    }

    // Append the row
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${targetSheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    })

    return true
  } catch (error: any) {
    console.error('Auto-sync to Sheets failed:', error?.message || error)
    return false
  }
}
