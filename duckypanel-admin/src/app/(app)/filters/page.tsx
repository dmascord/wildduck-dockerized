'use client'

import Topbar from '@/components/Topbar'

export default function FiltersPage() {
  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6">
        <h3 className="text-xl font-semibold">Filters</h3>
        <p className="text-sm text-[#6c5c4f] mt-2">
          Filters are configured per account. Open an account and manage filters from the account detail view.
        </p>
      </div>
    </div>
  )
}
