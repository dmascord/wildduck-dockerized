'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { setToken } from '@/lib/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/admin/api'

export default function LoginPage() {
  const router = useRouter()
  const [next, setNext] = useState('/')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setNext(params.get('next') || '/')
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const username = String(formData.get('username') || '')
    const password = String(formData.get('password') || '')
    const rememberMe = formData.get('rememberMe') === 'on'

    try {
      const response = await fetch(`${API_BASE}/authentication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Login failed')
      }
      setToken(data.accessToken)
      router.replace(next)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass max-w-xl w-full p-10 rounded-[32px]">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6c5c4f]">WildDuck</p>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            Admin Studio Login
          </h1>
          <p className="text-sm text-[#6c5c4f] mt-3">
            Authenticate with your DuckyAPI credentials to manage domains, accounts, and mailflow.
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium">Username</label>
            <input className="input mt-2" type="text" name="username" required />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input className="input mt-2" type="password" name="password" required />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#5e5750]">
            <input type="checkbox" name="rememberMe" />
            Keep me signed in
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="btn btn-primary justify-center" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
