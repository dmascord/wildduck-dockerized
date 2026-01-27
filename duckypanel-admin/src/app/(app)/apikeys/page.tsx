'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { apiDelete, apiGet, apiPost } from '@/lib/api'

interface ApiKey {
  _id?: string
  name: string
  created?: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [lastToken, setLastToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    apiGet('/apikeys')
      .then((data) => setKeys(data || []))
      .catch((err) => setError(err.message || 'Failed to load keys'))
  }

  useEffect(() => {
    load()
  }, [])

  async function createKey() {
    const name = window.prompt('API key name')
    if (!name) return
    try {
      const data = await apiPost('/apikeys', { name })
      setLastToken(data?.accessToken || null)
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create key')
    }
  }

  async function revokeKey(id?: string) {
    if (!id) return
    try {
      await apiDelete(`/apikeys/${id}`)
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to revoke key')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">API Keys</h3>
          <p className="text-sm text-[#6c5c4f]">Create tokens for automation clients.</p>
        </div>
        <button className="btn btn-primary" onClick={createKey}>
          Create key
        </button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {lastToken && (
        <div className="card p-4">
          <div className="text-sm">New token (copy now):</div>
          <pre className="text-xs mt-2 bg-[#f7f4ee] p-3 rounded-xl overflow-x-auto">{lastToken}</pre>
        </div>
      )}
      <div className="grid gap-3">
        {keys.map((key) => (
          <div key={key._id || key.name} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{key.name}</div>
              <div className="text-xs text-[#6c5c4f]">{key.created || ''}</div>
            </div>
            <button className="btn" onClick={() => revokeKey(key._id)}>Revoke</button>
          </div>
        ))}
      </div>
    </div>
  )
}
