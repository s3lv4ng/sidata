import { google } from 'googleapis'
import { Readable } from 'stream'
import { db } from '@/lib/db'

export interface GoogleConfig {
  clientEmail: string
  privateKey: string
  driveFolderId: string
  spreadsheetId: string
  apiKey: string
  delegatedUser: string
}

function normalizePrivateKey(key: string): string {
  // Trim whitespace
  let normalized = key.trim()

  // Replace literal \n strings with actual newlines
  normalized = normalized.replace(/\\n/g, '\n')

  // If the key is too short and doesn't look like a PEM key, it's likely invalid
  // Return as-is and let the auth step handle the error
  if (normalized.length < 100 && !normalized.includes('BEGIN PRIVATE KEY')) {
    return normalized
  }

  // Check if the key already has proper PEM headers
  const hasBeginHeader = normalized.includes('-----BEGIN PRIVATE KEY-----')
  const hasEndHeader = normalized.includes('-----END PRIVATE KEY-----')

  // If both headers are present, just ensure proper newline formatting
  if (hasBeginHeader && hasEndHeader) {
    return normalized
  }

  // If neither header is present, wrap the key content with PEM headers
  if (!hasBeginHeader && !hasEndHeader) {
    // The key content might be base64 only — wrap it with headers
    normalized = `-----BEGIN PRIVATE KEY-----\n${normalized}\n-----END PRIVATE KEY-----`
    return normalized
  }

  // If only one header is present, the key is malformed — return as-is
  return normalized
}

export async function getGoogleConfig(): Promise<GoogleConfig | null> {
  const settings = await db.systemSetting.findMany({
    where: {
      key: {
        in: [
          'googleServiceAccountEmail',
          'googlePrivateKey',
          'googleDriveFolderId',
          'googleSpreadsheetId',
          'googleApiKey',
          'googleDelegatedUser',
        ],
      },
    },
  })

  const settingsMap: Record<string, string> = {}
  settings.forEach((s) => (settingsMap[s.key] = s.value))

  const clientEmail = settingsMap.googleServiceAccountEmail || ''
  const rawPrivateKey = settingsMap.googlePrivateKey || ''
  const privateKey = normalizePrivateKey(rawPrivateKey)

  if (!clientEmail || !privateKey) {
    return null
  }

  return {
    clientEmail,
    privateKey,
    driveFolderId: settingsMap.googleDriveFolderId || '',
    spreadsheetId: settingsMap.googleSpreadsheetId || '',
    apiKey: settingsMap.googleApiKey || '',
    delegatedUser: settingsMap.googleDelegatedUser || '',
  }
}

function getAuthClient(config: GoogleConfig, skipDelegation = false) {
  try {
    const jwtConfig: any = {
      email: config.clientEmail,
      key: config.privateKey,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    }

    // If a delegated user is configured and it's a Workspace domain, use Domain-Wide Delegation
    // This makes the SA act on behalf of a real user, using their Drive quota
    // NOTE: DWD only works with Google Workspace (not gmail.com)
    // For Gmail accounts, the SA uploads to a shared folder and then shares the file
    if (config.delegatedUser && !skipDelegation) {
      const domain = config.delegatedUser.split('@')[1]?.toLowerCase()
      const isGmail = domain === 'gmail.com' || domain === 'googlemail.com'
      
      if (!isGmail) {
        // Google Workspace account - use DWD
        jwtConfig.subject = config.delegatedUser
      }
      // For Gmail: don't set subject (DWD won't work), 
      // but we'll share files after upload using the delegated user email
    }

    return new google.auth.JWT(jwtConfig)
  } catch (err: any) {
    if (err.message && (
      err.message.includes('DECODER') ||
      err.message.includes('unsupported') ||
      err.message.includes('no start line') ||
      err.message.includes('ASN1')
    )) {
      throw new Error('Format Private Key tidak valid. Pastikan menggunakan format PEM lengkap (-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----)')
    }
    throw new Error(`Gagal membuat klien autentikasi: ${err.message || 'Kesalahan tidak diketahui'}`)
  }
}

