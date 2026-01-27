'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Topbar from '@/components/Topbar'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'

interface DomainAlias {
  domain: string
  dkim?: boolean
}

interface DomainRecord {
  domain: string
  aliases?: DomainAlias[]
}

interface AccountListItem {
  id: string
  name: string
  address: string
  aliases?: { id: string; address: string }[]
  disabled?: boolean
}

interface Forwarder {
  id: string
  address: string
  targets?: string[]
}

interface AccountAlias {
  id: string
  address: string
  user?: string
  userAddress?: string
}

export default function DomainDetailPage() {
  const params = useParams<{ domain: string }>()
  const domain = params?.domain as string
  const [dns, setDns] = useState<any>(null)
  const [dkim, setDkim] = useState<any>(null)
  const [domainRecord, setDomainRecord] = useState<DomainRecord | null>(null)
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [forwarders, setForwarders] = useState<Forwarder[]>([])
  const [forwarderTargets, setForwarderTargets] = useState<Record<string, { id: string; address: string }>>({})
  const [aliases, setAliases] = useState<AccountAlias[]>([])
  const [aliasTargets, setAliasTargets] = useState<Record<string, { id: string; address: string }>>({})
  const [alias, setAlias] = useState('')
  const [selector, setSelector] = useState('ducky')
  const [privateKey, setPrivateKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const load = () => {
    apiGet(`/domains/${domain}/DNS`)
      .then((data) => setDns(data))
      .catch(() => setDns(null))
    apiGet(`/domains/${domain}/dkim`)
      .then((data) => setDkim(data))
      .catch(() => setDkim(null))
    apiGet('/domains')
      .then((data) => {
        const found = Array.isArray(data) ? data.find((item) => item.domain === domain) : null
        setDomainRecord(found || null)
      })
      .catch(() => setDomainRecord(null))

    if (domain) {
      setLoadingAccounts(true)
      apiGet(`/accounts?domain=${encodeURIComponent(domain)}`)
        .then((data) => setAccounts(data || []))
        .catch(() => setAccounts([]))
        .finally(() => setLoadingAccounts(false))
      apiGet(`/accounts/aliases?domain=${encodeURIComponent(domain)}`)
        .then((data) => setAliases(data || []))
        .catch(() => setAliases([]))
      apiGet(`/forwarders?domain=${encodeURIComponent(domain)}`)
        .then((data) => setForwarders(data || []))
        .catch(() => setForwarders([]))
    }
  }

  useEffect(() => {
    if (domain) {
      load()
    }
  }, [domain])

  const forwarderTargetsList = useMemo(() => {
    const targets: string[] = []
    for (const forwarder of forwarders) {
      if (Array.isArray(forwarder.targets)) {
        for (const target of forwarder.targets) {
          if (typeof target === 'string' && target.trim().length) {
            targets.push(target.trim())
          }
        }
      }
    }
    return Array.from(new Set(targets.map((target) => target.toLowerCase())))
  }, [forwarders])

  const forwarderTargetDomains = useMemo(() => {
    const domains = new Set<string>()
    for (const target of forwarderTargetsList) {
      const at = target.lastIndexOf('@')
      if (at !== -1) {
        domains.add(target.slice(at + 1))
      }
    }
    return Array.from(domains)
  }, [forwarderTargetsList])

  useEffect(() => {
    if (!forwarderTargetsList.length) {
      setForwarderTargets({})
      return
    }
    let cancelled = false
    const loadTargets = async () => {
      const map: Record<string, { id: string; address: string }> = {}
      for (const targetDomain of forwarderTargetDomains) {
        try {
          const accounts = await apiGet(`/accounts?domain=${encodeURIComponent(targetDomain)}`)
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
        setForwarderTargets(map)
      }
    }
    loadTargets()
    return () => {
      cancelled = true
    }
  }, [forwarderTargetsList, forwarderTargetDomains])

  const aliasTargetList = useMemo(() => {
    const targets: string[] = []
    for (const alias of aliases) {
      if (alias?.userAddress && typeof alias.userAddress === 'string') {
        targets.push(alias.userAddress.trim())
      }
    }
    return Array.from(new Set(targets.map((target) => target.toLowerCase())))
  }, [aliases])

  const aliasTargetDomains = useMemo(() => {
    const domains = new Set<string>()
    for (const target of aliasTargetList) {
      const at = target.lastIndexOf('@')
      if (at !== -1) {
        domains.add(target.slice(at + 1))
      }
    }
    return Array.from(domains)
  }, [aliasTargetList])

  useEffect(() => {
    if (!aliasTargetList.length) {
      setAliasTargets({})
      return
    }
    let cancelled = false
    const loadTargets = async () => {
      const map: Record<string, { id: string; address: string }> = {}
      for (const targetDomain of aliasTargetDomains) {
        try {
          const accounts = await apiGet(`/accounts?domain=${encodeURIComponent(targetDomain)}`)
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
        setAliasTargets(map)
      }
    }
    loadTargets()
    return () => {
      cancelled = true
    }
  }, [aliasTargetList, aliasTargetDomains])

  async function addAlias() {
    if (!alias) return
    setError(null)
    try {
      await apiPost(`/domains/${domain}/aliases`, { domain: alias })
      setAlias('')
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to add alias')
    }
  }

  async function deleteAlias(target: string) {
    setError(null)
    try {
      await apiDelete(`/domains/${domain}/aliases/${encodeURIComponent(target)}`)
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to delete alias')
    }
  }

  async function updateDkim() {
    setError(null)
    try {
      await apiPut(`/domains/${domain}/dkim`, {
        selector,
        privateKey: privateKey || undefined
      })
      setPrivateKey('')
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to update DKIM')
    }
  }

  async function createAccount() {
    if (!domain) return
    const address = window.prompt(`Email address (user@${domain})`)
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

  async function createForwarder() {
    if (!domain) return
    const address = window.prompt(`Forwarder address (e.g. sales@${domain})`)
    if (!address) return
    const targets = window.prompt('Targets (comma or newline separated)')
    if (!targets) return
    try {
      await apiPost('/forwarders', {
        address,
        targets: targets
          .split(/\n|,/)
          .map((value) => value.trim())
          .filter(Boolean),
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
      <div className="card p-6">
        <h3 className="text-2xl font-semibold">{domain}</h3>
        <p className="text-sm text-[#6c5c4f] mt-2">DNS health and DKIM configuration.</p>
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 flex flex-col gap-4">
          <h4 className="text-lg font-semibold">DKIM</h4>
          <div className="text-sm text-[#6c5c4f]">Selector: {dkim?.selector || 'Not configured'}</div>
          <div className="text-sm text-[#6c5c4f]">DNS TXT:</div>
          <pre className="text-xs bg-[#f7f4ee] p-3 rounded-xl overflow-x-auto">
            {dkim?.dnsTxt?.value || 'No DKIM record available'}
          </pre>
          <div className="grid gap-3">
            <input className="input" value={selector} onChange={(e) => setSelector(e.target.value)} />
            <textarea
              className="input"
              rows={4}
              placeholder="Optional: paste private key to import"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={updateDkim}>
              Update DKIM
            </button>
          </div>
        </div>

        <div className="card p-6 flex flex-col gap-4">
          <h4 className="text-lg font-semibold">DNS Check</h4>
          {dns ? (
            <div className="text-sm text-[#6c5c4f] space-y-3">
              <div>
                <div className="font-medium">MX</div>
                <pre className="text-xs bg-[#f7f4ee] p-3 rounded-xl overflow-x-auto">
                  {JSON.stringify(dns.currentValues?.mx || [], null, 2)}
                </pre>
              </div>
              <div>
                <div className="font-medium">SPF</div>
                <pre className="text-xs bg-[#f7f4ee] p-3 rounded-xl overflow-x-auto">
                  {JSON.stringify(dns.currentValues?.spf || '', null, 2)}
                </pre>
              </div>
              <div>
                <div className="font-medium">Errors</div>
                <pre className="text-xs bg-[#f7f4ee] p-3 rounded-xl overflow-x-auto">
                  {JSON.stringify(dns.errors || [], null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#6c5c4f]">DNS check unavailable.</div>
          )}
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold">Domain aliases</h4>
            <p className="text-sm text-[#6c5c4f]">Add domain aliases for shared accounts.</p>
          </div>
          <div className="flex gap-3">
            <input className="input" placeholder="alias.example.com" value={alias} onChange={(e) => setAlias(e.target.value)} />
            <button className="btn btn-primary" onClick={addAlias}>
              Add alias
            </button>
          </div>
        </div>
        <div className="grid gap-3">
          {domainRecord?.aliases?.map((item) => (
            <div key={item.domain} className="flex items-center justify-between border border-[#e2dbd0] rounded-xl p-3">
              <div>
                <div className="font-medium">{item.domain}</div>
                <div className="text-xs text-[#6c5c4f]">DKIM {item.dkim ? 'enabled' : 'missing'}</div>
              </div>
              <button className="btn btn-secondary" onClick={() => deleteAlias(item.domain)}>
                Remove
              </button>
            </div>
          ))}
          {!domainRecord?.aliases?.length && <div className="text-sm text-[#6c5c4f]">No aliases configured.</div>}
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold">Mailbox aliases</h4>
            <p className="text-sm text-[#6c5c4f]">Addresses that deliver to a mailbox in this domain.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {aliases.map((item) => (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-[#e2dbd0] rounded-xl p-3">
              <div>
                <div className="font-medium">{item.address}</div>
                <div className="text-xs text-[#6c5c4f]">
                  Target{' '}
                  {item.userAddress && aliasTargets[item.userAddress.toLowerCase()] ? (
                    <Link className="underline text-[#4f6b4f]" href={`/accounts/${aliasTargets[item.userAddress.toLowerCase()].id}`}>
                      {item.userAddress}
                    </Link>
                  ) : (
                    <span>{item.userAddress || item.user || 'Unknown'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!aliases.length && <div className="text-sm text-[#6c5c4f]">No aliases configured.</div>}
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold">Mailboxes</h4>
            <p className="text-sm text-[#6c5c4f]">Manage accounts and mailbox settings for this domain.</p>
          </div>
          <button className="btn btn-primary" onClick={createAccount}>Create account</button>
        </div>
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`} className="card p-4 hover:shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-medium">{account.address}</div>
                  <div className="text-xs text-[#6c5c4f]">
                    {account.aliases?.length || 0} aliases · {account.disabled ? 'Disabled' : 'Active'}
                  </div>
                </div>
                {account.name && <div className="badge">{account.name}</div>}
              </div>
            </Link>
          ))}
          {!accounts.length && !loadingAccounts && (
            <div className="text-sm text-[#6c5c4f]">No accounts found for this domain.</div>
          )}
          {loadingAccounts && <div className="text-sm text-[#6c5c4f]">Loading accounts…</div>}
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold">Forwarders</h4>
            <p className="text-sm text-[#6c5c4f]">Route mail to external targets for this domain.</p>
          </div>
          <button className="btn btn-primary" onClick={createForwarder}>Create forwarder</button>
        </div>
        <div className="grid gap-3">
          {forwarders.map((forwarder) => (
            <Link key={forwarder.id} href={`/forwarders/${forwarder.id}`} className="card p-4 hover:shadow-lg">
              <div className="font-medium">{forwarder.address}</div>
              {forwarder.targets?.length ? (
                <div className="text-xs text-[#6c5c4f] mt-2">
                  Targets:{' '}
                  {forwarder.targets.map((target) => {
                    const targetKey = target.toLowerCase()
                    const local = forwarderTargets[targetKey]
                    return (
                      <span key={target}>
                        {local ? (
                          <Link className="underline text-[#4f6b4f]" href={`/accounts/${local.id}`}>
                            {target}
                          </Link>
                        ) : (
                          <span>{target}</span>
                        )}
                        {' '}
                      </span>
                    )
                  })}
                </div>
              ) : null}
            </Link>
          ))}
          {!forwarders.length && <div className="text-sm text-[#6c5c4f]">No forwarders configured.</div>}
        </div>
      </div>
    </div>
  )
}
