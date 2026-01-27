'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { apiGet } from '@/lib/api'

export default function OverviewPage() {
  const [stats, setStats] = useState({ domains: 0, users: 0, packages: 0 })

  useEffect(() => {
    Promise.all([apiGet('/domains'), apiGet('/users'), apiGet('/packages')])
      .then(([domains, users, packages]) => {
        setStats({
          domains: Array.isArray(domains) ? domains.length : domains?.length || 0,
          users: Array.isArray(users) ? users.length : users?.length || 0,
          packages: Array.isArray(packages) ? packages.length : packages?.length || 0
        })
      })
      .catch(() => null)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6c5c4f]">Domains</p>
          <h3 className="text-3xl font-semibold mt-3 gradient-text">{stats.domains}</h3>
          <p className="text-sm text-[#6c5c4f] mt-2">Managed domains across the platform.</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6c5c4f]">Users</p>
          <h3 className="text-3xl font-semibold mt-3 gradient-text">{stats.users}</h3>
          <p className="text-sm text-[#6c5c4f] mt-2">API tenants with access to DuckyAPI.</p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6c5c4f]">Packages</p>
          <h3 className="text-3xl font-semibold mt-3 gradient-text">{stats.packages}</h3>
          <p className="text-sm text-[#6c5c4f] mt-2">Quota templates for accounts.</p>
        </div>
      </div>
      <div className="card p-6">
        <h3 className="text-xl font-semibold">Launchpad</h3>
        <p className="text-sm text-[#6c5c4f] mt-2">
          Start by adding domains, then create accounts and forwarders. Auto-archive controls live in the account
          details view.
        </p>
      </div>
    </div>
  )
}
