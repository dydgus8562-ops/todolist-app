import { useState } from 'react'
import { Header } from './Header.jsx'
import { Sidebar } from './Sidebar.jsx'
import { MainContent } from './MainContent.jsx'

export function AppLayout({ children, activeStatus, onStatusChange, categorySlot }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <Header onMenuToggle={() => setIsSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeStatus={activeStatus}
          onStatusChange={onStatusChange}
          categorySlot={categorySlot}
        />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  )
}