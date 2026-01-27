import AuthGate from '@/components/AuthGate'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="admin-shell">
        <Sidebar />
        <main className="p-8 lg:p-10">
          <div className="flex flex-col gap-8">{children}</div>
        </main>
      </div>
    </AuthGate>
  )
}
