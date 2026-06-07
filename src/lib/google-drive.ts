import { google } from 'googleapis'
import { Readable } from 'stream'
import { db } from './db'

// Google Drive configuration interface
interface DriveConfig {
  clientEmail: string
  privateKey: string
  folderId: string
  delegateEmail?: string // For domain-wide delegation
}

// Error type for detailed Google API errors
export interface DriveError {
  message: string
  code?: number
  reason?: string
  isApiDisabled?: boolean
  isAuthError?: boolean
  isNotFoundError?: boolean
  isPermissionError?: boolean
  isQuotaError?: boolean
}

// Parse Google API error into a user-friendly DriveError
function parseDriveError(error: any): DriveError {
  const errMsg = error?.message || String(error)
  const code = error?.code || error?.response?.status

  if (errMsg.includes('has not been used') || errMsg.includes('is disabled') || errMsg.includes('SERVICE_DISABLED')) {
    return {
      message: 'Google Drive API belum diaktifkan di project Google Cloud Anda. Aktifkan di Google Cloud Console → APIs & Services → Library → Google Drive API.',
      code, reason: 'SERVICE_DISABLED', isApiDisabled: true,
    }
  }

  if (errMsg.includes('invalid_grant') || errMsg.includes('Invalid JWT') || errMsg.includes('invalid_client')) {
    return {
      message: 'Kredensial Service Account tidak valid. Periksa kembali Service Account Email dan Private Key.',
      code, reason: 'INVALID_CREDENTIALS', isAuthError: true,
    }
  }

  if (errMsg.includes('File not found') || errMsg.includes('notFound')) {
    return {
      message: 'Folder ID tidak ditemukan. Pastikan Folder ID benar dan folder sudah dibagikan ke Service Account.',
      code, reason: 'NOT_FOUND', isNotFoundError: true,
    }
  }

  if (errMsg.includes('insufficientPermissions') || errMsg.includes('forbidden') || errMsg.includes('ACCESS_DENIED')) {
    return {
      message: 'Service Account tidak memiliki akses ke folder. Bagikan folder ke email Service Account dengan akses Editor.',
      code, reason: 'PERMISSION_DENIED', isPermissionError: true,
    }
  }

  if (errMsg.includes('unregistered') || errMsg.includes('unregistered callers')) {
    return {
      message: 'Google Drive API belum diaktifkan di project Anda. Aktifkan di Google Cloud Console → APIs & Services.',
      code, reason: 'API_NOT_ENABLED', isApiDisabled: true,
    }
  }

  if (errMsg.includes('storage quota') || errMsg.includes('Storage quota exceeded') || errMsg.includes('do not have storage quota')) {
    return {
      message: 'Service Account tidak memiliki kuota penyimpanan. Gunakan Shared Drive (Drive Bersama) atau aktifkan Domain-Wide Delegation dengan Email Delegasi.',
      code, reason: 'STORAGE_QUOTA', isQuotaError: true,
    }
  }

  if (errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED') || errMsg.includes('network')) {
    return {
      message: 'Tidak dapat terhubung ke server Google. Periksa koneksi internet.',
      code, reason: 'NETWORK_ERROR',
    }
  }

  return {
    message: `Koneksi ke Google Drive gagal: ${errMsg}`,
    code, reason: 'UNKNOWN',
  }
}

// Get Google Drive configuration from database settings
export async function getDriveConfig(): Promise<DriveConfig | null> {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: ['googleDriveClientEmail', 'googleDrivePrivateKey', 'googleDriveFolderId', 'googleDriveDelegateEmail'],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => (settingsMap[s.key] = s.value))

    const clientEmail = settingsMap.googleDriveClientEmail
    const privateKey = settingsMap.googleDrivePrivateKey?.replace(/\\n/g, '\n')
    const folderId = settingsMap.googleDriveFolderId
    const delegateEmail = settingsMap.googleDriveDelegateEmail

    if (!clientEmail || !privateKey || !folderId) {
      return null
    }

    return { clientEmail, privateKey, folderId, delegateEmail: delegateEmail || undefined }
  } catch (error) {
    console.error('Error getting Drive config:', error)
    return null
  }
}

// Check if Google Drive is configured
export async function isDriveConfigured(): Promise<boolean> {
  const config = await getDriveConfig()
  return config !== null
}

// Create an authenticated Google Drive client
// If delegateEmail is set, uses domain-wide delegation to impersonate a real user
function createDriveClient(config: DriveConfig) {
  const authConfig: any = {
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  }

  // If delegate email is set, impersonate that user (domain-wide delegation)
  if (config.delegateEmail) {
    authConfig.subject = config.delegateEmail
  }

  const auth = new google.auth.GoogleAuth(authConfig)
  return google.drive({ version: 'v3', auth })
}

// Upload a file to Google Drive (supports Shared Drives and domain-wide delegation)
export async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    const config = await getDriveConfig()
    if (!config) {
      console.log('Google Drive not configured, skipping upload')
      return null
    }

    const drive = createDriveClient(config)
    const targetFolderId = folderId || config.folderId

    // Create a unique filename with timestamp
    const timestamp = Date.now()
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''
    const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName
    const uniqueFileName = `${baseName}_${timestamp}${ext}`

    // Convert Buffer to Readable stream
    const readableStream = Readable.from(fileBuffer)

    const response = await drive.files.create({
      requestBody: {
        name: uniqueFileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: readableStream,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    })

    if (!response.data.id || !response.data.webViewLink) {
      console.error('Drive upload failed: no file ID returned')
      return null
    }

    // Make the file accessible to anyone with the link
    try {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      })
    } catch (permError: any) {
      console.warn('Could not set public permission on Drive file:', permError?.message)
    }

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    }
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error?.message || error)
    return null
  }
}

