import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Target, Loader2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics, useCreateEpic, useDeleteEpic } from '@/api/epics'

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export default function EpicsPage() {
  const navigate = useNavigate()
  const { data: epics = [], isLoading } = useEpics()
  const createEpic = useCreateEpic()
  const deleteEpic = useDeleteEpic()
  const [adding, setAdding] = useState(false)
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    if (title) createEpic.mutate({ title })
    setAdding(false)
  }

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-3 shrink-0 flex items-center gap-4">
          <h1 className="text-xl font-semibold">Epics</h1>
          <button
            onClick={() => setAdding(true)}
            className="ml-auto flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New epic
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-6 px-6 flex flex-col gap-3">
            {adding && (
              <div className="bg-card border rounded-lg p-4">
                <input
                  autoFocus
                  placeholder="Epic title…"
                  className="w-full text-sm outline-none bg-transparent border-b border-input pb-1"
                  onChange={(e) => { titleRef.current = e.target.value }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAdd(titleRef.current)
                    if (e.key === 'Escape') setAdding(false)
                  }}
                  onBlur={(e) => commitAdd(e.currentTarget.value)}
                />
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && epics.length === 0 && !adding && (
              <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
                <Target className="w-8 h-8 opacity-30" />
                <p className="text-sm">No epics yet</p>
              </div>
            )}

            {epics.map((epic) => {
              const percent = epic.tasks_count > 0
                ? Math.round((epic.done_tasks_count / epic.tasks_count) * 100)
                : 0
              return (
                <div
                  key={epic.id}
                  onClick={() => navigate(`/tasks?epic_id=${epic.id}`)}
                  className="bg-card border rounded-lg p-4 flex flex-col gap-2 cursor-pointer hover:border-primary group"
                >
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium flex-1 truncate">{epic.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {epic.done_tasks_count}/{epic.tasks_count} done
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteEpic.mutate(epic.id) }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ProgressBar percent={percent} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
