'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  Activity,
  AtSign,
  Box,
  FileStack,
  KeyRound,
  Layers,
  Mail,
  Shield,
  Users
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/domains', label: 'Domains', icon: Layers },
  { href: '/accounts', label: 'Accounts', icon: Mail },
  { href: '/forwarders', label: 'Forwarders', icon: AtSign },
  { href: '/filters', label: 'Filters', icon: Shield },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/packages', label: 'Packages', icon: Box },
  { href: '/apikeys', label: 'API Keys', icon: KeyRound },
  { href: '/system', label: 'System', icon: FileStack }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="glass p-6 flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#6c5c4f]">WildDuck</p>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
          Admin Studio
        </h1>
        <p className="text-sm text-[#6c5c4f] mt-2">Control plane for domains, users, and mailflow.</p>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-2xl transition',
                active ? 'bg-[#151312] text-white shadow-lg' : 'hover:bg-white'
              )}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto text-xs text-[#6c5c4f]">
        <p>Quick tip</p>
        <p className="mt-2">Use the System tab to run auto-archive jobs on demand.</p>
      </div>
    </aside>
  )
}