// Delete a file from Google Drive
export async function deleteFromDrive(fileId: string): Promise<boolean> {
  try {
    const config = await getDriveConfig()
    if (!config) return false

    const drive = createDriveClient(config)
    await drive.files.delete({ fileId, supportsAllDrives: true })
    return true
  } catch (error: any) {
    console.error('Error deleting from Google Drive:', error?.message || error)
    return false
  }
}

// List files in the configured folder
export async function listDriveFiles(maxResults: number = 10): Promise<any[] | null> {
  try {
    const config = await getDriveConfig()
    if (!config) return null

    const drive = createDriveClient(config)
    const response = await drive.files.list({
      q: `'${config.folderId}' in parents and trashed = false`,
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, webViewLink, createdTime, size)',
      orderBy: 'createdTime desc',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: 'allDrives',
    })

    return response.data.files || []
  } catch (error: any) {
    console.error('Error listing Drive files:', error?.message || error)
    return null
  }
}

// Get folder info - returns folder data or throws with detailed error
export async function getFolderInfo(): Promise<{ name: string; id: string; driveId?: string }> {
  const config = await getDriveConfig()
  if (!config) throw new Error('Google Drive belum dikonfigurasi')

  const drive = createDriveClient(config)
  const response = await drive.files.get({
    fileId: config.folderId,
    fields: 'id, name, driveId',
    supportsAllDrives: true,
  })

  return {
    name: response.data.name || '',
    id: response.data.id || config.folderId,
    driveId: response.data.driveId || undefined,
  }
}

// Test connection - also tests if upload is possible
export async function testDriveConnection(): Promise<{
  configured: boolean
  connected: boolean
  folder?: { name: string; id: string }
  files?: any[]
  canUpload?: boolean
  uploadWarning?: string
  error?: DriveError
  message: string
}> {
  try {
    const config = await getDriveConfig()
    if (!config) {
      return {
        configured: false,
        connected: false,
        message: 'Google Drive belum dikonfigurasi. Silakan atur Service Account Email, Private Key, dan Folder ID.',
      }
    }

    try {
      const folderInfo = await getFolderInfo()
      const files = await listDriveFiles(10)

      // Check if folder is in a Shared Drive or if delegation is configured
      let canUpload = true
      let uploadWarning: string | undefined

      if (!folderInfo.driveId && !config.delegateEmail) {
        // Folder is in My Drive and no delegation configured
        canUpload = false
        uploadWarning = 'Folder ini berada di "My Drive" (Drive Pribadi), bukan Shared Drive. Upload file oleh Service Account akan gagal karena tidak memiliki kuota penyimpanan. Solusi: (1) Gunakan Shared Drive/Drive Bersama, atau (2) Atur Email Delegasi untuk domain-wide delegation.'
      }

      return {
        configured: true,
        connected: true,
        folder: { name: folderInfo.name, id: folderInfo.id },
        files: files || [],
        canUpload,
        uploadWarning,
        message: 'Google Drive terhubung dengan sukses.',
      }
    } catch (error: any) {
      const driveError = parseDriveError(error)
      return {
        configured: true,
        connected: false,
        error: driveError,
        message: driveError.message,
      }
    }
  } catch (error: any) {
    return {
      configured: false,
      connected: false,
      error: parseDriveError(error),
      message: `Error: ${error.message || 'Koneksi gagal'}`,
    }
  }
}

// Create a Shared Drive and folder for file uploads
export async function createSharedDriveForUpload(): Promise<{
  success: boolean
  message: string
  driveId?: string
  driveName?: string
  folderId?: string
  folderName?: string
}> {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: ['googleDriveClientEmail', 'googleDrivePrivateKey'],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => (settingsMap[s.key] = s.value))

    const clientEmail = settingsMap.googleDriveClientEmail
    const privateKey = settingsMap.googleDrivePrivateKey?.replace(/\\n/g, '\n')

    if (!clientEmail || !privateKey) {
      return { success: false, message: 'Service Account belum dikonfigurasi' }
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    })
    const drive = google.drive({ version: 'v3', auth })

    // Create a Shared Drive
    const requestId = `sidata-bkad-${Date.now()}`
    const driveName = 'SIDATA BKAD Drive'

    const driveResponse = await drive.drives.create({
      requestId,
      requestBody: { name: driveName },
    })

    const newDriveId = driveResponse.data.id
    if (!newDriveId) {
      return { success: false, message: 'Gagal membuat Shared Drive - tidak ada ID yang dikembalikan' }
    }

    // Create a folder inside the Shared Drive
    const folderName = 'Upload SIDATA'
    const folderResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [newDriveId],
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    })

    const newFolderId = folderResponse.data.id
    if (!newFolderId) {
      return { success: false, message: 'Gagal membuat folder di Shared Drive' }
    }

    // Update the folder ID in settings
    await db.systemSetting.upsert({
      where: { key: 'googleDriveFolderId' },
      update: { value: newFolderId },
      create: { key: 'googleDriveFolderId', value: newFolderId },
    })

    return {
      success: true,
      message: `Shared Drive "${driveName}" dan folder "${folderName}" berhasil dibuat. Folder ID diperbarui otomatis.`,
      driveId: newDriveId,
      driveName,
      folderId: newFolderId,
      folderName,
    }
  } catch (error: any) {
    const errMsg = error?.message || String(error)
    return {
      success: false,
      message: `Gagal membuat Shared Drive secara otomatis. Anda perlu membuatnya manual: buka Google Drive → Shared Drives → Buat baru → tambahkan Service Account sebagai Content Manager → buat folder → copy Folder ID ke pengaturan. Error: ${errMsg}`,
    }
  }
}
