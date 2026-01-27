'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/Topbar'
import { apiGet, apiPost } from '@/lib/api'

interface Domain {
  domain: string
  aliases?: { domain: string; dkim?: boolean }[]
  dkim?: boolean
  owner?: { id: string; username: string }
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    apiGet('/domains')
      .then((data) => setDomains(data || []))
      .catch((err) => setError(err.message || 'Failed to load domains'))
  }

  useEffect(() => {
    load()
  }, [])

  async function addDomain() {
    if (!newDomain) return
    setLoading(true)
    setError(null)
    try {
      await apiPost('/domains', { domain: newDomain })
      setNewDomain('')
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to add domain')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Domains</h3>
            <p className="text-sm text-[#6c5c4f]">Manage DKIM, aliases, and DNS health.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input"
              placeholder="example.com"
              value={newDomain}
              onChange={(event) => setNewDomain(event.target.value)}
            />
            <button className="btn btn-primary" onClick={addDomain} disabled={loading}>
              {loading ? 'Adding…' : 'Add domain'}
            </button>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
      <div className="grid gap-4">
        {domains.map((domain) => (
          <Link key={domain.domain} href={`/domains/${domain.domain}`} className="card p-6 hover:shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold">{domain.domain}</h4>
                <p className="text-sm text-[#6c5c4f]">
                  {domain.aliases?.length || 0} aliases · DKIM {domain.dkim ? 'enabled' : 'missing'}
                </p>
              </div>
              {domain.owner && <div className="badge">Owner: {domain.owner.username}</div>}
            </div>
          </Link>
        ))}
        {domains.length === 0 && <div className="text-sm text-[#6c5c4f]">No domains yet.</div>}
      </div>
    </div>
  )
}
