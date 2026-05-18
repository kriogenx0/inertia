import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, ArrowRight, Loader2 } from 'lucide-react'
import Sidebar from '@/components/file-manager/Sidebar'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import type { Task } from '@/types'

const STATUSES: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', dot: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { key: 'in_review', label: 'In Review', dot: 'bg-yellow-500' },
  { key: 'done', label: 'Done', dot: 'bg-green-500' },
]

const NEXT_STATUS: Record<Task['status'], Task['status'] | null> = {
  todo: 'in_progress',
  in_progress: 'in_review',
  in_review: 'done',
  done: null,
}

export default function TasksPage() {
  const navigate = useNavigate()
  const { data: tasks = [], isLoading } = useTasks()
  const { data: workspace } = useWorkspace()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [addingTo, setAddingTo] = useState<Task['status'] | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const allDocs = workspace?.folders?.flatMap((f) => f.documents ?? []) ?? []

  async function handleCreateTask(status: Task['status']) {
    const trimmed = newTaskTitle.trim()
    if (!trimmed || allDocs.length === 0) return
    setAddingTo(null)
    setNewTaskTitle('')
    await createTask.mutateAsync({ documentId: allDocs[0].id, title: trimmed, status })
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-4 shrink-0">
          <h1 className="text-xl font-semibold">Tasks</h1>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && (
          <div className="flex-1 overflow-auto p-6">
            <div className="flex gap-4 h-full min-w-max">
              {STATUSES.map(({ key, label, dot }) => {
                const columnTasks = tasks.filter((t) => t.status === key)
                return (
                  <div key={key} className="w-60 flex flex-col gap-2 shrink-0">
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
                                title={`Move to ${STATUSES.find((s) => s.key === NEXT_STATUS[task.status])?.label}`}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {addingTo === key ? (
                        <div className="bg-card border rounded-lg p-2">
                          <input
                            autoFocus
                            placeholder="Task title…"
                            className="w-full text-sm outline-none bg-transparent"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateTask(key)
                              if (e.key === 'Escape') {
                                setAddingTo(null)
                                setNewTaskTitle('')
                              }
                            }}
                            onBlur={() => {
                              setAddingTo(null)
                              setNewTaskTitle('')
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => allDocs.length > 0 && setAddingTo(key)}
                          disabled={allDocs.length === 0}
                          title={allDocs.length === 0 ? 'Create a document first' : 'Add task'}
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
      </div>
    </div>
  )
}
