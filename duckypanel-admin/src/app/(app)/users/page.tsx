'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { apiGet, apiPost } from '@/lib/api'

interface ApiUser {
  _id?: string
  username: string
  roles?: string[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    apiGet('/users')
      .then((data) => setUsers(data || []))
      .catch((err) => setError(err.message || 'Failed to load users'))
  }

  useEffect(() => {
    load()
  }, [])

  async function createUser() {
    const username = window.prompt('Username')
    if (!username) return
    const password = window.prompt('Password')
    if (!password) return
    const packageId = window.prompt('Package ID (optional)') || undefined
    try {
      await apiPost('/users', { username, password, packageId })
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">API Users</h3>
          <p className="text-sm text-[#6c5c4f]">Manage tenants and admin accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={createUser}>
          Create user
        </button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid gap-3">
        {users.map((user) => (
          <div key={user._id || user.username} className="card p-4">
            <div className="font-medium">{user.username}</div>
            <div className="text-xs text-[#6c5c4f]">Roles: {(user.roles || []).join(', ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
