'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { useAppBranding, useDynamicFavicon } from '@/hooks/use-app-branding'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShieldCheck, Loader2, Eye, EyeOff, Phone, Mail, Shield, UserCog, User } from 'lucide-react'
import { motion } from 'framer-motion'

interface LoginSettings {
  loginWithNip: boolean
  loginWithGoogle: boolean
  showPasswordLogin: boolean
}

export default function LoginForm() {
  const [nip, setNip] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const { logo } = useAppBranding()
  useDynamicFavicon()

  // Login settings from server
  const [loginSettings, setLoginSettings] = useState<LoginSettings>({
    loginWithNip: true,
    loginWithGoogle: false,
    showPasswordLogin: true,
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          setLoginSettings({
            loginWithNip: data.loginWithNip !== 'false',
            loginWithGoogle: data.loginWithGoogle === 'true',
            showPasswordLogin: data.showPasswordLogin !== 'false',
          })
        }
      } catch {
        // Use defaults
      }
    }
    fetchSettings()
  }, [])

  // Auto-detect role from NIP
  const detectedRole = nip.toLowerCase() === 'admin' ? 'admin' : nip.length >= 5 ? 'asn' : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        nip,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        // We need to get the session to determine the role
        const sessionRes = await fetch('/api/auth/session')
        const session = await sessionRes.json()

        if (session?.user) {
          const role = (session.user as any).role
          if (role === 'ADMIN') {
            setCurrentView('admin-dashboard')
          } else {
            setCurrentView('asn-home')
          }
        } else {
          setCurrentView('asn-home')
        }
      }
    } catch {
      setError('Terjadi kesalahan saat login. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch {
      setError('Gagal login dengan Google. Silakan coba lagi.')
      setIsLoading(false)
    }
  }

  const showNipLogin = loginSettings.loginWithNip
  const showGoogleLogin = loginSettings.loginWithGoogle
  const showPasswordField = loginSettings.showPasswordLogin && showNipLogin

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-gov-green/5">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e40af' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Decorative circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gov-green/5 blur-3xl" />

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-md px-4 sm:px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Government-style header banner */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-primary/80 uppercase">
            Pemerintah Kabupaten Seruyan
          </p>
          <h2 className="text-sm sm:text-base font-bold tracking-[0.15em] text-primary mt-1 uppercase">
            Badan Keuangan dan Aset Daerah
          </h2>

          {/* Decorative garuda-style ornament */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-primary/40" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <div className="w-2 h-2 rotate-45 bg-primary/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            </div>
            <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
        </motion.div>

        {/* Login Card with gradient border effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="rounded-xl p-[2px] bg-gradient-to-br from-primary/40 via-gov-green/30 to-primary/40">
            <Card className="border-0 shadow-2xl shadow-primary/10 bg-background">
              <CardHeader className="text-center pb-2">
                {/* Logo */}
                <div className="mx-auto mb-4 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150" />
                    <div className="relative bg-background rounded-full p-3 shadow-lg border border-primary/10">
                      <img
                        src={logo}
                        alt="Logo BKAD Kabupaten Seruyan"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                      />
                    </div>
                  </div>
                </div>

                <CardTitle className="text-xl sm:text-2xl font-bold text-primary">
                  Sistem Pengumpulan Data ASN
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-muted-foreground font-medium">
                  BKAD Kabupaten Seruyan
                </CardDescription>

                {/* Role indicator */}
                {detectedRole && showNipLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {detectedRole === 'admin' ? (
                        <>
                          <UserCog className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">Masuk sebagai Administrator</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-gov-green" />
                          <span className="text-xs font-medium text-gov-green">Masuk sebagai ASN</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Decorative divider */}
                <div className="flex items-center gap-2 pt-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <ShieldCheck className="w-4 h-4 text-primary/40" />
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                </div>
              </CardHeader>

              <CardContent>
                {/* Google Login Button - shown first if enabled */}
                {showGoogleLogin && (
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-11 text-base font-medium gap-3 border-border/60 hover:bg-muted/50"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      type="button"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Masuk dengan Google
                    </Button>

                    {showNipLogin && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground font-medium">atau</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                  </div>
                )}

                {/* NIP/Password Login Form */}
                {showNipLogin && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Error message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm flex items-start gap-2"
                      >
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                      </motion.div>
                    )}

                    {/* NIP Input */}
                    <div className="space-y-2">
                      <Label htmlFor="nip" className="text-sm font-medium">
                        NIP (Nomor Induk Pegawai)
                      </Label>
                      <Input
                        id="nip"
                        type="text"
                        placeholder="Masukkan NIP Anda"
                        value={nip}
                        onChange={(e) => setNip(e.target.value)}
                        required
                        disabled={isLoading}
                        className="h-11 text-base transition-all focus:ring-2 focus:ring-primary/20"
                        autoComplete="username"
                      />
                    </div>

                    {/* Password Input - can be hidden via settings */}
                    {showPasswordField && (
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Masukkan password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="h-11 text-base pr-10 transition-all focus:ring-2 focus:ring-primary/20"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Login Button */}
                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                      disabled={isLoading || !nip || (showPasswordField && !password)}
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Masuk</span>
                        </>
                      )}
                    </Button>

                    {/* Forgot password hint */}
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <Mail className="w-3 h-3" />
                        <span>Hubungi administrator jika lupa password</span>
                      </div>
                    </div>
                  </form>
                )}

                {/* No login methods available */}
                {!showNipLogin && !showGoogleLogin && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Metode login belum dikonfigurasi. Hubungi administrator.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* System info below the login card */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-3.5 h-3.5 text-primary/50" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">
              Sistem Informasi Data ASN (SIDATA)
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 text-primary/60">
            v2.0.0
          </Badge>
        </motion.div>

        {/* Footer */}
        <motion.footer
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BKAD Kabupaten Seruyan
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Badan Keuangan dan Aset Daerah
          </p>
        </motion.footer>
      </motion.div>
    </div>
  )
}
