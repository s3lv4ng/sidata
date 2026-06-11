import { NextRequest, NextResponse } from 'next/server'
import { resolveFilePath } from '@/lib/upload-utils'
import path from 'path'

// GET /api/file?path=/upload/brand/logo.png
export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path')

    if (!filePath) {
      return NextResponse.json(
        { error: 'Path parameter required' },
        { status: 400 }
      )
    }

    // Decode URL
    let decodedPath = filePath

    try {
      decodedPath = decodeURIComponent(filePath)
    } catch {
      decodedPath = filePath
    }

    /**
     * Normalize path:
     * Windows:
     *   \upload\brand\logo.png
     *
     * Linux:
     *   /upload/brand/logo.png
     *
     * Menjadi:
     *   /upload/brand/logo.png
     */
    const normalizedPath = path
      .normalize(decodedPath)
      .replace(/\\/g, '/')

    // Cegah path traversal
    if (
      normalizedPath.includes('../') ||
      normalizedPath.includes('..\\')
    ) {
      console.warn(
        `[File API] Rejected traversal path: ${normalizedPath}`
      )

      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      )
    }

    // Hanya izinkan folder upload
    const isUploadPath =
      normalizedPath.startsWith('/upload/') ||
      normalizedPath.startsWith('upload/')

    if (!isUploadPath) {
      console.warn(
        `[File API] Rejected invalid path: ${normalizedPath}`
      )

      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 403 }
      )
    }

    // Resolve file
    const fullPath = await resolveFilePath(normalizedPath)

    if (!fullPath) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const { readFile } = await import('fs/promises')

    const fileBuffer = await readFile(fullPath)

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
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
    }

    const contentType =
      contentTypes[ext] || 'application/octet-stream'

    const download =
      request.nextUrl.searchParams.get('download') === 'true'

    const disposition = download
      ? `attachment; filename="${path.basename(fullPath)}"`
      : `inline; filename="${path.basename(fullPath)}"`

    const isImage = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.svg',
      '.ico',
    ].includes(ext)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': isImage
          ? 'public, max-age=86400, immutable'
          : 'public, max-age=86400',
        ...(isImage
          ? {
              'Access-Control-Allow-Origin': '*',
            }
          : {}),
      },
    })
  } catch (error: any) {
    console.error('[File API] Error serving file:', error)

    return NextResponse.json(
      {
        error: error?.message || 'Internal server error',
      },
      {
        status: 500,
      }
    )
  }
}