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

// OAuth2 configuration for user-owned Drive uploads
interface OAuthDriveConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  folderId: string
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

// Get OAuth2 Drive configuration from database settings
export async function getOAuthDriveConfig(): Promise<OAuthDriveConfig | null> {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: ['googleDriveRefreshToken', 'googleDriveFolderId', 'googleLoginClientId', 'googleLoginClientSecret'],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => (settingsMap[s.key] = s.value))

    const clientId = settingsMap.googleLoginClientId
    const clientSecret = settingsMap.googleLoginClientSecret
    const refreshToken = settingsMap.googleDriveRefreshToken
    const folderId = settingsMap.googleDriveFolderId

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      return null
    }

    return { clientId, clientSecret, refreshToken, folderId }
  } catch (error) {
    console.error('Error getting OAuth Drive config:', error)
    return null
  }
}

// Check if OAuth2 Drive is configured (for My Drive uploads)
export async function isOAuthDriveConfigured(): Promise<boolean> {
  const config = await getOAuthDriveConfig()
  return config !== null
}

// Create an authenticated Google Drive client using OAuth2 (for user's My Drive)
function createOAuthDriveClient(config: OAuthDriveConfig) {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
  )

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
  })

  return google.drive({ version: 'v3', auth: oauth2Client })
}

// Create an authenticated Google Drive client using Service Account
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

// Get the best available Drive client for uploads
// Prefers OAuth2 (user's Drive) over Service Account
// For My Drive: OAuth2 is required (SA has no storage quota for My Drive)
// For Shared Drive: SA works directly
async function getUploadDriveClient(): Promise<{ drive: any; folderId: string; authType: 'oauth2' | 'service_account' } | null> {
  // Try OAuth2 first (for My Drive - user has storage quota)
  const oauthConfig = await getOAuthDriveConfig()
  if (oauthConfig) {
    try {
      const drive = createOAuthDriveClient(oauthConfig)
      // Test the client with a lightweight call to verify the token is still valid
      try {
        await drive.files.get({ fileId: oauthConfig.folderId, fields: 'id', supportsAllDrives: true })
        console.log('Google Drive: Using OAuth2 client (My Drive)')
        return { drive, folderId: oauthConfig.folderId, authType: 'oauth2' }
      } catch (testError: any) {
        // If the refresh token is invalid/expired, log and fall through
        console.warn('OAuth2 Drive token validation failed:', testError?.message || testError)
        // Don't fall through to SA - the user explicitly wants My Drive (OAuth2)
        // Return null and let the caller know OAuth2 is misconfigured
        if (testError?.message?.includes('invalid_grant') || testError?.message?.includes('Token has been expired')) {
          console.error('OAuth2 refresh token is expired or revoked. Admin needs to re-connect Google Drive account.')
        }
        return null
      }
    } catch (error) {
      console.warn('OAuth2 Drive client creation failed:', error)
    }
  }

  // Fall back to Service Account (works for Shared Drives, NOT for My Drive with Gmail)
  const config = await getDriveConfig()
  if (config) {
    try {
      const drive = createDriveClient(config)

      // Check if delegate email is a Gmail address (domain-wide delegation won't work)
      if (config.delegateEmail && config.delegateEmail.includes('@gmail.com')) {
        console.warn(
          `Google Drive: Service Account delegation to Gmail (${config.delegateEmail}) is NOT supported. ` +
          `Domain-wide delegation only works with Google Workspace accounts. ` +
          `Please connect your Google Drive via OAuth2 (Hubungkan Akun Google Drive) in Admin Settings.`
        )
        // Still try it - it might work if the SA was granted access to a shared folder
        // But don't expect it to work for My Drive
      }

      console.log('Google Drive: Using Service Account client' + (config.delegateEmail ? ` (delegating to ${config.delegateEmail})` : ''))
      return { drive, folderId: config.folderId, authType: 'service_account' }
    } catch (error) {
      console.error('Service Account Drive client failed:', error)
    }
  }

  return null
}