export async function getDriveClient() {
  const config = await getGoogleConfig()
  if (!config) {
    throw new Error('Konfigurasi Google API belum diatur. Silakan atur Service Account Email dan Private Key di pengaturan.')
  }

  const auth = getAuthClient(config)
  return google.drive({ version: 'v3', auth })
}

export async function getSheetsClient() {
  const config = await getGoogleConfig()
  if (!config) {
    throw new Error('Konfigurasi Google API belum diatur. Silakan atur Service Account Email dan Private Key di pengaturan.')
  }

  const auth = getAuthClient(config)
  return google.sheets({ version: 'v4', auth })
}

export async function verifyDriveFolder(
  folderId: string
): Promise<{
  exists: boolean
  isSharedDrive: boolean
  isWritable: boolean
  folderName: string
  driveName: string
  driveId: string
  error: string
  webViewLink: string
  ownerEmail: string
}> {
  const result = {
    exists: false,
    isSharedDrive: false,
    isWritable: false,
    folderName: '',
    driveName: '',
    driveId: '',
    error: '',
    webViewLink: '',
    ownerEmail: '',
  }

  try {
    const drive = await getDriveClient()

    // Get folder info
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, parents, driveId, webViewLink, capabilities, owners',
    })

    result.exists = true
    result.folderName = folderInfo.data.name || ''
    result.webViewLink = folderInfo.data.webViewLink || ''

    // Get owner email if available
    if (folderInfo.data.owners && folderInfo.data.owners.length > 0) {
      result.ownerEmail = folderInfo.data.owners[0]?.emailAddress || ''
    }

    // Check if folder is in a Shared Drive
    if (folderInfo.data.driveId) {
      result.isSharedDrive = true
      result.driveId = folderInfo.data.driveId

      // Get Shared Drive name
      try {
        const driveInfo = await drive.drives.get({
          driveId: folderInfo.data.driveId,
          fields: 'id, name',
        })
        result.driveName = driveInfo.data.name || ''
      } catch {
        result.driveName = 'Unknown Shared Drive'
      }
    }

    // Check write permission by trying to create and delete a test file
    try {
      const testFile = await drive.files.create({
        requestBody: {
          name: `_sidata_test_${Date.now()}`,
          parents: [folderId],
          mimeType: 'text/plain',
        },
        media: {
          mimeType: 'text/plain',
          body: Readable.from(Buffer.from('test')),
        },
        fields: 'id',
      })

      // Delete the test file
      if (testFile.data.id) {
        await drive.files.delete({
          fileId: testFile.data.id,
        })
      }

      result.isWritable = true
    } catch (writeErr: unknown) {
      const writeMsg = writeErr instanceof Error ? writeErr.message : String(writeErr)
      if (writeMsg.includes('storage quota') || writeMsg.includes('quota')) {
        result.error = 'FOLDER_QUOTA_ERROR'
      } else if (writeMsg.includes('permission') || writeMsg.includes('forbidden') || writeMsg.includes('access')) {
        result.error = 'FOLDER_NO_ACCESS'
      } else if (writeMsg.includes('not found') || writeMsg.includes('does not exist')) {
        result.error = 'FOLDER_NOT_FOUND'
      } else {
        result.error = writeMsg.substring(0, 200)
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('not found') || msg.includes('does not exist')) {
      result.error = 'FOLDER_NOT_FOUND'
    } else if (msg.includes('permission') || msg.includes('forbidden')) {
      result.error = 'FOLDER_NO_ACCESS'
    } else {
      result.error = msg.substring(0, 200)
    }
  }

  return result
}

