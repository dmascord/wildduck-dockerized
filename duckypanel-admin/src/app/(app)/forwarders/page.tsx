'use client'

import { useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/Topbar'
import { apiGet, apiPost } from '@/lib/api'

interface Forwarder {
  id: string
  address: string
  targets?: string[]
}

export default function ForwardersPage() {
  const [domain, setDomain] = useState('')
  const [forwarders, setForwarders] = useState<Forwarder[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!domain) {
      setError('Enter a domain to list forwarders.')
      return
    }
    setError(null)
    try {
      const data = await apiGet(`/forwarders?domain=${encodeURIComponent(domain)}`)
      setForwarders(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load forwarders')
    }
  }

  async function createForwarder() {
    if (!domain) {
      setError('Enter a domain before creating a forwarder.')
      return
    }
    const address = window.prompt('Forwarder address (e.g. sales@domain)')
    if (!address) return
    const targets = window.prompt('Targets (comma separated)')
    if (!targets) return
    try {
      await apiPost('/forwarders', {
        address,
        targets: targets.split(',').map((t) => t.trim()),
        limits: { forward: 0 }
      })
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create forwarder')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Forwarders</h3>
            <p className="text-sm text-[#6c5c4f]">Route incoming mail to external targets.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input"
              placeholder="example.com"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            />
            <button className="btn btn-secondary" onClick={load}>Load</button>
            <button className="btn btn-primary" onClick={createForwarder}>Create</button>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
      <div className="grid gap-3">
        {forwarders.map((forwarder) => (
          <Link key={forwarder.id} href={`/forwarders/${forwarder.id}`} className="card p-4 hover:shadow-lg">
            <div className="font-medium">{forwarder.address}</div>
            {forwarder.targets?.length ? (
              <div className="text-xs text-[#6c5c4f] mt-2">Targets: {forwarder.targets.join(', ')}</div>
            ) : null}
          </Link>
        ))}
        {!forwarders.length && <div className="text-sm text-[#6c5c4f]">No forwarders loaded.</div>}
      </div>
    </div>
  )
}
