import { mkdir, writeFile, stat, readFile } from 'fs/promises'
import path from 'path'

// Get a writable directory for file uploads
// Tries process.cwd()/upload first, falls back to /tmp/sidata-uploads if read-only
export async function getWritableDir(subdir?: string): Promise<string> {
  // Try the project upload directory first
  const primaryDir = path.join(process.cwd(), 'upload', subdir || '')
  
  try {
    await mkdir(primaryDir, { recursive: true })
    // Test if we can actually write
    const testFile = path.join(primaryDir, '.write-test')
    await writeFile(testFile, 'test')
    const { unlink } = await import('fs/promises')
    await unlink(testFile)
    return primaryDir
  } catch {
    // Primary dir not writable, use /tmp
    const tmpDir = path.join('/tmp', 'sidata-uploads', subdir || '')
    await mkdir(tmpDir, { recursive: true })
    return tmpDir
  }
}

// Get the base upload directory for resolving file paths
export function getUploadBaseDir(): string {
  return path.join(process.cwd(), 'upload')
}

// Get the tmp upload directory
export function getTmpUploadDir(): string {
  return path.join('/tmp', 'sidata-uploads')
}

// Resolve a file path to an actual filesystem path
// Checks both primary and tmp directories
export async function resolveFilePath(relativePath: string): Promise<string | null> {
  // Normalize the path
  const normalized = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '')
  
  // Check primary location first
  const primaryPath = path.join(process.cwd(), normalized)
  try {
    await stat(primaryPath)
    return primaryPath
  } catch {
    // Not in primary location
  }
  
  // Check tmp location
  const tmpPath = path.join('/tmp', 'sidata-uploads', path.basename(normalized))
  try {
    await stat(tmpPath)
    return tmpPath
  } catch {
    // Not in tmp location either
  }
  
  // Check tmp with full subpath
  const tmpSubPath = path.join('/tmp', 'sidata-uploads', normalized.replace(/^\/?upload\/?/, ''))
  try {
    await stat(tmpSubPath)
    return tmpSubPath
  } catch {
    return null
  }
}

// Save a file to the upload directory (handles read-only filesystem)
export async function saveUploadedFile(
  buffer: Buffer,
  filename: string,
  subdir?: string
): Promise<{ filePath: string; accessPath: string }> {
  const dir = await getWritableDir(subdir)
  const fullPath = path.join(dir, filename)
  await writeFile(fullPath, buffer)
  
  // Determine the access path for the API
  // Always use /api/file?path=/upload/... format for consistency
  const accessPath = `/api/file?path=/upload/${subdir ? subdir + '/' : ''}${filename}`
  
  return { filePath: fullPath, accessPath }
}

// Read a file from the upload directory
export async function readUploadedFile(relativePath: string): Promise<Buffer | null> {
  const resolvedPath = await resolveFilePath(relativePath)
  if (!resolvedPath) return null
  
  try {
    return await readFile(resolvedPath)
  } catch {
    return null
  }
}
