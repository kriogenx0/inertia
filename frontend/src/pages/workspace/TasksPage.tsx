import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, ArrowRight, Play, Loader2, Search, Filter } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type TaskFilters } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import type { Task } from '@/types'

const KANBAN_STATUSES: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', dot: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { key: 'in_review', label: 'In Review', dot: 'bg-yellow-500' },
  { key: 'done', label: 'Done', dot: 'bg-green-500' },
]

const KANBAN_KEYS = KANBAN_STATUSES.map((s) => s.key)

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

function isColumnId(id: UniqueIdentifier): id is Task['status'] {
  return KANBAN_KEYS.includes(id as Task['status'])
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  task: Task
  onDelete?: () => void
  onNext: (() => void) | null
  onNavigate: () => void
  overlay?: boolean
}

function TaskCard({ task, onNext, onNavigate, overlay }: Omit<CardProps, 'onDelete'>) {
  return (
    <div className={`bg-card border rounded-lg p-3 select-none ${overlay ? 'shadow-xl rotate-1 opacity-95' : ''}`}>
      <div className="flex items-start gap-2">
        <p className="text-sm leading-snug flex-1">{task.title}</p>
      </div>
      <div className="flex items-center justify-between mt-2">
        {task.document && (
          <button
            onClick={onNavigate}
            className="text-xs text-muted-foreground hover:underline truncate max-w-[130px]"
          >
            {task.document.title}
          </button>
        )}
        {onNext && !overlay && (
          <button
            onClick={onNext}
            className="ml-auto text-muted-foreground hover:text-foreground"
            title={`Move to ${STATUS_LABEL[NEXT_STATUS[task.status]!]}`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function SortableCard(props: Omit<CardProps, 'onDelete'>) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }}
      className="cursor-grab active:cursor-grabbing"
    >
      <TaskCard {...props} />
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({ status, label, dot, tasks, children }: {
  status: Task['status']
  label: string
  dot: string
  tasks: Task[]
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: status })
  return (
    <div className="w-64 flex flex-col shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-2 flex-1 min-h-[40px]">
          {children}
        </div>
      </SortableContext>
    </div>
  )
}

// ── AddTaskInput ──────────────────────────────────────────────────────────────

interface AddTaskInputProps {
  onAdd: (title: string, dueDate: string) => void
  onCancel: () => void
}

function AddTaskInput({ onAdd, onCancel }: AddTaskInputProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const titleRef = useRef('')
  const dateRef = useRef<HTMLInputElement>(null)

  function commit() {
    if (titleRef.current.trim()) onAdd(titleRef.current.trim(), dueDate)
    else onCancel()
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        placeholder="Task title…"
        className="flex-1 text-sm outline-none bg-transparent border-b border-input pb-1"
        value={title}
        onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={(e) => { if (!dateRef.current?.contains(e.relatedTarget as Node)) commit() }}
      />
      <input
        ref={dateRef}
        type="date"
        className="text-xs text-muted-foreground bg-transparent border-b border-input pb-1 outline-none cursor-pointer"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        onBlur={commit}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'kanban' ? 'kanban' : 'backlog'

  const [filters, setFilters] = useState<TaskFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const { data: workspace } = useWorkspace()

  const activeFilters: TaskFilters = {
    ...(filters.folder_id ? { folder_id: filters.folder_id } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
  }

  const { data: tasks = [], isLoading } = useTasks(activeFilters)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [addingTo, setAddingTo] = useState<Task['status'] | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') setAddingTo('backlog')
  }, [searchParams])

  // Local task list for optimistic DnD reordering
  const localRef = useRef<Task[]>(tasks)
  const [localTasks, setLocalTasksState] = useState<Task[]>(tasks)
  const [activeId, setActiveId] = useState<number | null>(null)

  function setLocalTasks(updater: (prev: Task[]) => Task[]) {
    setLocalTasksState((prev) => {
      const next = updater(prev)
      localRef.current = next
      return next
    })
  }

  // Sync server → local when not dragging
  useEffect(() => {
    if (activeId === null) {
      localRef.current = tasks
      setLocalTasksState(tasks)
    }
  }, [tasks, activeId])

  const activeTask = activeId !== null ? localRef.current.find((t) => t.id === activeId) ?? null : null

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as number)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const dragId = active.id as number
    const overId = over.id

    const current = localRef.current
    const dragTask = current.find((t) => t.id === dragId)
    if (!dragTask) return

    const targetStatus = isColumnId(overId)
      ? overId
      : current.find((t) => t.id === (overId as number))?.status

    if (!targetStatus || targetStatus === dragTask.status) return

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === dragId ? { ...t, status: targetStatus } : t))
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const dragId = active.id as number
    const current = localRef.current

    if (over && !isColumnId(over.id)) {
      const overId = over.id as number
      const dragTask = current.find((t) => t.id === dragId)
      const overTask = current.find((t) => t.id === overId)

      if (dragTask && overTask && dragTask.status === overTask.status) {
        const col = current.filter((t) => t.status === dragTask.status)
        const from = col.findIndex((t) => t.id === dragId)
        const to = col.findIndex((t) => t.id === overId)
        if (from !== -1 && to !== -1 && from !== to) {
          const reordered = arrayMove(col, from, to)
          setLocalTasks((prev) => [
            ...prev.filter((t) => t.status !== dragTask.status),
            ...reordered,
          ])
        }
      }
    }

    // Persist status change if it moved columns
    const original = tasks.find((t) => t.id === dragId)
    const updated = localRef.current.find((t) => t.id === dragId)
    if (original && updated && original.status !== updated.status) {
      updateTask.mutate({ id: dragId, status: updated.status })
    }

    setActiveId(null)
  }

  function onDragCancel() {
    setActiveId(null)
    localRef.current = tasks
    setLocalTasksState(tasks)
  }

  function createTaskWith(title: string, status: Task['status'], dueDate: string) {
    createTask.mutate({ title, status, dueDate })
  }

  return (
    <WorkspaceLayout>
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
              Workboard
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search tasks…"
                className="pl-7 pr-3 py-1 text-sm rounded-md border border-input bg-transparent outline-none focus:ring-1 focus:ring-primary w-44"
              />
            </div>
            <button
              onClick={() => setShowFilters((o) => !o)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm border ${showFilters || filters.folder_id || filters.status ? 'border-primary text-primary' : 'border-input text-muted-foreground hover:text-foreground'}`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
              {(filters.folder_id || filters.status) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="border-b px-6 py-2 shrink-0 flex items-center gap-3 bg-muted/20">
            <span className="text-xs text-muted-foreground font-medium">Folder</span>
            <select
              className="text-sm rounded border border-input bg-card px-2 py-1 outline-none"
              value={filters.folder_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, folder_id: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">All folders</option>
              {workspace?.folders?.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground font-medium">Status</span>
            <select
              className="text-sm rounded border border-input bg-card px-2 py-1 outline-none"
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
            >
              <option value="">Any status</option>
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
            {(filters.folder_id || filters.status) && (
              <button
                onClick={() => setFilters({})}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && view === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            <div className="flex-1 overflow-auto p-4">
              <div className="flex gap-4 h-full min-w-max">
                {KANBAN_STATUSES.map(({ key, label, dot }) => {
                  const colTasks = localTasks.filter((t) => t.status === key)
                  return (
                    <KanbanColumn key={key} status={key} label={label} dot={dot} tasks={colTasks}>
                      {colTasks.map((task) => (
                        <SortableCard
                          key={task.id}
                          task={task}
                          onNext={NEXT_STATUS[task.status] ? () => updateTask.mutate({ id: task.id, status: NEXT_STATUS[task.status]! }) : null}
                          onNavigate={() => navigate(`/documents/${task.document_id}`)}
                        />
                      ))}
                      {addingTo === key ? (
                        <div className="bg-card border rounded-lg p-2">
                          <AddTaskInput
                            onAdd={(title, dueDate) => { createTaskWith(title, key, dueDate); setAddingTo(null) }}
                            onCancel={() => setAddingTo(null)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingTo(key)}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-1 py-1 rounded"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add task
                        </button>
                      )}
                    </KanbanColumn>
                  )
                })}
              </div>
            </div>

            <DragOverlay>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  onNext={null}
                  onNavigate={() => {}}
                  overlay
                />
              )}
            </DragOverlay>
          </DndContext>
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
                  onClick={() => setAddingTo('backlog')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {addingTo === 'backlog' && (
                <div className="mb-2 px-1">
                  <AddTaskInput
                    onAdd={(title, dueDate) => { createTaskWith(title, 'backlog', dueDate); setAddingTo(null) }}
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
    </WorkspaceLayout>
  )
}
