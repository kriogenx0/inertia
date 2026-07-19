import Sidebar from '@/components/file-manager/Sidebar'
import TabBar from '@/components/TabBar'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TabBar />
        {children}
      </div>
    </div>
  )
}
