import { google } from 'googleapis'
import { db } from './db'

// Google Drive configuration interface
interface DriveConfig {
  clientEmail: string
  privateKey: string
  folderId: string
}

// Get Google Drive configuration from database settings
export async function getDriveConfig(): Promise<DriveConfig | null> {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: ['googleDriveClientEmail', 'googleDrivePrivateKey', 'googleDriveFolderId'],
        },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => (settingsMap[s.key] = s.value))

    const clientEmail = settingsMap.googleDriveClientEmail
    const privateKey = settingsMap.googleDrivePrivateKey?.replace(/\\n/g, '\n')
    const folderId = settingsMap.googleDriveFolderId

    if (!clientEmail || !privateKey || !folderId) {
      return null
    }

    return { clientEmail, privateKey, folderId }
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
function createDriveClient(config: DriveConfig) {
  const auth = new google.auth.JWT(
    config.clientEmail,
    undefined,
    config.privateKey,
    ['https://www.googleapis.com/auth/drive.file']
  )

  return google.drive({ version: 'v3', auth })
}

// Upload a file to Google Drive
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

    // Create a unique filename with timestamp to avoid conflicts
    const timestamp = Date.now()
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''
    const baseName = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName
    const uniqueFileName = `${baseName}_${timestamp}${ext}`

    const response = await drive.files.create({
      requestBody: {
        name: uniqueFileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: fileBuffer,
      },
      fields: 'id, webViewLink',
    })

    if (!response.data.id || !response.data.webViewLink) {
      console.error('Drive upload failed: no file ID returned')
      return null
    }

    // Make the file accessible to anyone with the link
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })

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
    await drive.files.delete({ fileId })
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
    })

    return response.data.files || []
  } catch (error: any) {
    console.error('Error listing Drive files:', error?.message || error)
    return null
  }
}

// Get folder info
export async function getFolderInfo(): Promise<{ name: string; id: string } | null> {
  try {
    const config = await getDriveConfig()
    if (!config) return null

    const drive = createDriveClient(config)
    const response = await drive.files.get({
      fileId: config.folderId,
      fields: 'id, name',
    })

    return response.data as { name: string; id: string }
  } catch (error: any) {
    console.error('Error getting folder info:', error?.message || error)
    return null
  }
}
