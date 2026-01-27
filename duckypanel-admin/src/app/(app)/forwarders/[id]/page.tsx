'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/Topbar'
import { apiDelete, apiGet, apiPut } from '@/lib/api'

export default function ForwarderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string
  const [forwarder, setForwarder] = useState<any>(null)
  const [form, setForm] = useState({
    name: '',
    address: '',
    targets: '',
    forward: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [localTargets, setLocalTargets] = useState<Record<string, { id: string; address: string }>>({})
  const [loadingTargets, setLoadingTargets] = useState(false)

  const targetsList = useMemo(() => {
    if (!forwarder?.targets || !Array.isArray(forwarder.targets)) {
      return []
    }
    return forwarder.targets.filter((target: string) => typeof target === 'string' && target.trim().length > 0)
  }, [forwarder])

  const targetDomains = useMemo(() => {
    const domains = new Set<string>()
    for (const target of targetsList) {
      const at = target.lastIndexOf('@')
      if (at !== -1) {
        domains.add(target.slice(at + 1).toLowerCase())
      }
    }
    return Array.from(domains)
  }, [targetsList])

  const load = () => {
    apiGet(`/forwarders/${id}`)
      .then((data) => {
        setForwarder(data)
        setForm({
          name: data?.name || '',
          address: data?.address || '',
          targets: Array.isArray(data?.targets) ? data.targets.join('\n') : '',
          forward: data?.limits?.forward?.allowed?.toString?.() || ''
        })
      })
      .catch((err) => setError(err.message || 'Failed to load forwarder'))
  }

  useEffect(() => {
    if (id) {
      load()
    }
  }, [id])

  useEffect(() => {
    if (!targetsList.length) {
      setLocalTargets({})
      return
    }
    let cancelled = false
    const loadTargets = async () => {
      setLoadingTargets(true)
      const map: Record<string, { id: string; address: string }> = {}
      for (const domain of targetDomains) {
        try {
          const accounts = await apiGet(`/accounts?domain=${encodeURIComponent(domain)}`)
          if (Array.isArray(accounts)) {
            for (const account of accounts) {
              if (account?.address && account?.id) {
                map[account.address.toLowerCase()] = { id: account.id, address: account.address }
              }
            }
          }
        } catch (err) {
          // ignore domains we don't manage
        }
      }
      if (!cancelled) {
        setLocalTargets(map)
        setLoadingTargets(false)
      }
    }
    loadTargets()
    return () => {
      cancelled = true
    }
  }, [targetsList, targetDomains])

  async function saveForwarder() {
    setError(null)
    setSaving(true)
    try {
      const targets = form.targets
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean)
      const payload: any = {
        name: form.name || undefined,
        address: form.address || undefined,
        targets: targets.length ? targets : undefined
      }
      if (form.forward) {
        payload.limits = { forward: Number(form.forward) }
      }
      await apiPut(`/forwarders/${id}`, payload)
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to update forwarder')
    } finally {
      setSaving(false)
    }
  }

  async function deleteForwarder() {
    if (!window.confirm('Delete this forwarder?')) return
    try {
      await apiDelete(`/forwarders/${id}`)
      router.push('/forwarders')
    } catch (err: any) {
      setError(err.message || 'Failed to delete forwarder')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">{forwarder?.address || 'Loading…'}</h3>
            <p className="text-sm text-[#6c5c4f] mt-2">Forwarding rules and limits.</p>
          </div>
          <button className="btn btn-secondary" onClick={deleteForwarder}>Delete forwarder</button>
        </div>
        {forwarder && (
          <div className="grid gap-4 md:grid-cols-2 mt-6 text-sm text-[#5e5750]">
            <div>
              <div className="font-medium text-[#1d1a17]">Forward usage</div>
              <div>{forwarder.limits?.forward?.used} / {forwarder.limits?.forward?.allowed} messages</div>
            </div>
            <div>
              <div className="font-medium text-[#1d1a17]">Window resets</div>
              <div>{forwarder.limits?.forward?.ttl} seconds</div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Forwarder Settings</h4>
          <button className="btn btn-primary" onClick={saveForwarder} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Display name</label>
            <input className="input mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Forwarder address</label>
            <input className="input mt-2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Targets (one per line or comma separated)</label>
            <textarea
              className="input mt-2"
              rows={4}
              value={form.targets}
              onChange={(e) => setForm({ ...form, targets: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Forward limit</label>
            <input className="input mt-2" type="number" min={1} value={form.forward} onChange={(e) => setForm({ ...form, forward: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Targets</h4>
          {loadingTargets && <span className="text-xs text-[#6c5c4f]">Resolving local mailboxes…</span>}
        </div>
        {targetsList.length ? (
          <div className="grid gap-2 text-sm text-[#5e5750]">
            {targetsList.map((target: string) => {
              const local = localTargets[target.toLowerCase()]
              return (
                <div key={target} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <span>{target}</span>
                  {local ? (
                    <Link className="text-xs text-[#4f6b4f] underline" href={`/accounts/${local.id}`}>
                      Open mailbox
                    </Link>
                  ) : (
                    <span className="text-xs text-[#6c5c4f]">External</span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-[#6c5c4f]">No targets configured.</div>
        )}
      </div>
    </div>
  )
}
