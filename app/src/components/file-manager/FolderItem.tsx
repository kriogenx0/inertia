import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronRight, FilePlus, FolderPlus, Folder, FileText, MoreHorizontal,
  Trash2, TableIcon, Pin,
} from 'lucide-react'
import {
  useCreateFolder, useCreateDocument, useDeleteFolder, useDeleteDocument,
  usePinFolder, usePinDocument, useMoveDocument, useUpdateFolder,
} from '@/api/workspace'
import type { Folder as FolderType } from '@/types'

interface InlineInputProps {
  placeholder: string
  onConfirm: (value: string) => void | Promise<void>
  onCancel: () => void
}

function InlineInput({ placeholder, onConfirm, onCancel }: InlineInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const submittedRef = useRef(false)
  useEffect(() => ref.current?.focus(), [])
  return (
    <input
      ref={ref}
      placeholder={placeholder}
      className="w-full text-sm px-2 py-0.5 rounded border border-input bg-card outline-none focus:ring-1 focus:ring-primary"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
          submittedRef.current = true
          onConfirm(e.currentTarget.value.trim())
        }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => { if (!submittedRef.current) onCancel() }}
    />
  )
}

interface FolderItemProps {
  folder: FolderType
  depth?: number
}

export function FolderItem({ folder, depth = 0 }: FolderItemProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)
  const [addingFolder, setAddingFolder] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  const createDocument = useCreateDocument()
  const createFolder = useCreateFolder()
  const deleteFolder = useDeleteFolder()
  const deleteDocument = useDeleteDocument()
  const pinFolder = usePinFolder()
  const pinDocument = usePinDocument()
  const moveDocument = useMoveDocument()

  const updateFolder = useUpdateFolder()

  const indent = depth * 12

  async function handleNewDoc(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(true)
    const doc = await createDocument.mutateAsync({ folderId: folder.id, title: 'Untitled', doc_type: 'document' })
    navigate(`/documents/${doc.id}`)
  }

  async function handleNewSpreadsheet() {
    setOpen(true)
    setMenuOpen(false)
    const doc = await createDocument.mutateAsync({ folderId: folder.id, title: 'Untitled', doc_type: 'spreadsheet' })
    navigate(`/documents/${doc.id}`)
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) setIsDragOver(true)
  }

  function handleDragLeave() {
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)
    const docId = Number(e.dataTransfer.getData('docId'))
    const currentFolderId = Number(e.dataTransfer.getData('folderId'))
    if (docId && currentFolderId !== folder.id) {
      moveDocument.mutate({ id: docId, folderId: folder.id })
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={isDragOver ? 'rounded-md ring-1 ring-primary/40 bg-accent/50' : ''}
    >
      <div
        className="group flex items-center gap-1 py-1 rounded-md hover:bg-accent cursor-pointer text-sm select-none"
        style={{ paddingLeft: `${8 + indent}px`, paddingRight: '8px' }}
      >
        <button onClick={() => setOpen(!open)} className="text-muted-foreground">
          <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {renaming ? (
          <InlineInput
            placeholder={folder.name}
            onConfirm={(name) => { updateFolder.mutate({ id: folder.id, name }); setRenaming(false) }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span className="flex-1 truncate text-foreground">{folder.name}</span>
        )}
        <span className="hidden group-hover:flex items-center gap-0.5">
          <button
            title="New document"
            onClick={handleNewDoc}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            title="New subfolder"
            onClick={(e) => { e.stopPropagation(); setOpen(true); setAddingFolder(true) }}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            title={folder.pinned ? 'Unpin' : 'Pin'}
            onClick={(e) => { e.stopPropagation(); pinFolder.mutate({ id: folder.id, pinned: !folder.pinned }) }}
            className={`p-0.5 rounded hover:bg-muted hover:text-foreground ${folder.pinned ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-5 z-10 bg-card border rounded-lg shadow-lg py-1 w-40">
                <button
                  onClick={() => { setRenaming(true); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Rename
                </button>
                <button
                  onClick={handleNewSpreadsheet}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <TableIcon className="w-3.5 h-3.5" /> New Spreadsheet
                </button>
                <button
                  onClick={() => { deleteFolder.mutate(folder.id); setMenuOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </span>

        {/* Always-visible pin indicator */}
        {folder.pinned && (
          <Pin className="w-3 h-3 text-muted-foreground group-hover:hidden shrink-0" />
        )}
      </div>

      {open && (
        <div>
          {addingFolder && (
            <div style={{ paddingLeft: `${20 + indent}px` }} className="pr-2 py-0.5">
              <InlineInput
                placeholder="Folder name"
                onConfirm={(name) => { createFolder.mutate({ name, parent_id: folder.id }); setAddingFolder(false) }}
                onCancel={() => setAddingFolder(false)}
              />
            </div>
          )}

          {folder.children?.map((child) => (
            <FolderItem key={child.id} folder={child} depth={depth + 1} />
          ))}

          {folder.documents?.map((doc) => {
            const active = location.pathname === `/documents/${doc.id}`
            return (
              <div
                key={doc.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('docId', String(doc.id))
                  e.dataTransfer.setData('folderId', String(folder.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className={`group flex items-center gap-1.5 py-1 rounded-md cursor-pointer text-sm select-none hover:bg-accent ${active ? 'bg-accent' : ''}`}
                style={{ paddingLeft: `${24 + indent}px`, paddingRight: '8px' }}
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                {doc.doc_type === 'spreadsheet'
                  ? <TableIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  : <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                }
                <span className="flex-1 truncate">{doc.title}</span>
                <span className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    title={doc.pinned ? 'Unpin' : 'Pin'}
                    onClick={(e) => { e.stopPropagation(); pinDocument.mutate({ id: doc.id, pinned: !doc.pinned }) }}
                    className={`p-0.5 rounded hover:bg-muted hover:text-foreground ${doc.pinned ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteDocument.mutate(doc.id) }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
                {doc.pinned && (
                  <Pin className="w-2.5 h-2.5 text-muted-foreground group-hover:hidden shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