// Upload a file to Google Drive
// Uses OAuth2 if available (for My Drive), otherwise falls back to Service Account
export async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  try {
    const clientInfo = await getUploadDriveClient()
    if (!clientInfo) {
      console.log('No Drive client available for upload')
      return null
    }

    const { drive, folderId: defaultFolderId, authType } = clientInfo
    const targetFolderId = folderId || defaultFolderId

    // Create a unique filename with timestamp
    const timestamp = Date.now()
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''
    const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName
    const uniqueFileName = `${baseName}_${timestamp}${ext}`

    // Convert Buffer to Readable stream
    const readableStream = Readable.from(fileBuffer)

    const isSharedDrive = authType === 'service_account'

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
      supportsAllDrives: isSharedDrive,
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
        supportsAllDrives: isSharedDrive,
      })
    } catch (permError: any) {
      console.warn('Could not set public permission on Drive file:', permError?.message)
    }

    console.log(`File uploaded to Google Drive via ${authType}: ${uniqueFileName} (ID: ${response.data.id})`)

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    }
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error?.message || error)
    return null
  }
}

// In-memory cache for bidang folder IDs to avoid repeated lookups
const bidangFolderCache: Record<string, { folderId: string; cachedAt: number }> = {}
const BIDANG_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

// Find or create a subfolder for a specific Bidang in the parent Drive folder
// Each bidang gets its own folder (e.g., "Aset", "Keuangan", etc.)
export async function findOrCreateBidangFolder(bidangName: string): Promise<string | null> {
  try {
    const clientInfo = await getUploadDriveClient()
    if (!clientInfo) {
      console.log('No Drive client available for bidang folder creation')
      return null
    }

    const { drive, folderId: parentFolderId, authType } = clientInfo
    const isSharedDrive = authType === 'service_account'

    // Check cache first
    const cached = bidangFolderCache[bidangName]
    if (cached && Date.now() - cached.cachedAt < BIDANG_CACHE_TTL) {
      return cached.folderId
    }

    // Sanitize bidang name for folder name
    const sanitizedBidang = bidangName.trim().replace(/[<>:"/\\|?*]/g, '_')
    if (!sanitizedBidang) return null

    // Search for existing folder with this bidang name in the parent folder
    const searchResponse = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${sanitizedBidang}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      includeItemsFromAllDrives: isSharedDrive,
      supportsAllDrives: isSharedDrive,
      corpora: isSharedDrive ? 'allDrives' : 'user',
      pageSize: 1,
    })

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      const existingFolderId = searchResponse.data.files[0].id!
      // Cache the result
      bidangFolderCache[bidangName] = { folderId: existingFolderId, cachedAt: Date.now() }
      console.log(`Found existing Drive folder for bidang "${sanitizedBidang}": ${existingFolderId}`)
      return existingFolderId
    }

    // Folder doesn't exist, create it
    console.log(`Creating new Drive folder for bidang "${sanitizedBidang}"...`)
    const createResponse = await drive.files.create({
      requestBody: {
        name: sanitizedBidang,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: isSharedDrive,
    })

    const newFolderId = createResponse.data.id
    if (!newFolderId) {
      console.error('Failed to create bidang folder: no ID returned')
      return null
    }

    console.log(`Created Drive folder for bidang "${sanitizedBidang}": ${newFolderId}`)

    // Make the folder accessible (anyone with link can view)
    try {
      await drive.permissions.create({
        fileId: newFolderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: isSharedDrive,
      })
    } catch (permError: any) {
      console.warn('Could not set public permission on bidang folder:', permError?.message)
    }

    // Cache the result
    bidangFolderCache[bidangName] = { folderId: newFolderId, cachedAt: Date.now() }

    return newFolderId
  } catch (error: any) {
    console.error(`Error finding/creating bidang folder "${bidangName}":`, error?.message || error)
    return null
  }
}

