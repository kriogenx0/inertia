import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FolderPlus, CheckSquare, LogOut, FilePlus, FileText,
  Table as TableIcon, Pin, Folder, Loader2,
} from 'lucide-react'
import { useWorkspace, useCreateFolder, useCreateDocument, usePinDocument, usePinFolder } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { FolderItem } from './FolderItem'
import api from '@/lib/api'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: workspace, isLoading } = useWorkspace()
  const createFolder = useCreateFolder()
  const createDocument = useCreateDocument()
  const pinDocument = usePinDocument()
  const pinFolder = usePinFolder()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [addingFolder, setAddingFolder] = useState(false)
  const creatingRef = useRef(false)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (addingFolder) folderInputRef.current?.focus() }, [addingFolder])

  // Cmd+N shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        createNewDocument()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogout() {
    api.delete('/api/v1/auth/logout').finally(() => {
      logout()
      navigate('/login')
    })
  }

  async function createNewDocument() {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      let folderId = workspace?.folders?.[0]?.id
      if (!folderId) {
        const folder = await createFolder.mutateAsync({ name: 'Documents' })
        folderId = folder.id
      }
      const doc = await createDocument.mutateAsync({ folderId, title: 'Untitled', doc_type: 'document' })
      navigate(`/documents/${doc.id}`)
    } finally {
      creatingRef.current = false
    }
  }

  const allDocs = workspace?.folders?.flatMap((f) => f.documents ?? []) ?? []
  const pinnedDocs = allDocs.filter((d) => d.pinned)
  const pinnedFolders = (workspace?.folders ?? []).filter((f) => f.pinned)
  const hasPinned = pinnedDocs.length > 0 || pinnedFolders.length > 0

  return (
    <aside className="w-60 border-r bg-muted/20 flex flex-col h-screen">
      {/* Header */}
      <div className="px-3 py-3 border-b">
        <p className="font-semibold text-sm truncate">{workspace?.name ?? 'Inertia'}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
      </div>

      {/* Nav */}
      <div className="px-2 py-2 border-b">
        <button
          onClick={() => navigate('/tasks')}
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent ${location.pathname === '/tasks' ? 'bg-accent' : ''}`}
        >
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          Tasks
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-3">
        {/* Pinned section */}
        {hasPinned && (
          <div>
            <div className="flex items-center gap-1.5 px-3 mb-1">
              <Pin className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</span>
            </div>
            {pinnedFolders.map((folder) => {
              const firstDoc = folder.documents?.[0]
              return (
                <button
                  key={folder.id}
                  onClick={() => firstDoc && navigate(`/documents/${firstDoc.id}`)}
                  className="flex items-center gap-1.5 w-full px-3 py-1 rounded-md text-sm hover:bg-accent text-left group"
                >
                  <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); pinFolder.mutate({ id: folder.id, pinned: false }) }}
                    className="hidden group-hover:flex text-muted-foreground hover:text-foreground"
                    title="Unpin"
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                </button>
              )
            })}
            {pinnedDocs.map((doc) => {
              const active = location.pathname === `/documents/${doc.id}`
              return (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className={`flex items-center gap-1.5 w-full px-3 py-1 rounded-md text-sm hover:bg-accent text-left group ${active ? 'bg-accent' : ''}`}
                >
                  {doc.doc_type === 'spreadsheet'
                    ? <TableIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    : <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  }
                  <span className="flex-1 truncate">{doc.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); pinDocument.mutate({ id: doc.id, pinned: false }) }}
                    className="hidden group-hover:flex text-muted-foreground hover:text-foreground"
                    title="Unpin"
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                </button>
              )
            })}
          </div>
        )}

        {/* Documents section (unified tree) */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documents</span>
            <div className="flex items-center gap-0.5">
              <button
                title="New document (⌘N)"
                onClick={() => createNewDocument()}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                title="New folder"
                onClick={() => setAddingFolder(true)}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {addingFolder && (
            <div className="px-2 pb-1">
              <input
                ref={folderInputRef}
                placeholder="Folder name"
                className="w-full text-sm px-2 py-0.5 rounded border border-input bg-card outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    createFolder.mutate({ name: e.currentTarget.value.trim() })
                    setAddingFolder(false)
                  }
                  if (e.key === 'Escape') setAddingFolder(false)
                }}
                onBlur={() => setAddingFolder(false)}
              />
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && workspace?.folders?.length === 0 && !addingFolder && (
            <div className="flex flex-col items-center py-4 gap-2 text-muted-foreground">
              <FilePlus className="w-8 h-8 opacity-30" />
            </div>
          )}

          {workspace?.folders?.map((folder) => (
            <FolderItem key={folder.id} folder={folder} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-2 py-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
