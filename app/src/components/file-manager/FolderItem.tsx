import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight, Folder, FileText, TableIcon, Pin } from 'lucide-react'
import {
  useCreateFolder, useCreateDocument, useDeleteFolder, useDeleteDocument,
  usePinFolder, usePinDocument, useMoveDocument, useUpdateFolder,
} from '@/api/workspace'
import { useUpdateDocument } from '@/api/documents'
import type { Folder as FolderType, Document } from '@/types'

// ── Context menu ─────────────────────────────────────────────────────────────

interface MenuItem {
  label: string
  action: () => void
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  // Keep menu on screen
  const left = Math.min(x, window.innerWidth - 160)
  const top = Math.min(y, window.innerHeight - items.length * 36 - 8)

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border rounded-lg shadow-lg py-1 w-44"
      style={{ left, top }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose() }}
          className={`flex w-full items-center px-3 py-1.5 text-sm ${
            item.danger
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
              : 'hover:bg-accent'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ── Inline rename input ───────────────────────────────────────────────────────

interface InlineInputProps {
  defaultValue: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

function InlineInput({ defaultValue, onConfirm, onCancel }: InlineInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const submitted = useRef(false)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      className="flex-1 min-w-0 text-sm px-1 py-0 rounded border border-input bg-card outline-none focus:ring-1 focus:ring-primary"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
          submitted.current = true
          onConfirm(e.currentTarget.value.trim())
        }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => { if (!submitted.current) onCancel() }}
    />
  )
}

// ── DocRow ────────────────────────────────────────────────────────────────────

function DocRow({ doc, active, indent, onNavigate, onMove, onContextMenu, renamingDocId, onConfirmRename, onCancelRename }: {
  doc: Document
  active: boolean
  indent: number
  onNavigate: () => void
  onMove: (folderId: number) => void
  onContextMenu: (e: React.MouseEvent) => void
  renamingDocId: number | null
  onConfirmRename: (title: string) => void
  onCancelRename: () => void
}) {
  const dragging = useRef(false)

  return (
    <button
      type="button"
      className={`group flex items-center gap-1.5 w-full py-1 rounded-md text-sm select-none hover:bg-accent ${active ? 'bg-accent' : ''}`}
      style={{ paddingLeft: `${36 + indent}px`, paddingRight: '8px' }}
      onClick={() => { if (!dragging.current) onNavigate() }}
      onContextMenu={onContextMenu}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const folderId = Number(e.dataTransfer.getData('folderId'))
        if (folderId) onMove(folderId)
      }}
    >
      {doc.doc_type === 'spreadsheet'
        ? <TableIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        : <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      }
      {renamingDocId === doc.id ? (
        <InlineInput
          defaultValue={doc.title}
          onConfirm={onConfirmRename}
          onCancel={onCancelRename}
        />
      ) : (
        <span className="flex-1 truncate text-left">{doc.title}</span>
      )}
      {doc.pinned && <Pin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
    </button>
  )
}

// ── FolderItem ────────────────────────────────────────────────────────────────

interface ContextState { x: number; y: number }

interface FolderItemProps {
  folder: FolderType
  depth?: number
}

export function FolderItem({ folder, depth = 0 }: FolderItemProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)
  const [addingFolder, setAddingFolder] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState(false)
  const [renamingDocId, setRenamingDocId] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)
  const [folderCtx, setFolderCtx] = useState<ContextState | null>(null)
  const [docCtx, setDocCtx] = useState<{ pos: ContextState; doc: Document } | null>(null)

  const createDocument = useCreateDocument()
  const createFolder = useCreateFolder()
  const deleteFolder = useDeleteFolder()
  const deleteDocument = useDeleteDocument()
  const pinFolder = usePinFolder()
  const pinDocument = usePinDocument()
  const moveDocument = useMoveDocument()
  const updateFolder = useUpdateFolder()
  const updateDocument = useUpdateDocument()

  const indent = depth * 12

  function openFolderCtx(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setFolderCtx({ x: e.clientX, y: e.clientY })
  }

  function openDocCtx(e: React.MouseEvent, doc: Document) {
    e.preventDefault()
    e.stopPropagation()
    setDocCtx({ pos: { x: e.clientX, y: e.clientY }, doc })
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

  const folderMenuItems: MenuItem[] = [
    {
      label: 'New Document',
      action: async () => {
        setOpen(true)
        const doc = await createDocument.mutateAsync({ folderId: folder.id, title: 'Untitled', doc_type: 'document' })
        navigate(`/documents/${doc.id}`)
      },
    },
    {
      label: 'New Spreadsheet',
      action: async () => {
        setOpen(true)
        const doc = await createDocument.mutateAsync({ folderId: folder.id, title: 'Untitled', doc_type: 'spreadsheet' })
        navigate(`/documents/${doc.id}`)
      },
    },
    {
      label: 'New Subfolder',
      action: () => { setOpen(true); setAddingFolder(true) },
    },
    {
      label: folder.pinned ? 'Unpin' : 'Pin',
      action: () => pinFolder.mutate({ id: folder.id, pinned: !folder.pinned }),
    },
    {
      label: 'Rename',
      action: () => setRenamingFolder(true),
    },
    {
      label: 'Delete',
      action: () => deleteFolder.mutate(folder.id),
      danger: true,
    },
  ]

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
        onContextMenu={openFolderCtx}
      >
        <button onClick={() => setOpen(!open)} className="text-muted-foreground shrink-0">
          <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {renamingFolder ? (
          <InlineInput
            defaultValue={folder.name}
            onConfirm={(name) => { updateFolder.mutate({ id: folder.id, name }); setRenamingFolder(false) }}
            onCancel={() => setRenamingFolder(false)}
          />
        ) : (
          <span className="flex-1 truncate text-foreground">{folder.name}</span>
        )}
        {folder.pinned && <Pin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
      </div>

      {folderCtx && (
        <ContextMenu
          x={folderCtx.x}
          y={folderCtx.y}
          items={folderMenuItems}
          onClose={() => setFolderCtx(null)}
        />
      )}

      {open && (
        <div>
          {addingFolder && (
            <div style={{ paddingLeft: `${20 + indent}px` }} className="pr-2 py-0.5">
              <InlineInput
                defaultValue=""
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
              <DocRow
                key={doc.id}
                doc={doc}
                active={active}
                indent={indent}
                onNavigate={() => navigate(`/documents/${doc.id}`)}
                onMove={(folderId) => moveDocument.mutate({ id: doc.id, folderId })}
                onContextMenu={(e) => openDocCtx(e, doc)}
                renamingDocId={renamingDocId}
                onConfirmRename={(title) => { updateDocument.mutate({ id: doc.id, title }); setRenamingDocId(null) }}
                onCancelRename={() => setRenamingDocId(null)}
              />
            )
          })}
        </div>
      )}

      {docCtx && (
        <ContextMenu
          x={docCtx.pos.x}
          y={docCtx.pos.y}
          items={[
            { label: 'Rename', action: () => setRenamingDocId(docCtx.doc.id) },
            { label: docCtx.doc.pinned ? 'Unpin' : 'Pin', action: () => pinDocument.mutate({ id: docCtx.doc.id, pinned: !docCtx.doc.pinned }) },
            { label: 'Delete', action: () => deleteDocument.mutate(docCtx.doc.id), danger: true },
          ]}
          onClose={() => setDocCtx(null)}
        />
      )}
    </div>
  )
}
