'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Topbar from '@/components/Topbar'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string
  const [account, setAccount] = useState<any>(null)
  const [forwarders, setForwarders] = useState<any[]>([])
  const [filters, setFilters] = useState<any[]>([])
  const [autoArchive, setAutoArchive] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    password: '',
    spamLevel: '',
    disabled: false,
    disabledScopes: [] as string[],
    quota: '',
    send: '',
    receive: '',
    forward: '',
    targets: ''
  })

  const load = () => {
    apiGet(`/accounts/${id}`)
      .then((data) => {
        setAccount(data)
        setForm({
          name: data?.name || '',
          password: '',
          spamLevel: data?.spamLevel?.toString?.() || '',
          disabled: Boolean(data?.disabled),
          disabledScopes: Array.isArray(data?.disabledScopes) ? data.disabledScopes : [],
          quota: data?.limits?.quota?.allowed?.toString?.() || '',
          send: data?.limits?.send?.allowed?.toString?.() || '',
          receive: data?.limits?.receive?.allowed?.toString?.() || '',
          forward: data?.limits?.forward?.allowed?.toString?.() || '',
          targets: Array.isArray(data?.targets) ? data.targets.join('\n') : ''
        })
      })
      .catch((err) => setError(err.message || 'Failed to load account'))
    apiGet(`/accounts/${id}/filters`)
      .then((data) => setFilters(data || []))
      .catch(() => setFilters([]))
    apiGet(`/accounts/${id}/auto-archive`)
      .then((data) => setAutoArchive(data))
      .catch(() => setAutoArchive(null))
  }

  useEffect(() => {
    if (id) {
      load()
    }
  }, [id])

  const accountTargets = useMemo(() => {
    const targets: string[] = []
    if (account?.address && typeof account.address === 'string') {
      targets.push(account.address)
    }
    if (Array.isArray(account?.aliases)) {
      for (const alias of account.aliases) {
        if (alias?.address && typeof alias.address === 'string') {
          targets.push(alias.address)
        }
      }
    }
    return Array.from(new Set(targets.map((target) => target.toLowerCase())))
  }, [account])

  const targetDomains = useMemo(() => {
    const domains = new Set<string>()
    for (const target of accountTargets) {
      const at = target.lastIndexOf('@')
      if (at !== -1) {
        domains.add(target.slice(at + 1))
      }
    }
    return Array.from(domains)
  }, [accountTargets])

  useEffect(() => {
    if (!accountTargets.length || targetDomains.length === 0) {
      setForwarders([])
      return
    }
    let cancelled = false
    const loadForwarders = async () => {
      const collected = new Map<string, any>()
      try {
        for (const domain of targetDomains) {
          const data = await apiGet(`/forwarders?domain=${encodeURIComponent(domain)}`)
          const list = Array.isArray(data) ? data : []
          for (const forwarder of list) {
            if (forwarder?.id && !collected.has(forwarder.id)) {
              collected.set(forwarder.id, forwarder)
            }
          }
        }
        const filtered = Array.from(collected.values()).filter((forwarder: any) =>
          Array.isArray(forwarder.targets) &&
          forwarder.targets.some((target: string) => accountTargets.includes(target.toLowerCase()))
        )
        if (!cancelled) {
          setForwarders(filtered)
        }
      } catch (err) {
        if (!cancelled) {
          setForwarders([])
        }
      }
    }
    loadForwarders()
    return () => {
      cancelled = true
    }
  }, [accountTargets, targetDomains])

  async function updateAutoArchive() {
    if (!autoArchive) return
    setError(null)
    try {
      await apiPut(`/accounts/${id}/auto-archive`, {
        enabled: autoArchive.enabled,
        months: Number(autoArchive.months),
        base: autoArchive.base,
        pattern: autoArchive.pattern
      })
    } catch (err: any) {
      setError(err.message || 'Failed to update auto-archive')
    }
  }

  async function runAutoArchive() {
    setError(null)
    try {
      await apiPost(`/accounts/${id}/auto-archive/run`)
      alert('Auto-archive run scheduled.')
    } catch (err: any) {
      setError(err.message || 'Failed to run auto-archive')
    }
  }

  async function addFilter() {
    const name = window.prompt('Filter name')
    if (!name) return
    const query = window.prompt('Search query (eg. subject:"invoice")')
    if (!query) return
    try {
      await apiPost(`/accounts/${id}/filters`, { name, query })
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to add filter')
    }
  }

  function toggleScope(scope: string) {
    setForm((prev) => {
      const next = new Set(prev.disabledScopes)
      if (next.has(scope)) {
        next.delete(scope)
      } else {
        next.add(scope)
      }
      return { ...prev, disabledScopes: Array.from(next) }
    })
  }

  async function saveAccountSettings() {
    setError(null)
    setSaving(true)
    try {
      const limits: Record<string, number> = {}
      if (form.quota) limits.quota = Number(form.quota)
      if (form.send) limits.send = Number(form.send)
      if (form.receive) limits.receive = Number(form.receive)
      if (form.forward) limits.forward = Number(form.forward)

      const payload: any = {
        name: form.name || undefined,
        spamLevel: form.spamLevel ? Number(form.spamLevel) : undefined,
        disabled: form.disabled,
        disabledScopes: form.disabledScopes
      }

      if (Object.keys(limits).length) {
        payload.limits = limits
      }

      if (form.password) {
        payload.password = form.password
      }

      const targets = form.targets
        .split(/\r?\n|,/)
        .map((value) => value.trim())
        .filter(Boolean)
      payload.targets = targets

      await apiPut(`/accounts/${id}`, payload)
      setForm((prev) => ({ ...prev, password: '' }))
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to update account')
    } finally {
      setSaving(false)
    }
  }

  async function addAlias() {
    const address = window.prompt('Alias address (alias@domain)')
    if (!address) return
    const name = window.prompt('Alias name (optional)') || ''
    try {
      await apiPost(`/accounts/${id}/aliases`, { address, name })
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to add alias')
    }
  }

  async function deleteAlias(aliasId: string) {
    if (!window.confirm('Delete this alias?')) return
    try {
      await apiDelete(`/accounts/${id}/aliases/${aliasId}`)
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to delete alias')
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Delete this account? This cannot be undone.')) return
    try {
      await apiDelete(`/accounts/${id}`)
      router.push('/accounts')
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
    }
  }

  async function deleteForwarder(forwarderId: string) {
    if (!window.confirm('Delete this forwarder?')) return
    try {
      await apiDelete(`/forwarders/${forwarderId}`)
      load()
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
            <h3 className="text-2xl font-semibold">{account?.address || 'Loading…'}</h3>
            <p className="text-sm text-[#6c5c4f] mt-2">Mailbox details and safeguards.</p>
          </div>
          <button className="btn btn-secondary" onClick={deleteAccount}>Delete account</button>
        </div>
        {account && (
          <div className="grid gap-4 md:grid-cols-2 mt-6 text-sm text-[#5e5750]">
            <div>
              <div className="font-medium text-[#1d1a17]">Quota</div>
              <div>{account.limits?.quota?.used} / {account.limits?.quota?.allowed} bytes</div>
            </div>
            <div>
              <div className="font-medium text-[#1d1a17]">Spam Level</div>
              <div>{account.spamLevel}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Account Settings</h4>
          <button className="btn btn-primary" onClick={saveAccountSettings} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Display name</label>
            <input className="input mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">New password</label>
            <input
              className="input mt-2"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep current password"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Spam level (0-100)</label>
            <input
              className="input mt-2"
              type="number"
              min={0}
              max={100}
              value={form.spamLevel}
              onChange={(e) => setForm({ ...form, spamLevel: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              checked={form.disabled}
              onChange={(e) => setForm({ ...form, disabled: e.target.checked })}
            />
            Disable account
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium">Quota (bytes)</label>
            <input className="input mt-2" type="number" min={1} value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Send limit</label>
            <input className="input mt-2" type="number" min={1} value={form.send} onChange={(e) => setForm({ ...form, send: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Receive limit</label>
            <input className="input mt-2" type="number" min={1} value={form.receive} onChange={(e) => setForm({ ...form, receive: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">Forward limit</label>
            <input className="input mt-2" type="number" min={1} value={form.forward} onChange={(e) => setForm({ ...form, forward: e.target.value })} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">Disable protocols</div>
          <div className="flex flex-wrap gap-4 text-sm">
            {['imap', 'pop3', 'smtp'].map((scope) => (
              <label key={scope} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.disabledScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                {scope.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Forwarding targets</label>
          <textarea
            className="input min-h-[120px]"
            placeholder="one target per line (email, smtp://, or http://)"
            value={form.targets}
            onChange={(e) => setForm({ ...form, targets: e.target.value })}
          />
          <div className="text-xs text-[#6c5c4f]">
            Messages delivered to this mailbox will also be sent to these targets.
          </div>
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Aliases</h4>
          <button className="btn btn-secondary" onClick={addAlias}>Add alias</button>
        </div>
        <div className="grid gap-3">
          {account?.aliases?.map((alias: any) => (
            <div key={alias.id} className="flex items-center justify-between border border-[#e2dbd0] rounded-xl p-3">
              <div>
                <div className="font-medium">{alias.address}</div>
                {alias.name && <div className="text-xs text-[#6c5c4f]">{alias.name}</div>}
              </div>
              <button className="btn btn-secondary" onClick={() => deleteAlias(alias.id)}>Remove</button>
            </div>
          ))}
          {(!account?.aliases || account.aliases.length === 0) && (
            <div className="text-sm text-[#6c5c4f]">No aliases configured.</div>
          )}
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Forwarders</h4>
        </div>
        <div className="grid gap-3">
          {forwarders.map((forwarder: any) => (
            <div key={forwarder.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-[#e2dbd0] rounded-xl p-3">
              <div>
                <div className="font-medium">{forwarder.address}</div>
                {forwarder.targets?.length ? (
                  <div className="text-xs text-[#6c5c4f]">Targets: {forwarder.targets.join(', ')}</div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Link className="btn btn-secondary" href={`/forwarders/${forwarder.id}`}>Edit</Link>
                <button className="btn btn-secondary" onClick={() => deleteForwarder(forwarder.id)}>Delete</button>
              </div>
            </div>
          ))}
          {forwarders.length === 0 && <div className="text-sm text-[#6c5c4f]">No forwarders configured.</div>}
        </div>
      </div>

      {autoArchive && (
        <div className="card p-6 flex flex-col gap-4">
          <h4 className="text-lg font-semibold">Auto-Archive</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(autoArchive.enabled)}
                onChange={(event) =>
                  setAutoArchive({ ...autoArchive, enabled: event.target.checked })
                }
              />
              Enable auto-archive
            </label>
            <div>
              <label className="text-sm font-medium">Months</label>
              <input
                className="input mt-2"
                type="number"
                value={autoArchive.months}
                min={1}
                max={120}
                onChange={(event) => setAutoArchive({ ...autoArchive, months: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Base folder</label>
              <input
                className="input mt-2"
                value={autoArchive.base}
                onChange={(event) => setAutoArchive({ ...autoArchive, base: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Pattern</label>
              <input
                className="input mt-2"
                value={autoArchive.pattern}
                onChange={(event) => setAutoArchive({ ...autoArchive, pattern: event.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={updateAutoArchive}>Save settings</button>
            <button className="btn btn-primary" onClick={runAutoArchive}>Run now</button>
          </div>
        </div>
      )}

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Filters</h4>
          <button className="btn btn-secondary" onClick={addFilter}>Add filter</button>
        </div>
        <div className="grid gap-3">
          {filters.map((filter) => (
            <div key={filter.id} className="flex items-center justify-between border border-[#e2dbd0] rounded-xl p-3">
              <div>
                <div className="font-medium">{filter.name}</div>
                <div className="text-xs text-[#6c5c4f]">{filter.query}</div>
              </div>
              <div className="badge">{filter.action || 'action'}</div>
            </div>
          ))}
          {filters.length === 0 && <div className="text-sm text-[#6c5c4f]">No filters configured.</div>}
        </div>
      </div>
    </div>
  )
}
