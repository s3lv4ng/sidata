import { NextRequest, NextResponse } from 'next/server'
import { resolveFilePath } from '@/lib/upload-utils'
import path from 'path'

// GET /api/file?path=xxx - Serve an uploaded file
export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 })
    }

    // Decode URI component in case the path is URL-encoded
    let decodedPath = filePath
    try {
      decodedPath = decodeURIComponent(filePath)
    } catch {
      // If decoding fails, use the original path
    }

    // Security: normalize and validate the path
    const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '')

    // Only allow files from the upload directory
    if (!normalizedPath.startsWith('/upload/') && !normalizedPath.startsWith('upload/')) {
      console.warn(`[File API] Rejected invalid path: ${normalizedPath}`)
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    // Resolve file path (checks both primary and /tmp directories)
    const fullPath = await resolveFilePath(normalizedPath)

    if (!fullPath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Dynamic import to avoid issues
    const { readFile } = await import('fs/promises')
    const fileBuffer = await readFile(fullPath)

    // Determine content type from extension
    const ext = path.extname(fullPath).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    }

    const contentType = contentTypes[ext] || 'application/octet-stream'
    const download = request.nextUrl.searchParams.get('download')
    const disposition = download === 'true'
      ? `attachment; filename="${path.basename(fullPath)}"`
      : `inline; filename="${path.basename(fullPath)}"`

    // For images, set longer cache and add CORS headers
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': isImage ? 'public, max-age=86400, immutable' : 'public, max-age=86400',
        ...(isImage ? { 'Access-Control-Allow-Origin': '*' } : {}),
      },
    })
  } catch (error: any) {
    console.error('[File API] Error serving file:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
