'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Legend,
  AreaChart,
  Area,
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

// Custom label for pie chart
const RADIAN = Math.PI / 180
function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
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
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
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

  // Prepare area chart data: responses over time (simulate from recentActivity if available)
  const areaChartData = generateTimeSeriesData(stats?.recentActivity || [])

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
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total ASN"
          value={stats?.totalASN || 0}
          subtitle={`${stats?.activeASN || 0} aktif`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Form Aktif"
          value={stats?.activeForms || 0}
          subtitle={`${stats?.totalForms || 0} total`}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Total Respon"
          value={stats?.totalResponses || 0}
          subtitle="semua form"
          icon={ClipboardList}
          color="amber"
        />
        <StatCard
          title="Tingkat Pengisian"
          value={`${overallCompletionRate}%`}
          subtitle="rata-rata"
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* Charts row */}
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

        {/* Pie Chart - ASN per bidang */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">ASN per Bidang</CardTitle>
                <CardDescription className="text-xs">Distribusi ASN</CardDescription>
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
                    formatter={(value: string) => (
                      <span className="text-muted-foreground">{value}</span>
                    )}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Area chart + Recent activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        {/* Quick actions + recent activity */}
        <div className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Aktivitas Terkini</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {stats?.recentActivity?.length || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>Belum ada aktivitas</p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-1">
                    {stats.recentActivity.slice(0, 10).map((activity, index) => (
                      <div key={activity.id}>
                        {index > 0 && <Separator className="my-1" />}
                        <div className="flex items-start gap-2.5 py-1.5 px-1">
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
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                {formatDateTime(activity.createdAt)}
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
    </div>
  )
}

// ─── Stat Card Component ────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'violet'
}) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      valueText: 'text-blue-700',
      border: 'border-blue-100/60',
    },
    green: {
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600',
      valueText: 'text-emerald-700',
      border: 'border-emerald-100/60',
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600',
      valueText: 'text-amber-700',
      border: 'border-amber-100/60',
    },
    violet: {
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-600',
      valueText: 'text-violet-700',
      border: 'border-violet-100/60',
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
            <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
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
