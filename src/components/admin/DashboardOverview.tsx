'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  FileText,
  ClipboardList,
  TrendingUp,
  Plus,
  BarChart3,
  Activity,
  Loader2,
  ArrowUpRight,
  Clock,
  UserCircle,
  AlertTriangle,
  CalendarClock,
  HandMetal,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface StatsData {
  totalASN: number
  activeASN: number
  totalForms: number
  activeForms: number
  closedForms: number
  totalResponses: number
  formStats: Array<{
    id: string
    title: string
    isActive: boolean
    isClosed: boolean
    deadline: string | null
    responseCount: number
    totalASN: number
    completionRate: number
  }>
  bidangStats: Array<{
    bidang: string
    count: number
  }>
  statusStats: Array<{
    status: string
    count: number
  }>
  recentActivity: Array<{
    id: string
    action: string
    details: string | null
    ipAddress: string | null
    createdAt: string
    user: { name: string; nip: string }
  }>
  unrespondedPerForm: Array<{
    formId: string
    formTitle: string
    unrespondedCount: number
    unrespondedASN: Array<{ id: string; name: string; nip: string; bidang: string | null }>
  }>
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return `${diffSeconds} detik lalu`
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 30) return `${diffDays} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTimeRemaining(deadline: string): { text: string; urgency: 'overdue' | 'critical' | 'warning' | 'safe' } {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffMs < 0) return { text: 'Sudah lewat', urgency: 'overdue' }
  if (diffHours < 24) {
    if (diffHours < 1) return { text: `${diffMinutes} menit lagi`, urgency: 'critical' }
    return { text: `${diffHours} jam lagi`, urgency: 'critical' }
  }
  if (diffDays <= 3) return { text: `${diffDays} hari lagi`, urgency: 'warning' }
  return { text: `${diffDays} hari lagi`, urgency: 'safe' }
}

function getActivityIcon(action: string) {
  if (action.toLowerCase().includes('login')) return '🔐'
  if (action.toLowerCase().includes('form')) return '📋'
  if (action.toLowerCase().includes('response') || action.toLowerCase().includes('isi'))
    return '✅'
  if (action.toLowerCase().includes('user') || action.toLowerCase().includes('asn'))
    return '👤'
  if (action.toLowerCase().includes('announcement') || action.toLowerCase().includes('pengumuman'))
    return '📢'
  return '📌'
}

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-border px-3 py-2 text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value}
            {entry.name?.toLowerCase().includes('rate') || entry.name?.toLowerCase().includes('tingkat')
              ? '%'
              : ''}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Custom label for pie chart - shows both name and percentage
const RADIAN = Math.PI / 180
function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function DashboardOverview() {
  const { setCurrentView } = useAppStore()
  const { data: session } = useSession()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    fetchStats()
  }, [])

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Compute overall completion rate
  const overallCompletionRate =
    stats && stats.totalASN > 0 && stats.totalForms > 0
      ? Math.round(
          (stats.formStats.reduce((sum, f) => sum + f.completionRate, 0) /
            stats.formStats.length) *
            100
        ) / 100
      : 0

  // Prepare bar chart data: completion rate per form
  const barChartData =
    stats?.formStats.map((f) => ({
      name: f.title.length > 18 ? f.title.substring(0, 18) + '…' : f.title,
      Tingkat: f.completionRate,
      Respon: f.responseCount,
    })) || []

  // Prepare pie chart data: ASN per bidang
  const pieChartData =
    stats?.bidangStats.map((b) => ({
      name: b.bidang,
      value: b.count,
    })) || []

  // Prepare area chart data
  const areaChartData = generateTimeSeriesData(stats?.recentActivity || [])

  // Get PNS and PPPK counts from statusStats
  const pnsCount = stats?.statusStats.find(s => s.status === 'PNS')?.count || 0
  const pppkCount = stats?.statusStats.find(s => s.status === 'PPPK')?.count || 0
  const totalStatusASN = pnsCount + pppkCount
  const pnsPercentage = totalStatusASN > 0 ? Math.round((pnsCount / totalStatusASN) * 100) : 0
  const pppkPercentage = totalStatusASN > 0 ? 100 - pnsPercentage : 0

  // Get forms with upcoming deadlines (within 3 days or overdue)
  const deadlineForms = stats?.formStats
    .filter(f => f.deadline && !f.isClosed)
    .map(f => ({
      ...f,
      deadline: f.deadline!,
      timeRemaining: getTimeRemaining(f.deadline!),
    }))
    .filter(f => f.timeRemaining.urgency !== 'safe')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) || []

  // Get top 5 forms with most unresponded
  const topUnresponded = [...(stats?.unrespondedPerForm || [])]
    .sort((a, b) => b.unrespondedCount - a.unrespondedCount)
    .slice(0, 5)

  // Admin name from session
  const adminName = session?.user?.name || 'Administrator'

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  // Format current date
  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Memuat data dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Greeting Card ───────────────────────────────────────────────── */}
      <Card className="border-0 bg-gradient-to-r from-[oklch(0.35_0.08_250)] via-[oklch(0.30_0.07_250)] to-[oklch(0.28_0.06_160)] text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white rounded-full translate-y-1/2" />
        </div>
        <CardContent className="p-5 sm:p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span className="text-sm text-white/70 font-medium">{getGreeting()}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">
                Selamat Datang, {adminName}!
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Pantau dan kelola data ASN dengan efisien
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-white/90">{formattedDate}</p>
              <p className="text-2xl font-bold text-white/80 tabular-nums">{formattedTime}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total ASN"
          value={stats?.totalASN || 0}
          subtitle={`${stats?.activeASN || 0} aktif`}
          icon={Users}
          color="blue"
          trend={`${stats?.activeASN || 0} Aktif`}
          trendUp={true}
        />
        <StatCard
          title="Form Aktif"
          value={stats?.activeForms || 0}
          subtitle={`${stats?.totalForms || 0} total`}
          icon={FileText}
          color="green"
          trend={`${stats?.closedForms || 0} Ditutup`}
          trendUp={false}
        />
        <StatCard
          title="Total Respon"
          value={stats?.totalResponses || 0}
          subtitle="semua form"
          icon={ClipboardList}
          color="amber"
          trend="Masuk"
          trendUp={true}
        />
        <StatCard
          title="Tingkat Pengisian"
          value={`${overallCompletionRate}%`}
          subtitle="rata-rata"
          icon={TrendingUp}
          color="violet"
          trend={overallCompletionRate > 50 ? 'Baik' : 'Perlu Perhatian'}
          trendUp={overallCompletionRate > 50}
        />
      </div>

      {/* ─── ASN Status Distribution + Form Deadline Warnings ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ASN Status Distribution Card */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Distribusi Status ASN</CardTitle>
                <CardDescription className="text-xs">PNS vs PPPK</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-4">
            {totalStatusASN === 0 ? (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                Belum ada data status
              </div>
            ) : (
              <>
                {/* PNS Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-blue-500" />
                      <span className="text-sm font-medium">PNS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-700">{pnsCount}</span>
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                        {pnsPercentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-3 bg-blue-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${pnsPercentage}%` }}
                    />
                  </div>
                </div>

                {/* PPPK Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                      <span className="text-sm font-medium">PPPK</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-700">{pppkCount}</span>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100">
                        {pppkPercentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-3 bg-emerald-50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${pppkPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Stacked combined bar */}
                <div className="pt-2">
                  <p className="text-[10px] text-muted-foreground mb-1.5">Rasio keseluruhan</p>
                  <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${pnsPercentage}%` }}
                    >
                      {pnsPercentage > 15 && (
                        <span className="text-[9px] font-bold text-white">PNS</span>
                      )}
                    </div>
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${pppkPercentage}%` }}
                    >
                      {pppkPercentage > 15 && (
                        <span className="text-[9px] font-bold text-white">PPPK</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">Total: {totalStatusASN} ASN</span>
                    <span className="text-[10px] text-muted-foreground">
                      {stats?.statusStats.filter(s => s.status !== 'PNS' && s.status !== 'PPPK').reduce((sum, s) => sum + s.count, 0) > 0 && (
                        <>+{stats.statusStats.filter(s => s.status !== 'PNS' && s.status !== 'PPPK').reduce((sum, s) => sum + s.count, 0)} status lain</>
                      )}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Form Deadline Warnings Card */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Peringatan Deadline Form</CardTitle>
                  <CardDescription className="text-xs">Form yang akan segera berakhir</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => setCurrentView('admin-forms')}
              >
                Lihat Detail
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {deadlineForms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <CalendarClock className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Tidak ada form yang mendekati deadline</p>
                <p className="text-[10px] mt-0.5">Semua form dalam batas waktu aman</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {deadlineForms.map((form) => {
                    const urgencyColors = {
                      overdue: {
                        bg: 'bg-red-50 border-red-200',
                        badge: 'bg-red-100 text-red-800 border-red-200',
                        bar: 'bg-red-500',
                        icon: 'text-red-500',
                      },
                      critical: {
                        bg: 'bg-amber-50 border-amber-200',
                        badge: 'bg-amber-100 text-amber-800 border-amber-200',
                        bar: 'bg-amber-500',
                        icon: 'text-amber-500',
                      },
                      warning: {
                        bg: 'bg-yellow-50 border-yellow-200',
                        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        bar: 'bg-yellow-500',
                        icon: 'text-yellow-600',
                      },
                      safe: {
                        bg: 'bg-green-50 border-green-200',
                        badge: 'bg-green-100 text-green-800 border-green-200',
                        bar: 'bg-green-500',
                        icon: 'text-green-500',
                      },
                    }
                    const uc = urgencyColors[form.timeRemaining.urgency]

                    return (
                      <div
                        key={form.id}
                        className={`rounded-lg border p-3 ${uc.bg} transition-colors`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${uc.icon}`} />
                              <p className="text-sm font-semibold text-foreground truncate">
                                {form.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>Deadline: {new Date(form.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <span>·</span>
                              <span>Tingkat: {form.completionRate}%</span>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${uc.badge}`}>
                            {form.timeRemaining.text}
                          </Badge>
                        </div>
                        <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${uc.bar}`}
                            style={{ width: `${Math.min(form.completionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart - Completion per form */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Tingkat Pengisian per Form</CardTitle>
                <CardDescription className="text-xs">Persentase ASN yang telah mengisi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {barChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Belum ada data form
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 220)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'oklch(0.50 0.03 250)' }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'oklch(0.50 0.03 250)' }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="Tingkat"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                    name="Tingkat Pengisian"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - ASN per Bidang (Improved) */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">ASN per Bidang</CardTitle>
                <CardDescription className="text-xs">Distribusi ASN berdasarkan bidang</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {pieChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                Belum ada data bidang
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    strokeWidth={2}
                    stroke="white"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value: string, entry: any) => {
                      const item = pieChartData.find(d => d.name === value)
                      return (
                        <span className="text-muted-foreground">
                          {value} <span className="text-[10px] font-medium text-foreground/70">({item?.value || 0} orang)</span>
                        </span>
                      )
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} orang`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Belum Mengisi + Area Chart ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Belum Mengisi Quick View */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <HandMetal className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Belum Mengisi</CardTitle>
                  <CardDescription className="text-xs">ASN yang belum mengisi form</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {topUnresponded.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <HandMetal className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Semua form sudah terisi</p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-1.5">
                  {topUnresponded.map((item, index) => (
                    <button
                      key={item.formId}
                      className="w-full text-left rounded-lg border border-border/50 p-2.5 hover:bg-muted/50 transition-colors group"
                      onClick={() => {
                        setCurrentView('admin-responses')
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {index + 1}. {item.formTitle}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-red-50 text-red-700 border-red-200 shrink-0"
                        >
                          {item.unrespondedCount} ASN
                        </Badge>
                      </div>
                      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                        {stats && stats.totalASN > 0 && (
                          <div
                            className="h-full bg-red-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((item.unrespondedCount / stats.totalASN) * 100, 100)}%` }}
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {item.unrespondedCount} ASN belum mengisi
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Area Chart - Responses over time */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Aktivitas Respon</CardTitle>
                <CardDescription className="text-xs">Tren pengisian form dari waktu ke waktu</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {areaChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Belum ada data aktivitas
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={areaChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRespon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 220)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'oklch(0.50 0.03 250)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'oklch(0.50 0.03 250)' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Respon"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorRespon)"
                    name="Respon"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Quick actions + Recent activity ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick actions */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-2">
            <Button
              className="w-full justify-start gap-2"
              onClick={() => setCurrentView('admin-form-create')}
            >
              <Plus className="w-4 h-4" />
              Buat Form Baru
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setCurrentView('admin-reports')}
            >
              <BarChart3 className="w-4 h-4" />
              Lihat Laporan
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setCurrentView('admin-asn')}
            >
              <Users className="w-4 h-4" />
              Kelola Data ASN
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setCurrentView('admin-responses')}
            >
              <ClipboardList className="w-4 h-4" />
              Lihat Hasil Pengisian
            </Button>
          </CardContent>
        </Card>

        {/* Recent activity (Improved) */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <CardTitle className="text-sm font-semibold">Aktivitas Terkini</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {stats?.recentActivity?.length || 0}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => setCurrentView('admin-activity-logs')}
                >
                  Lihat Semua
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>Belum ada aktivitas</p>
              </div>
            ) : (
              <ScrollArea className="max-h-72">
                <div className="space-y-1">
                  {stats.recentActivity.slice(0, 10).map((activity, index) => (
                    <div key={activity.id}>
                      {index > 0 && <Separator className="my-1" />}
                      <div className="flex items-start gap-2.5 py-1.5 px-1 rounded-md hover:bg-muted/30 transition-colors">
                        <span className="text-sm shrink-0 mt-0.5">
                          {getActivityIcon(activity.action)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground leading-snug truncate">
                            {activity.action}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <UserCircle className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                            <span className="text-[10px] text-muted-foreground truncate">
                              {activity.user.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">·</span>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0" title={formatDateTime(activity.createdAt)}>
                              {formatTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Stat Card Component (Enhanced with gradient and trend) ──────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendUp,
}: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'violet'
  trend: string
  trendUp: boolean
}) {
  const colorMap = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      valueText: 'text-blue-700',
      border: 'border-blue-100/60',
      trendText: trendUp ? 'text-blue-600' : 'text-blue-500',
      gradientAccent: 'from-blue-500/10',
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600',
      valueText: 'text-emerald-700',
      border: 'border-emerald-100/60',
      trendText: trendUp ? 'text-emerald-600' : 'text-emerald-500',
      gradientAccent: 'from-emerald-500/10',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      valueText: 'text-amber-700',
      border: 'border-amber-100/60',
      trendText: trendUp ? 'text-amber-600' : 'text-amber-500',
      gradientAccent: 'from-amber-500/10',
    },
    violet: {
      bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-600',
      valueText: 'text-violet-700',
      border: 'border-violet-100/60',
      trendText: trendUp ? 'text-violet-600' : 'text-violet-500',
      gradientAccent: 'from-violet-500/10',
    },
  }

  const c = colorMap[color]

  return (
    <Card className={`border ${c.border} ${c.bg} transition-shadow hover:shadow-md`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${c.valueText} leading-tight`}>
              {value}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
              <span className="text-[10px] text-muted-foreground/40">·</span>
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${c.trendText}`}>
                {trendUp ? (
                  <TrendingUp className="w-2.5 h-2.5" />
                ) : (
                  <ArrowUpRight className="w-2.5 h-2.5 rotate-45" />
                )}
                {trend}
              </span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${c.iconText}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Time Series Generator ──────────────────────────────────────────────────

function generateTimeSeriesData(
  activities: Array<{ createdAt: string; action: string }>
): Array<{ name: string; Respon: number }> {
  if (activities.length === 0) return []

  // Group activities by date
  const grouped: Record<string, number> = {}
  const now = new Date()

  // Initialize last 7 days with 0
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const key = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    grouped[key] = 0
  }

  // Count responses per day
  for (const activity of activities) {
    const date = new Date(activity.createdAt)
    const key = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    if (key in grouped) {
      grouped[key]++
    }
  }

  return Object.entries(grouped).map(([name, Respon]) => ({ name, Respon }))
}
