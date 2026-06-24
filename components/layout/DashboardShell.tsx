import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface DashboardShellProps {
  children: ReactNode
  isAdmin?: boolean
  userName?: string
  userEmail?: string
}

export function DashboardShell({ children, isAdmin, userName, userEmail }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-(--bg)">
      <Sidebar isAdmin={isAdmin} userName={userName} userEmail={userEmail} />
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
