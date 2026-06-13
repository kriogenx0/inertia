import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ChevronRight, Folder, FileText, TableIcon, Pin } from 'lucide-react'
import {
  useCreateFolder, useCreateDocument, useDeleteFolder, useDeleteDocument,
  usePinFolder, usePinDocument, useUpdateFolder,
} from '@/api/workspace'
import { useUpdateDocument } from '@/api/documents'
import type { Folder as FolderType, Document } from '@/types'

// ── Context menu ─────────────────────────────────────────────────────────────

interface MenuItem { label: string; action: () => void; danger?: boolean }

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border rounded-lg shadow-lg py-1 w-44"
      style={{
        left: Math.min(x, window.innerWidth - 176),
        top: Math.min(y, window.innerHeight - items.length * 36 - 8),
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose() }}
          className={`flex w-full items-center px-3 py-1.5 text-sm ${item.danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950' : 'hover:bg-accent'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

// ── Inline rename ─────────────────────────────────────────────────────────────

function InlineInput({ defaultValue, onConfirm, onCancel }: { defaultValue: string; onConfirm: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const submitted = useRef(false)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      className="flex-1 min-w-0 text-sm px-1 py-0 rounded border border-input bg-card outline-none focus:ring-1 focus:ring-primary"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) { submitted.current = true; onConfirm(e.currentTarget.value.trim()) }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => { if (!submitted.current) onCancel() }}
    />
  )
}

// ── FolderItem ────────────────────────────────────────────────────────────────

export function FolderItem({ folder, depth = 0 }: { folder: FolderType; depth?: number }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)
  const [addingFolder, setAddingFolder] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState(false)
  const [renamingDocId, setRenamingDocId] = useState<number | null>(null)
  const [folderCtx, setFolderCtx] = useState<{ x: number; y: number } | null>(null)
  const [docCtx, setDocCtx] = useState<{ x: number; y: number; doc: Document } | null>(null)

  const createDocument = useCreateDocument()
  const createFolder = useCreateFolder()
  const deleteFolder = useDeleteFolder()
  const deleteDocument = useDeleteDocument()
  const pinFolder = usePinFolder()
  const pinDocument = usePinDocument()
  const updateFolder = useUpdateFolder()
  const updateDocument = useUpdateDocument()

  const indent = depth * 12

  const folderMenuItems: MenuItem[] = [
    { label: 'New Document', action: async () => { setOpen(true); const d = await createDocument.mutateAsync({ folderId: folder.id, title: 'Untitled', doc_type: 'document' }); navigate(`/documents/${d.id}`) } },
    { label: 'New Spreadsheet', action: async () => { setOpen(true); const d = await createDocument.mutateAsync({ folderId: folder.id, title: 'Untitled', doc_type: 'spreadsheet' }); navigate(`/documents/${d.id}`) } },
    { label: 'New Subfolder', action: () => { setOpen(true); setAddingFolder(true) } },
    { label: folder.pinned ? 'Unpin' : 'Pin', action: () => pinFolder.mutate({ id: folder.id, pinned: !folder.pinned }) },
    { label: 'Rename', action: () => setRenamingFolder(true) },
    { label: 'Delete', action: () => deleteFolder.mutate(folder.id), danger: true },
  ]

  return (
    <div>
      {/* Folder row */}
      <div
        className="group flex items-center gap-1 py-1 rounded-md hover:bg-accent cursor-pointer text-sm select-none"
        style={{ paddingLeft: `${8 + indent}px`, paddingRight: '8px' }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setFolderCtx({ x: e.clientX, y: e.clientY }) }}
      >
        <button onClick={() => setOpen((o) => !o)} className="text-muted-foreground shrink-0 p-0.5">
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

      {folderCtx && <ContextMenu x={folderCtx.x} y={folderCtx.y} items={folderMenuItems} onClose={() => setFolderCtx(null)} />}

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
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className={`flex items-center gap-1.5 w-full py-1 rounded-md text-sm hover:bg-accent ${active ? 'bg-accent' : ''}`}
                style={{ paddingLeft: `${36 + indent}px`, paddingRight: '8px' }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocCtx({ x: e.clientX, y: e.clientY, doc }) }}
              >
                {doc.doc_type === 'spreadsheet'
                  ? <TableIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  : <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                }
                {renamingDocId === doc.id ? (
                  <InlineInput
                    defaultValue={doc.title}
                    onConfirm={(title) => { updateDocument.mutate({ id: doc.id, title }); setRenamingDocId(null) }}
                    onCancel={() => setRenamingDocId(null)}
                  />
                ) : (
                  <span className="flex-1 truncate text-left select-none">{doc.title}</span>
                )}
                {doc.pinned && <Pin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
              </Link>
            )
          })}
        </div>
      )}

      {docCtx && (
        <ContextMenu
          x={docCtx.x}
          y={docCtx.y}
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