export async function uploadToDrive(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{ fileId: string; fileName: string; webViewLink: string; webContentLink: string }> {
  const config = await getGoogleConfig()
  if (!config) {
    throw new Error('Konfigurasi Google API belum diatur.')
  }

  const drive = await getDriveClient()
  const targetFolderId = folderId || config.driveFolderId

  if (!targetFolderId) {
    throw new Error('Drive Folder ID belum diatur. Silakan atur di pengaturan integrasi Google.')
  }

  console.log(`[Google Drive] Uploading "${fileName}" to folder ${targetFolderId}${config.delegatedUser ? ` (sharing with ${config.delegatedUser})` : ''}`)

  // Upload directly to the target folder.
  // For My Drive: the folder must be shared with the SA email as Editor.
  // When the SA uploads to a shared folder, the folder owner's storage quota is used
  // (SAs have 0 storage quota of their own).
  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: Readable.from(file),
      },
      fields: 'id, name, webViewLink, webContentLink, parents',
    })

    const data = response.data
    console.log(`[Google Drive] Upload to folder ${targetFolderId} successful: ${data.id}`)

    // Share the file with the Drive owner if delegated user is set
    await shareFileWithUser(drive, data.id || '', config.delegatedUser)

    return {
      fileId: data.id || '',
      fileName: data.name || fileName,
      webViewLink: data.webViewLink || '',
      webContentLink: data.webContentLink || '',
    }
  } catch (err: any) {
    const errMsg = err.message || ''
    console.error(`[Google Drive] Upload to folder ${targetFolderId} failed: ${errMsg.substring(0, 200)}`)

    // Provide actionable error messages for common My Drive issues
    if (errMsg.includes('storage quota') || errMsg.includes('quota')) {
      throw new Error(
        `Upload gagal: Service Account tidak memiliki kuota penyimpanan. ` +
        `Solusi: Pastikan folder sudah di-share ke email Service Account (${config.clientEmail}) dengan akses Editor, ` +
        `atau gunakan login Google (OAuth2) untuk upload ke My Drive.`
      )
    }
    if (errMsg.includes('not found') || errMsg.includes('does not exist')) {
      throw new Error(
        `Upload gagal: Folder tidak ditemukan (ID: ${targetFolderId}). ` +
        `Pastikan Drive Folder ID benar dan folder sudah di-share ke email Service Account (${config.clientEmail}).`
      )
    }
    if (errMsg.includes('permission') || errMsg.includes('forbidden') || errMsg.includes('access')) {
      throw new Error(
        `Upload gagal: Service Account (${config.clientEmail}) tidak memiliki akses ke folder. ` +
        `Solusi: Share folder di Google Drive ke email Service Account dengan akses Editor.`
      )
    }

    throw new Error(`Upload ke Google Drive gagal: ${errMsg}`)
  }
}

async function shareFileWithUser(drive: any, fileId: string, userEmail: string) {
  if (!userEmail || !fileId) return
  
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: userEmail,
      },
    })
    console.log(`[Google Drive] Shared file with ${userEmail}`)
  } catch (shareErr: any) {
    // Sharing is non-fatal - file is still uploaded
    console.warn(`[Google Drive] Could not share file with ${userEmail}:`, shareErr.message || shareErr)
  }
}

/**
 * Get an OAuth2-authenticated Drive client using the stored refresh token.
 * This is used for uploading files to My Drive (Service Account can't upload to My Drive).
 * Uses the system-wide OAuth2 refresh token stored in SystemSetting.
 */
