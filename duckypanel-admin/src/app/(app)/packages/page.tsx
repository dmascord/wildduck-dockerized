'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { apiGet, apiPost } from '@/lib/api'

interface PackageItem {
  _id?: string
  name: string
  quota?: number
  maxSend?: number
  maxReceive?: number
  maxForward?: number
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    apiGet('/packages')
      .then((data) => setPackages(data || []))
      .catch((err) => setError(err.message || 'Failed to load packages'))
  }

  useEffect(() => {
    load()
  }, [])

  async function createPackage() {
    const name = window.prompt('Package name')
    if (!name) return
    const quota = Number(window.prompt('Quota in bytes (0 for unlimited)') || 0)
    const maxSend = Number(window.prompt('Max send (0 for unlimited)') || 0)
    const maxReceive = Number(window.prompt('Max receive (0 for unlimited)') || 0)
    const maxForward = Number(window.prompt('Max forward (0 for unlimited)') || 0)
    try {
      await apiPost('/packages', { name, quota, maxSend, maxReceive, maxForward })
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create package')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Packages</h3>
          <p className="text-sm text-[#6c5c4f]">Quota and limit templates for users.</p>
        </div>
        <button className="btn btn-primary" onClick={createPackage}>
          Create package
        </button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid gap-3">
        {packages.map((pack) => (
          <div key={pack._id || pack.name} className="card p-4">
            <div className="font-medium">{pack.name}</div>
            <div className="text-xs text-[#6c5c4f]">
              quota: {pack.quota || 0} · send: {pack.maxSend || 0} · receive: {pack.maxReceive || 0} · forward: {pack.maxForward || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
