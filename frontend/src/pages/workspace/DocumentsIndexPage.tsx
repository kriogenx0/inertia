import { useNavigate } from 'react-router-dom'
import { FileText, Table as TableIcon, Loader2 } from 'lucide-react'
import { useWorkspace } from '@/api/workspace'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import type { Document } from '@/types'

export default function DocumentsIndexPage() {
  const navigate = useNavigate()
  const { data: workspace, isLoading } = useWorkspace()

  const allDocs: (Document & { folderName: string })[] =
    workspace?.folders?.flatMap((f) =>
      (f.documents ?? []).map((d) => ({ ...d, folderName: f.name }))
    ) ?? []

  return (
    <WorkspaceLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-6">
          <h1 className="text-2xl font-semibold mb-6">Documents</h1>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && allDocs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No documents yet.</p>
          )}

          {!isLoading && allDocs.length > 0 && (
            <div className="flex flex-col divide-y">
              {allDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="flex items-center gap-3 py-2.5 hover:bg-accent rounded-md px-2 text-left group"
                >
                  {doc.doc_type === 'spreadsheet'
                    ? <TableIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                  <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{doc.folderName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