export async function getOAuthDriveClient(): Promise<{
  drive: any
  auth: any
} | null> {
  // Get Google OAuth credentials and refresh token from settings
  const settings = await db.systemSetting.findMany({
    where: {
      key: { in: ['googleLoginClientId', 'googleLoginClientSecret', 'googleDriveRefreshToken'] },
    },
  })
  const settingsMap: Record<string, string> = {}
  settings.forEach((s) => (settingsMap[s.key] = s.value))

  const clientId = settingsMap.googleLoginClientId || ''
  const clientSecret = settingsMap.googleLoginClientSecret || ''
  const refreshToken = settingsMap.googleDriveRefreshToken || ''

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  // Refresh the access token
  try {
    await oauth2Client.getAccessToken()
  } catch (err: any) {
    console.error('[Google Drive OAuth] Failed to refresh access token:', err.message)
    return null
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  return { drive, auth: oauth2Client }
}

/**
 * Upload a file to Google Drive using OAuth2 (user's Drive).
 * Falls back to Service Account if OAuth2 is not available.
 */
export async function uploadToDriveOAuth(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{ fileId: string; fileName: string; webViewLink: string; webContentLink: string }> {
  const config = await getGoogleConfig()
  const targetFolderId = folderId || config?.driveFolderId || ''

  if (!targetFolderId) {
    throw new Error('Drive Folder ID belum diatur. Silakan atur di pengaturan integrasi Google.')
  }

  // Try OAuth2 first (can upload to My Drive)
  const oauthClient = await getOAuthDriveClient()
  if (oauthClient) {
    try {
      console.log(`[Google Drive OAuth] Uploading "${fileName}" to folder ${targetFolderId}`)
      const response = await oauthClient.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolderId],
        },
        media: {
          mimeType,
          body: Readable.from(file),
        },
        fields: 'id, name, webViewLink, webContentLink',
      })

      const data = response.data
      console.log(`[Google Drive OAuth] Upload successful: ${data.id}`)

      return {
        fileId: data.id || '',
        fileName: data.name || fileName,
        webViewLink: data.webViewLink || '',
        webContentLink: data.webContentLink || '',
      }
    } catch (oauthErr: any) {
      console.warn(`[Google Drive OAuth] Upload failed: ${oauthErr.message?.substring(0, 200)}`)
      // Fall through to Service Account attempt
    }
  }

  // Fall back to Service Account upload
  return uploadToDrive(file, fileName, mimeType, folderId)
}

