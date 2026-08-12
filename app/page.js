'use client'
import './admin.css'
import { AdminProvider, useAdmin } from '@/components/admin/AdminContext'
import LoginScreen from '@/components/admin/LoginScreen'
import AdminShell from '@/components/admin/AdminShell'
import CrashGuard from '@/components/admin/CrashGuard'

function Gate() {
  const { ready, user } = useAdmin()

  // Avoid a flash of the login screen while the stored session resolves.
  if (!ready) return <div className="ad-boot">Loading dashboard…</div>

  return user ? <AdminShell /> : <LoginScreen />
}

export default function AdminPage() {
  return (
    <CrashGuard>
      <AdminProvider>
        <Gate />
      </AdminProvider>
    </CrashGuard>
  )
}
