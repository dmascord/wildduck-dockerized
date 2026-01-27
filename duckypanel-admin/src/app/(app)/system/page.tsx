'use client'

import Topbar from '@/components/Topbar'

export default function SystemPage() {
  return (
    <div className="flex flex-col gap-8">
      <Topbar />
      <div className="card p-6">
        <h3 className="text-xl font-semibold">System</h3>
        <p className="text-sm text-[#6c5c4f] mt-2">
          Use the account detail view to configure auto-archive settings and run on-demand archive jobs. Scheduled
          archive runs are handled by the auto-archive service in Docker.
        </p>
      </div>
    </div>
  )
}