export async function syncToSheet(
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  rows: string[][]
): Promise<{ success: boolean; rowsSynced: number; spreadsheetUrl: string }> {
  const sheets = await getSheetsClient()

  // Check if sheet exists, create if not
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
  })

  const existingSheets = spreadsheet.data.sheets || []
  const sheetExists = existingSheets.some(
    (s) => s.properties?.title === sheetName
  )

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    })
  }

  // Clear existing data in the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${sheetName}'`,
  })

  // Write headers and rows
  const allData = [headers, ...rows]
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: allData,
    },
  })

  return {
    success: true,
    rowsSynced: rows.length,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`,
  }
}

function formatGoogleError(err: any): string {
  const msg = err.message || ''

  // DECODER routines::unsupported — invalid private key format
  if (msg.includes('DECODER') || msg.includes('unsupported') || msg.includes('no start line') || msg.includes('ASN1')) {
    return 'Format Private Key tidak valid. Pastikan menggunakan format PEM lengkap (-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----)'
  }

  // invalid_grant — Service Account email issue or delegation failure
  if (msg.includes('invalid_grant')) {
    return 'Autentikasi gagal. Pastikan Service Account valid dan Domain-Wide Delegation sudah diaktifkan (jika menggunakan Delegated User).'
  }

  // Storage quota error
  if (msg.includes('storage quota') || msg.includes('quota')) {
    return 'Service Account tidak memiliki kuota penyimpanan. Solusi: Share folder Google Drive ke email Service Account dengan akses Editor, lalu upload ke folder tersebut.'
  }

  // Return the original error message (already in Indonesian if from getAuthClient)
  return msg || 'Koneksi Google API gagal'
}

export async function testConnection(): Promise<{
  drive: { connected: boolean; message: string }
  sheets: { connected: boolean; message: string }
}> {
  const result = {
    drive: { connected: false, message: '' },
    sheets: { connected: false, message: '' },
  }

  try {
    const config = await getGoogleConfig()
    if (!config) {
      result.drive = {
        connected: false,
        message: 'Konfigurasi Google API belum diatur',
      }
      result.sheets = {
        connected: false,
        message: 'Konfigurasi Google API belum diatur',
      }
      return result
    }

    // Test Drive connection
    try {
      const drive = await getDriveClient()
      await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
      })
      
      // Also check if OAuth2 is available for Drive uploads
      const oauthClient = await getOAuthDriveClient()
      const oauthStatus = oauthClient 
        ? ' (OAuth2 Drive: ✓ siap upload ke My Drive)' 
        : ' (OAuth2 Drive: ✗ belum - login Google diperlukan untuk upload ke My Drive)'
      
      result.drive = {
        connected: true,
        message: config.delegatedUser
          ? `Koneksi Google Drive berhasil (sebagai ${config.delegatedUser})${oauthStatus}`
          : `Koneksi Google Drive berhasil${oauthStatus}`,
      }
    } catch (err: any) {
      result.drive = {
        connected: false,
        message: formatGoogleError(err),
      }
    }

    // Test Sheets connection
    try {
      const sheets = await getSheetsClient()
      if (config.spreadsheetId) {
        await sheets.spreadsheets.get({
          spreadsheetId: config.spreadsheetId,
          fields: 'spreadsheetId',
        })
        result.sheets = {
          connected: true,
          message: 'Koneksi Google Sheets berhasil',
        }
      } else {
        // Just verify auth works by trying to list spreadsheets via drive
        const drive = await getDriveClient()
        await drive.files.list({
          q: "mimeType='application/vnd.google-apps.spreadsheet'",
          pageSize: 1,
          fields: 'files(id, name)',
        })
        result.sheets = {
          connected: true,
          message: 'Autentikasi berhasil (Spreadsheet ID belum diatur)',
        }
      }
    } catch (err: any) {
      result.sheets = {
        connected: false,
        message: formatGoogleError(err),
      }
    }
  } catch (err: any) {
    const formattedError = formatGoogleError(err)
    result.drive = {
      connected: false,
      message: formattedError,
    }
    result.sheets = {
      connected: false,
      message: formattedError,
    }
  }

  return result
}

export async function listDriveFiles(
  folderId: string
): Promise<
  Array<{
    id: string
    name: string
    mimeType: string
    webViewLink: string
    size: string
    createdTime: string
  }>
> {
  const drive = await getDriveClient()

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, size, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  })

  return (response.data.files || []).map((file) => ({
    id: file.id || '',
    name: file.name || '',
    mimeType: file.mimeType || '',
    webViewLink: file.webViewLink || '',
    size: file.size || '0',
    createdTime: file.createdTime || '',
  }))
}

export async function createSpreadsheet(
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheets = await getSheetsClient()

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
    },
  })

  const data = response.data
  return {
    spreadsheetId: data.spreadsheetId || '',
    spreadsheetUrl: data.spreadsheetUrl || '',
  }
}

export async function createFolderInDrive(
  folderName: string,
  parentId: string
): Promise<{ folderId: string; folderLink: string }> {
  const drive = await getDriveClient()

  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, webViewLink',
  })

  const data = response.data
  return {
    folderId: data.id || '',
    folderLink: data.webViewLink || '',
  }
}

/**
 * Find a folder by name inside a parent folder in Google Drive.
 * Returns the folder ID if found, or null if not found.
 */
async function findFolderByName(
  driveClient: any,
  folderName: string,
  parentFolderId: string
): Promise<{ folderId: string; webViewLink: string } | null> {
  try {
    // Escape single quotes in folder name for Drive query
    const escapedName = folderName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const response = await driveClient.files.list({
      q: `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      pageSize: 1,
    })

    const files = response.data.files || []
    if (files.length > 0) {
      return {
        folderId: files[0].id || '',
        webViewLink: files[0].webViewLink || '',
      }
    }
    return null
  } catch (err: any) {
    console.warn(`[Google Drive] Error finding folder "${folderName}":`, err.message?.substring(0, 200))
    return null
  }
}

/**
 * Create a folder using OAuth2 Drive client.
 */
async function createFolderWithOAuth(
  oauthDrive: any,
  folderName: string,
  parentFolderId: string
): Promise<{ folderId: string; folderLink: string }> {
  const response = await oauthDrive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, webViewLink',
  })

  const data = response.data
  return {
    folderId: data.id || '',
    folderLink: data.webViewLink || '',
  }
}

