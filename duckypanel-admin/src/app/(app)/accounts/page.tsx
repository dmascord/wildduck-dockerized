'use client'

import { useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/Topbar'
import { apiGet, apiPost } from '@/lib/api'

interface AccountListItem {
  id: string
  name: string
  address: string
  aliases?: { id: string; address: string }[]
  disabled?: boolean
}

export default function AccountsPage() {
  const [domain, setDomain] = useState('')
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!domain) {
      setError('Enter a domain to list accounts.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(`/accounts?domain=${encodeURIComponent(domain)}`)
      setAccounts(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  async function createAccount() {
    if (!domain) {
      setError('Enter a domain before creating an account.')
      return
    }
    const address = window.prompt('Email address (user@domain)')
    if (!address) return
    const name = window.prompt('Display name (optional)') || ''
    const password = window.prompt('Password') || ''
    try {
      await apiPost('/accounts', { address, name, password, limits: {} })
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Accounts</h3>
            <p className="text-sm text-[#6c5c4f]">Filter by domain to manage mailboxes.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input"
              placeholder="example.com"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
            />
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              {loading ? 'Loading…' : 'Load'}
            </button>
            <button className="btn btn-primary" onClick={createAccount}>Create</button>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
      <div className="grid gap-4">
        {accounts.map((account) => (
          <Link key={account.id} href={`/accounts/${account.id}`} className="card p-6 hover:shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold">{account.address}</h4>
                <p className="text-sm text-[#6c5c4f]">
                  {account.aliases?.length || 0} aliases · {account.disabled ? 'Disabled' : 'Active'}
                </p>
              </div>
              {account.name && <div className="badge">{account.name}</div>}
            </div>
          </Link>
        ))}
        {!accounts.length && <div className="text-sm text-[#6c5c4f]">No accounts loaded.</div>}
      </div>
    </div>
  )
}
