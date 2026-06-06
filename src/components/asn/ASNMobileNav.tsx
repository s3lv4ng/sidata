'use client'

import { Home, FileText, User } from 'lucide-react'

interface NavTab {
  label: string
  icon: React.ElementType
  active: boolean
}

interface ASNMobileNavProps {
  activeTab?: 'beranda' | 'formulir' | 'profil'
}

export default function ASNMobileNav({ activeTab = 'beranda' }: ASNMobileNavProps) {
  const tabs: NavTab[] = [
    { label: 'Beranda', icon: Home, active: activeTab === 'beranda' },
    { label: 'Formulir', icon: FileText, active: activeTab === 'formulir' },
    { label: 'Profil', icon: User, active: activeTab === 'profil' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-white/80 dark:bg-card/80 backdrop-blur-md shadow-[0_-1px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navigasi mobile"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.label}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-200 ${
                tab.active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={tab.active ? 'page' : undefined}
              aria-label={tab.label}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${tab.active ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-medium leading-tight ${tab.active ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
