import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FolderPlus, CheckSquare, FilePlus, FileText,
  Table as TableIcon, Pin, Folder, Loader2, CalendarDays, ChevronRight,
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
  const { user, logout } = useAuthStore()
  const [tasksOpen, setTasksOpen] = useState(true)
  const [eventsOpen, setEventsOpen] = useState(true)
  const [addingFolder, setAddingFolder] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const creatingRef = useRef(false)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const createNewDocumentRef = useRef(createNewDocument)
  createNewDocumentRef.current = createNewDocument

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  useEffect(() => { if (addingFolder) folderInputRef.current?.focus() }, [addingFolder])

  // Cmd+N → new document, Cmd+Option+N → new task
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'n') {
        e.preventDefault()
        navigate('/tasks?view=backlog&new=1')
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        createNewDocumentRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  async function createNewSpreadsheet() {
    if (creatingRef.current) return
    creatingRef.current = true
    try {
      let folderId = workspace?.folders?.[0]?.id
      if (!folderId) {
        const folder = await createFolder.mutateAsync({ name: 'Documents' })
        folderId = folder.id
      }
      const doc = await createDocument.mutateAsync({ folderId, title: 'Untitled', doc_type: 'spreadsheet' })
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
      <div className="px-3 pt-8 pb-3 border-b">
        <p className="font-semibold text-sm">Inertia</p>
        <p className="text-xs text-muted-foreground truncate">{workspace?.name ?? 'My Workspace'}</p>
      </div>

      {/* Nav */}
      <div className="px-2 py-2 border-b flex flex-col gap-0.5">
        {/* Tasks */}
        <div>
          <div className={`flex items-center rounded-md text-sm hover:bg-accent ${location.pathname === '/tasks' ? 'bg-accent' : ''}`}>
            <button
              onClick={(e) => { e.stopPropagation(); setTasksOpen((o) => !o) }}
              className="p-1.5 pl-2 text-muted-foreground shrink-0"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${tasksOpen ? 'rotate-90' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/tasks?view=backlog')}
              className="flex items-center gap-2 flex-1 py-1.5 pr-2"
            >
              <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
              Tasks
            </button>
          </div>
          {tasksOpen && (
            <div className="pl-9 flex flex-col gap-0.5">
              <button
                onClick={() => navigate('/tasks?view=backlog')}
                className={`w-full text-left px-2 py-1 rounded-md text-xs hover:bg-accent hover:text-foreground ${location.pathname === '/tasks' && !location.search.includes('view=kanban') ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Backlog
              </button>
              <button
                onClick={() => navigate('/tasks?view=kanban')}
                className={`w-full text-left px-2 py-1 rounded-md text-xs hover:bg-accent hover:text-foreground ${location.search.includes('view=kanban') ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Kanban
              </button>
            </div>
          )}
        </div>

        {/* Events */}
        <div>
          <div className={`flex items-center rounded-md text-sm hover:bg-accent ${location.pathname === '/events' ? 'bg-accent' : ''}`}>
            <button
              onClick={(e) => { e.stopPropagation(); setEventsOpen((o) => !o) }}
              className="p-1.5 pl-2 text-muted-foreground shrink-0"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${eventsOpen ? 'rotate-90' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/events')}
              className="flex items-center gap-2 flex-1 py-1.5 pr-2"
            >
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              Events
            </button>
          </div>
          {eventsOpen && (
            <div className="pl-9 flex flex-col gap-0.5">
              <button
                onClick={() => navigate('/events?view=list')}
                className={`w-full text-left px-2 py-1 rounded-md text-xs hover:bg-accent hover:text-foreground ${location.pathname === '/events' && !location.search.includes('view=month') ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                List
              </button>
              <button
                onClick={() => navigate('/events?view=month')}
                className={`w-full text-left px-2 py-1 rounded-md text-xs hover:bg-accent hover:text-foreground ${location.search.includes('view=month') ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Month
              </button>
            </div>
          )}
        </div>
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
            <button
              onClick={() => navigate('/documents')}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
            >
              Documents
            </button>
            <div className="flex items-center gap-0.5">
              <button
                title="New document (⌘N)"
                onClick={() => createNewDocument()}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                title="New spreadsheet"
                onClick={() => createNewSpreadsheet()}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <TableIcon className="w-3.5 h-3.5" />
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

      {/* Footer — user avatar */}
      <div className="border-t px-2 py-2">
        <button
          onClick={() => setAccountOpen(true)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent"
        >
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <span className="flex-1 text-left truncate text-foreground">{user?.name ?? 'Account'}</span>
        </button>
      </div>

      {/* Account panel */}
      {accountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAccountOpen(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-80 p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 rounded-md text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 border border-red-200 dark:border-red-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