// Upload a file to a bidang-specific folder in Google Drive
// Automatically creates the bidang folder if it doesn't exist
export async function uploadToBidangFolder(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  bidangName: string
): Promise<{ fileId: string; webViewLink: string; folderId: string } | null> {
  try {
    // Find or create the bidang folder
    const bidangFolderId = await findOrCreateBidangFolder(bidangName)
    
    if (bidangFolderId) {
      // Upload to the bidang-specific folder
      const result = await uploadToDrive(fileBuffer, fileName, mimeType, bidangFolderId)
      if (result) {
        return { ...result, folderId: bidangFolderId }
      }
    }

    // Fallback: upload to the main parent folder
    console.log(`Falling back to main folder upload for "${fileName}"`)
    const result = await uploadToDrive(fileBuffer, fileName, mimeType)
    return result ? { ...result, folderId: '' } : null
  } catch (error: any) {
    console.error('Error uploading to bidang folder:', error?.message || error)
    // Fallback to main folder
    const result = await uploadToDrive(fileBuffer, fileName, mimeType)
    return result ? { ...result, folderId: '' } : null
  }
}

// List all bidang subfolders in the parent Drive folder
export async function listBidangFolders(): Promise<Array<{ id: string; name: string; webViewLink?: string }>> {
  try {
    const clientInfo = await getUploadDriveClient()
    if (!clientInfo) return []

    const { drive, folderId, authType } = clientInfo
    const isSharedDrive = authType === 'service_account'

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      includeItemsFromAllDrives: isSharedDrive,
      supportsAllDrives: isSharedDrive,
      corpora: isSharedDrive ? 'allDrives' : 'user',
      pageSize: 100,
    })

    return (response.data.files || []).map((f) => ({
      id: f.id || '',
      name: f.name || '',
      webViewLink: f.webViewLink || undefined,
    }))
  } catch (error: any) {
    console.error('Error listing bidang folders:', error?.message || error)
    return []
  }
}

// Delete a file from Google Drive
export async function deleteFromDrive(fileId: string): Promise<boolean> {
  try {
    const clientInfo = await getUploadDriveClient()
    if (!clientInfo) return false

    const { drive, authType } = clientInfo
    const isSharedDrive = authType === 'service_account'

    await drive.files.delete({ fileId, supportsAllDrives: isSharedDrive })
    return true
  } catch (error: any) {
    console.error('Error deleting from Google Drive:', error?.message || error)
    return false
  }
}

// List files in the configured folder
export async function listDriveFiles(maxResults: number = 10): Promise<any[] | null> {
  try {
    const clientInfo = await getUploadDriveClient()
    if (!clientInfo) return null

    const { drive, folderId, authType } = clientInfo
    const isSharedDrive = authType === 'service_account'

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, webViewLink, createdTime, size)',
      orderBy: 'createdTime desc',
      includeItemsFromAllDrives: isSharedDrive,
      supportsAllDrives: isSharedDrive,
      corpora: isSharedDrive ? 'allDrives' : 'user',
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
  authType?: 'oauth2' | 'service_account' | 'none'
  oauthConfigured?: boolean
  error?: DriveError
  message: string
}> {
  try {
    // Check if OAuth2 is configured (preferred for My Drive)
    const oauthConfig = await getOAuthDriveConfig()
    const oauthConfigured = !!oauthConfig

    const config = await getDriveConfig()
    if (!config && !oauthConfig) {
      return {
        configured: false,
        connected: false,
        authType: 'none',
        oauthConfigured: false,
        message: 'Google Drive belum dikonfigurasi. Silakan atur Service Account Email, Private Key, dan Folder ID, atau hubungkan akun Google Drive Anda.',
      }
    }

    try {
      // Try OAuth2 connection first
      if (oauthConfig) {
        try {
          const drive = createOAuthDriveClient(oauthConfig)
          const folderResponse = await drive.files.get({
            fileId: oauthConfig.folderId,
            fields: 'id, name',
          })

          const files = await listDriveFiles(10)

          return {
            configured: true,
            connected: true,
            folder: { name: folderResponse.data.name || '', id: folderResponse.data.id || '' },
            files: files || [],
            canUpload: true, // OAuth2 always has upload capability (user's quota)
            authType: 'oauth2',
            oauthConfigured: true,
            message: 'Google Drive terhubung via Akun Google (OAuth2). Upload file akan menggunakan kuota penyimpanan akun Google Anda.',
          }
        } catch (oauthError: any) {
          console.warn('OAuth2 Drive test failed:', oauthError?.message)
          // Fall through to Service Account test
        }
      }

      // Service Account connection test
      const folderInfo = await getFolderInfo()
      const files = await listDriveFiles(10)

      // Check if folder is in a Shared Drive or if delegation is configured
      let canUpload = true
      let uploadWarning: string | undefined

      if (!folderInfo.driveId && !config!.delegateEmail) {
        // Folder is in My Drive and no delegation configured
        canUpload = false
        uploadWarning = 'Folder ini berada di "My Drive" (Drive Pribadi), bukan Shared Drive. Upload file oleh Service Account akan gagal karena tidak memiliki kuota penyimpanan. Solusi: Hubungkan akun Google Drive Anda di bagian "Akses Drive (OAuth2)" di atas.'
      } else if (config!.delegateEmail && config!.delegateEmail.includes('@gmail.com')) {
        // Gmail delegation - NOT supported
        canUpload = false
        uploadWarning = `Domain-wide delegation ke akun Gmail (${config!.delegateEmail}) TIDAK didukung. Service Account tidak dapat mengimpersonasi akun Gmail. Solusi: Hubungkan akun Google Drive Anda melalui OAuth2 di bagian "Akses Drive via Akun Google (OAuth2)" di atas.`
      }

      return {
        configured: true,
        connected: true,
        folder: { name: folderInfo.name, id: folderInfo.id },
        files: files || [],
        canUpload,
        uploadWarning,
        authType: 'service_account',
        oauthConfigured: false,
        message: 'Google Drive terhubung via Service Account.',
      }
    } catch (error: any) {
      const driveError = parseDriveError(error)
      return {
        configured: true,
        connected: false,
        authType: 'service_account',
        oauthConfigured,
        error: driveError,
        message: driveError.message,
      }
    }
  } catch (error: any) {
    return {
      configured: false,
      connected: false,
      authType: 'none',
      oauthConfigured: false,
      error: parseDriveError(error),
      message: `Error: ${error.message || 'Koneksi gagal'}`,
    }
  }
}

