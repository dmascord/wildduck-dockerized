'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, UserCircle } from 'lucide-react'
import { clearToken } from '@/lib/auth'
import { apiGet } from '@/lib/api'

export default function Topbar() {
  const router = useRouter()
  const [user, setUser] = useState<{ username?: string; roles?: string[] } | null>(null)

  useEffect(() => {
    apiGet('/users/me')
      .then((data) => setUser(data))
      .catch(() => setUser(null))
  }, [])

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#6c5c4f]">Console</p>
        <h2 className="text-2xl font-semibold">Operations Overview</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e2dbd0] bg-white">
          <UserCircle size={18} />
          <span className="text-sm font-medium">{user?.username || 'Loading'}</span>
          <span className="badge">{user?.roles?.includes('admin') ? 'Admin' : 'User'}</span>
        </div>
        <button
          className="btn"
          onClick={() => {
            clearToken()
            router.replace('/login')
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )
}
