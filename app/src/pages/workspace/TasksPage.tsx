import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, ArrowRight, Play, Loader2 } from 'lucide-react'
import Sidebar from '@/components/file-manager/Sidebar'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import type { Task } from '@/types'

const KANBAN_STATUSES: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', dot: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { key: 'in_review', label: 'In Review', dot: 'bg-yellow-500' },
  { key: 'done', label: 'Done', dot: 'bg-green-500' },
]

const NEXT_STATUS: Record<Task['status'], Task['status'] | null> = {
  backlog: 'todo',
  todo: 'in_progress',
  in_progress: 'in_review',
  in_review: 'done',
  done: null,
}

const STATUS_LABEL: Record<Task['status'], string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

interface AddTaskInputProps {
  onAdd: (title: string) => void
  onCancel: () => void
}

function AddTaskInput({ onAdd, onCancel }: AddTaskInputProps) {
  const [value, setValue] = useState('')
  return (
    <input
      autoFocus
      placeholder="Task title…"
      className="w-full text-sm outline-none bg-transparent border-b border-input pb-1"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && value.trim()) onAdd(value.trim())
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={onCancel}
    />
  )
}

export default function TasksPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'kanban' ? 'kanban' : 'backlog'

  const { data: tasks = [], isLoading } = useTasks()
  const { data: workspace } = useWorkspace()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [addingTo, setAddingTo] = useState<Task['status'] | null>(null)

  const allDocs = workspace?.folders?.flatMap((f) => f.documents ?? []) ?? []
  const canAdd = allDocs.length > 0

  function createTaskWith(title: string, status: Task['status']) {
    if (!canAdd) return
    createTask.mutate({ documentId: allDocs[0].id, title, status })
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-3 shrink-0 flex items-center gap-4">
          <h1 className="text-xl font-semibold">Tasks</h1>
          <div className="flex gap-1">
            <button
              onClick={() => navigate('/tasks?view=backlog')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'backlog' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Backlog
            </button>
            <button
              onClick={() => navigate('/tasks?view=kanban')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'kanban' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Kanban
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && view === 'kanban' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex gap-4 h-full min-w-max">
              {KANBAN_STATUSES.map(({ key, label, dot }) => {
                const columnTasks = tasks.filter((t) => t.status === key)
                return (
                  <div key={key} className="w-64 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <span className="text-sm font-semibold">{label}</span>
                      <span className="text-xs text-muted-foreground">{columnTasks.length}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {columnTasks.map((task) => (
                        <div key={task.id} className="bg-card border rounded-lg p-3 group">
                          <div className="flex items-start gap-2">
                            <p className="text-sm leading-snug flex-1">{task.title}</p>
                            <button
                              onClick={() => deleteTask.mutate(task.id)}
                              className="hidden group-hover:flex shrink-0 text-muted-foreground hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {task.document && (
                              <button
                                onClick={() => navigate(`/documents/${task.document_id}`)}
                                className="text-xs text-muted-foreground hover:underline truncate max-w-[130px]"
                              >
                                {task.document.title}
                              </button>
                            )}
                            {NEXT_STATUS[task.status] && (
                              <button
                                onClick={() =>
                                  updateTask.mutate({ id: task.id, status: NEXT_STATUS[task.status]! })
                                }
                                className="ml-auto text-muted-foreground hover:text-foreground"
                                title={`Move to ${STATUS_LABEL[NEXT_STATUS[task.status]!]}`}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {addingTo === key ? (
                        <div className="bg-card border rounded-lg p-2">
                          <AddTaskInput
                            onAdd={(title) => { createTaskWith(title, key); setAddingTo(null) }}
                            onCancel={() => setAddingTo(null)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => canAdd && setAddingTo(key)}
                          disabled={!canAdd}
                          title={!canAdd ? 'Create a document first' : 'Add task'}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-1 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add task
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!isLoading && view === 'backlog' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-6 px-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">Backlog</span>
                  <span className="text-xs text-muted-foreground">{tasks.filter((t) => t.status === 'backlog').length}</span>
                </div>
                <button
                  onClick={() => canAdd && setAddingTo('backlog')}
                  disabled={!canAdd}
                  title={!canAdd ? 'Create a document first' : 'Add task'}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {addingTo === 'backlog' && (
                <div className="mb-2 px-1">
                  <AddTaskInput
                    onAdd={(title) => { createTaskWith(title, 'backlog'); setAddingTo(null) }}
                    onCancel={() => setAddingTo(null)}
                  />
                </div>
              )}

              <div className="flex flex-col divide-y">
                {tasks.filter((t) => t.status === 'backlog').map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-2 group">
                    <p className="text-sm flex-1">{task.title}</p>
                    {task.document && (
                      <button
                        onClick={() => navigate(`/documents/${task.document_id}`)}
                        className="text-xs text-muted-foreground hover:underline truncate max-w-[160px] shrink-0"
                      >
                        {task.document.title}
                      </button>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={() => updateTask.mutate({ id: task.id, status: 'todo' })}
                        title="Move to To Do"
                        className="text-muted-foreground hover:text-blue-500"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask.mutate(task.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.filter((t) => t.status === 'backlog').length === 0 && !addingTo && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No backlog items</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