/**
 * Get or create a Drive folder for a specific Bidang (division).
 * - First checks the database for a cached driveFolderId
 * - If not cached, searches for the folder in the parent Drive folder
 * - If not found on Drive, creates it
 * - Caches the folder ID in the database
 * 
 * Uses OAuth2 client if available (for My Drive), falls back to SA client.
 */
export async function getOrCreateBidangFolder(
  bidangName: string,
  parentFolderId: string
): Promise<{ folderId: string; folderLink: string; created: boolean }> {
  // 1. Check database cache first
  const bidangRecord = await db.bidang.findUnique({
    where: { name: bidangName },
  })

  if (bidangRecord?.driveFolderId) {
    console.log(`[Google Drive] Using cached folder for Bidang "${bidangName}": ${bidangRecord.driveFolderId}`)
    return {
      folderId: bidangRecord.driveFolderId,
      folderLink: bidangRecord.driveFolderLink || '',
      created: false,
    }
  }

  // 2. Try OAuth2 client first (for My Drive)
  const oauthClient = await getOAuthDriveClient()
  if (oauthClient) {
    try {
      // Search for existing folder
      const existing = await findFolderByName(oauthClient.drive, bidangName, parentFolderId)
      if (existing) {
        console.log(`[Google Drive OAuth] Found existing folder for Bidang "${bidangName}": ${existing.folderId}`)
        // Cache in DB
        await db.bidang.update({
          where: { name: bidangName },
          data: {
            driveFolderId: existing.folderId,
            driveFolderLink: existing.webViewLink,
          },
        })
        return { folderId: existing.folderId, folderLink: existing.webViewLink, created: false }
      }

      // Create new folder
      console.log(`[Google Drive OAuth] Creating folder for Bidang "${bidangName}" in parent ${parentFolderId}`)
      const newFolder = await createFolderWithOAuth(oauthClient.drive, bidangName, parentFolderId)
      console.log(`[Google Drive OAuth] Created folder for Bidang "${bidangName}": ${newFolder.folderId}`)

      // Share with delegated user if configured
      const config = await getGoogleConfig()
      if (config?.delegatedUser) {
        await shareFileWithUser(oauthClient.drive, newFolder.folderId, config.delegatedUser)
      }

      // Cache in DB
      await db.bidang.update({
        where: { name: bidangName },
        data: {
          driveFolderId: newFolder.folderId,
          driveFolderLink: newFolder.folderLink,
        },
      })

      return { folderId: newFolder.folderId, folderLink: newFolder.folderLink, created: true }
    } catch (oauthErr: any) {
      console.warn(`[Google Drive OAuth] Failed to get/create bidang folder: ${oauthErr.message?.substring(0, 200)}`)
      // Fall through to SA approach
    }
  }

  // 3. Fall back to Service Account
  const drive = await getDriveClient()

  // Search for existing folder
  const existing = await findFolderByName(drive, bidangName, parentFolderId)
  if (existing) {
    console.log(`[Google Drive SA] Found existing folder for Bidang "${bidangName}": ${existing.folderId}`)
    // Cache in DB
    await db.bidang.update({
      where: { name: bidangName },
      data: {
        driveFolderId: existing.folderId,
        driveFolderLink: existing.webViewLink,
      },
    })
    return { folderId: existing.folderId, folderLink: existing.webViewLink, created: false }
  }

  // Create new folder with SA
  console.log(`[Google Drive SA] Creating folder for Bidang "${bidangName}" in parent ${parentFolderId}`)
  const newFolder = await createFolderInDrive(bidangName, parentFolderId)
  console.log(`[Google Drive SA] Created folder for Bidang "${bidangName}": ${newFolder.folderId}`)

  // Share with delegated user if configured
  const config = await getGoogleConfig()
  if (config?.delegatedUser) {
    await shareFileWithUser(drive, newFolder.folderId, config.delegatedUser)
  }

  // Cache in DB
  await db.bidang.update({
    where: { name: bidangName },
    data: {
      driveFolderId: newFolder.folderId,
      driveFolderLink: newFolder.folderLink,
    },
  })

  return { folderId: newFolder.folderId, folderLink: newFolder.folderLink, created: true }
}
