'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const [nip, setNip] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const setCurrentView = useAppStore((s) => s.setCurrentView)

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
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <Card className="border-primary/10 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <div className="mx-auto mb-4 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150" />
                <div className="relative bg-white rounded-full p-3 shadow-lg border border-primary/10">
                  <img
                    src="/logo.svg"
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

            {/* Decorative divider */}
            <div className="flex items-center gap-2 pt-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <ShieldCheck className="w-4 h-4 text-primary/40" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
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
                  className="h-11 text-base"
                  autoComplete="username"
                />
              </div>

              {/* Password Input */}
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
                    className="h-11 text-base pr-10"
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

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={isLoading || !nip || !password}
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
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 BKAD Kabupaten Seruyan
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Badan Keuangan dan Aset Daerah
          </p>
        </footer>
      </div>
    </div>
  )
}
