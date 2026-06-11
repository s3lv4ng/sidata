import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, generateDriveOAuthUrl } from '@/lib/google-drive'
import { db } from '@/lib/db'

// GET /api/drive/oauth - Generate OAuth2 authorization URL or handle callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const action = searchParams.get('action')

    // Handle OAuth2 callback - exchange code for tokens
    if (code) {
      try {
        // Get client credentials from settings
        const settings = await db.systemSetting.findMany({
          where: {
            key: {
              in: ['googleLoginClientId', 'googleLoginClientSecret'],
            },
          },
        })

        const settingsMap: Record<string, string> = {}
        settings.forEach((s) => (settingsMap[s.key] = s.value))

        const clientId = settingsMap.googleLoginClientId
        const clientSecret = settingsMap.googleLoginClientSecret

        if (!clientId || !clientSecret) {
          return NextResponse.redirect(
            new URL('/?drive_oauth_error=' + encodeURIComponent('Client ID dan Client Secret Google belum dikonfigurasi. Atur di Pengaturan Sistem → Login.'), request.url)
          )
        }

        // Build redirect URI (same as this endpoint)
        const baseUrl = process.env.NEXTAUTH_URL || 
          (request.headers.get('x-forwarded-host') 
            ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
            : request.headers.get('host') 
              ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
              : `http://localhost:3000`)

        const redirectUri = `${baseUrl}/api/drive/oauth`

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(clientId, clientSecret, code, redirectUri)

        // Store refresh token in database
        await db.systemSetting.upsert({
          where: { key: 'googleDriveRefreshToken' },
          update: { value: tokens.refreshToken },
          create: { key: 'googleDriveRefreshToken', value: tokens.refreshToken },
        })

        // Log activity
        try {
          const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } })
          if (adminUser) {
            await db.activityLog.create({
              data: {
                userId: adminUser.id,
                action: 'DRIVE_OAUTH_CONNECTED',
                details: 'Akun Google Drive berhasil dihubungkan untuk upload file',
              },
            })
          }
        } catch {}

        // Redirect back to the app with success message
        return NextResponse.redirect(
          new URL('/?drive_oauth_success=true', baseUrl)
        )
      } catch (error: any) {
        const baseUrl = process.env.NEXTAUTH_URL || 
          (request.headers.get('x-forwarded-host') 
            ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
            : request.headers.get('host') 
              ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
              : `http://localhost:3000`)

        return NextResponse.redirect(
          new URL('/?drive_oauth_error=' + encodeURIComponent(error?.message || 'Gagal menukar kode otorisasi'), baseUrl)
        )
      }
    }

    // Generate OAuth2 authorization URL
    if (action === 'authorize') {
      const settings = await db.systemSetting.findMany({
        where: {
          key: {
            in: ['googleLoginClientId', 'googleLoginClientSecret'],
          },
        },
      })

      const settingsMap: Record<string, string> = {}
      settings.forEach((s) => (settingsMap[s.key] = s.value))

      const clientId = settingsMap.googleLoginClientId

      if (!clientId) {
        return NextResponse.json(
          { error: 'Google Client ID belum dikonfigurasi. Atur di Pengaturan Sistem → Login.' },
          { status: 400 }
        )
      }

      // Build redirect URI
      const baseUrl = process.env.NEXTAUTH_URL || 
        (request.headers.get('x-forwarded-host') 
          ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
          : request.headers.get('host') 
            ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
            : `http://localhost:3000`)

      const redirectUri = `${baseUrl}/api/drive/oauth`
      const authUrl = generateDriveOAuthUrl(clientId, redirectUri)

      return NextResponse.json({ authUrl, redirectUri })
    }

    // Check OAuth2 status
    if (action === 'status') {
      const settings = await db.systemSetting.findMany({
        where: {
          key: {
            in: ['googleDriveRefreshToken', 'googleLoginClientId', 'googleLoginClientSecret'],
          },
        },
      })

      const settingsMap: Record<string, string> = {}
      settings.forEach((s) => (settingsMap[s.key] = s.value))

      return NextResponse.json({
        configured: !!(settingsMap.googleDriveRefreshToken && settingsMap.googleLoginClientId && settingsMap.googleLoginClientSecret),
        hasRefreshToken: !!settingsMap.googleDriveRefreshToken,
        hasClientId: !!settingsMap.googleLoginClientId,
        hasClientSecret: !!settingsMap.googleLoginClientSecret,
      })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error: any) {
    console.error('Drive OAuth error:', error)
    return NextResponse.json({ error: error.message || 'Gagal memproses OAuth' }, { status: 500 })
  }
}

// DELETE /api/drive/oauth - Disconnect OAuth2 (remove refresh token)
export async function DELETE() {
  try {
    await db.systemSetting.deleteMany({
      where: { key: 'googleDriveRefreshToken' },
    })

    return NextResponse.json({ success: true, message: 'Akun Google Drive berhasil diputus' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memutus akun' }, { status: 500 })
  }
}