// Generate OAuth2 authorization URL for Google Drive access
export function generateDriveOAuthUrl(clientId: string, redirectUri: string): string {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    '', // We don't need client secret for generating auth URL
    redirectUri,
  )

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
    ],
    prompt: 'consent', // Force consent to get refresh token
    include_granted_scopes: true,
  })

  return url
}

// Exchange OAuth2 authorization code for tokens (including refresh token)
export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string; accessToken: string }> {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  )

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.refresh_token) {
    throw new Error('Tidak mendapatkan refresh token. Pastikan Anda menyetujui akses (consent) saat login. Coba lagi.')
  }

  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token || '',
  }
}

// Test upload using OAuth2 credentials
export async function testOAuthUpload(): Promise<{ success: boolean; message: string }> {
  try {
    const oauthConfig = await getOAuthDriveConfig()
    if (!oauthConfig) {
      return { success: false, message: 'OAuth2 Drive belum dikonfigurasi' }
    }

    const drive = createOAuthDriveClient(oauthConfig)

    // Create a test file
    const testContent = `SIDATA BKAD Test Upload via OAuth2 - ${new Date().toISOString()}`
    const testBuffer = Buffer.from(testContent, 'utf-8')
    const readableStream = Readable.from(testBuffer)

    const response = await drive.files.create({
      requestBody: {
        name: `test_oauth_${Date.now()}.txt`,
        parents: [oauthConfig.folderId],
      },
      media: {
        mimeType: 'text/plain',
        body: readableStream,
      },
      fields: 'id, webViewLink',
    })

    if (response.data.id) {
      // Clean up the test file
      try {
        await drive.files.delete({ fileId: response.data.id })
      } catch {}
      return { success: true, message: 'Upload ke Google Drive berhasil via OAuth2! File test dihapus otomatis.' }
    }

    return { success: false, message: 'Upload gagal - tidak ada file ID yang dikembalikan' }
  } catch (error: any) {
    return { success: false, message: `Upload gagal: ${error?.message || 'Unknown error'}` }
  }
}

// Create a Shared Drive and folder for file uploads (legacy - kept for compatibility)
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
