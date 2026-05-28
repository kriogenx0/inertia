import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Flag, Trophy, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import Sidebar from '@/components/file-manager/Sidebar'
import { useEvents, useCreateEvent, useDeleteEvent, useAddTaskToEvent, useRemoveTaskFromEvent } from '@/api/events'
import { useTasks } from '@/api/tasks'
import type { WorkspaceEvent, Task } from '@/types'

const STATUS_DOT: Record<Task['status'], string> = {
  backlog: 'bg-zinc-400',
  todo: 'bg-zinc-500',
  in_progress: 'bg-blue-500',
  in_review: 'bg-yellow-500',
  done: 'bg-green-500',
}

function EventTypeIcon({ type, className }: { type: WorkspaceEvent['event_type']; className?: string }) {
  return type === 'deadline'
    ? <Flag className={className} />
    : <Trophy className={className} />
}

function dateBadgeClass(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isPast(d) && !isToday(d)) return 'text-red-500'
  if (isToday(d)) return 'text-orange-500'
  return 'text-muted-foreground'
}

interface NewEventFormProps {
  onSave: (data: { title: string; date: string; event_type: 'deadline' | 'milestone' }) => void
  onCancel: () => void
}

function NewEventForm({ onSave, onCancel }: NewEventFormProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'deadline' | 'milestone'>('milestone')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    onSave({ title: title.trim(), date, event_type: type })
  }

  return (
    <form onSubmit={submit} className="border rounded-xl p-4 bg-card flex flex-col gap-3">
      <input
        autoFocus
        placeholder="Event title"
        className="text-sm font-medium outline-none bg-transparent border-b border-input pb-1 w-full"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <input
          type="date"
          required
          className="text-sm outline-none bg-transparent border border-input rounded px-2 py-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="flex gap-2">
          {(['milestone', 'deadline'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border ${type === t ? 'bg-accent border-accent-foreground/20 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <EventTypeIcon type={t} className="w-3 h-3" />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
          <button type="submit" className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md">Create</button>
        </div>
      </div>
    </form>
  )
}

interface TaskPickerProps {
  availableTasks: Task[]
  onAdd: (task: Task) => void
  onClose: () => void
}

function TaskPicker({ availableTasks, onAdd, onClose }: TaskPickerProps) {
  const [query, setQuery] = useState('')
  const filtered = availableTasks.filter((t) =>
    t.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="absolute z-20 mt-1 w-64 bg-card border rounded-lg shadow-lg overflow-hidden">
      <div className="p-2 border-b">
        <input
          autoFocus
          placeholder="Search tasks…"
          className="w-full text-sm outline-none bg-transparent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">No tasks found</p>
        )}
        {filtered.map((task) => (
          <button
            key={task.id}
            onClick={() => { onAdd(task); onClose() }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status]}`} />
            <span className="truncate">{task.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function EventCard({ event }: { event: WorkspaceEvent }) {
  const navigate = useNavigate()
  const deleteEvent = useDeleteEvent()
  const addTask = useAddTaskToEvent()
  const removeTask = useRemoveTaskFromEvent()
  const { data: allTasks = [] } = useTasks()
  const [expanded, setExpanded] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  const linkedIds = new Set(event.tasks.map((t) => t.id))
  const available = allTasks.filter((t) => !linkedIds.has(t.id))

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <EventTypeIcon
          type={event.event_type}
          className={`w-4 h-4 shrink-0 ${event.event_type === 'deadline' ? 'text-red-500' : 'text-purple-500'}`}
        />
        <span className="font-medium text-sm flex-1">{event.title}</span>
        <span className={`text-xs shrink-0 ${dateBadgeClass(event.date)}`}>
          {format(new Date(event.date + 'T00:00:00'), 'MMM d, yyyy')}
        </span>
        <button
          onClick={() => deleteEvent.mutate(event.id)}
          className="text-muted-foreground hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t px-4 py-2">
          {event.description && (
            <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
          )}

          <div className="flex flex-col gap-1">
            {event.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-1 group/task">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status]}`} />
                <span
                  className="text-sm flex-1 cursor-pointer hover:underline"
                  onClick={() => task.document_id && navigate(`/documents/${task.document_id}`)}
                >
                  {task.title}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {task.status.replace('_', ' ')}
                </span>
                <button
                  onClick={() => removeTask.mutate({ eventId: event.id, taskId: task.id })}
                  className="opacity-0 group-hover/task:opacity-100 text-muted-foreground hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="relative mt-2">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add task
            </button>
            {showPicker && (
              <TaskPicker
                availableTasks={available}
                onAdd={(task) => addTask.mutate({ eventId: event.id, taskId: task.id })}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EventsPage() {
  const { data: events = [], isLoading } = useEvents()
  const createEvent = useCreateEvent()
  const [showForm, setShowForm] = useState(false)

  const upcoming = events.filter((e) => !isPast(new Date(e.date + 'T00:00:00')) || isToday(new Date(e.date + 'T00:00:00')))
  const past = events.filter((e) => isPast(new Date(e.date + 'T00:00:00')) && !isToday(new Date(e.date + 'T00:00:00')))

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-4 shrink-0 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Events</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New event
          </button>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              {showForm && (
                <NewEventForm
                  onSave={(data) => { createEvent.mutate(data); setShowForm(false) }}
                  onCancel={() => setShowForm(false)}
                />
              )}

              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h2>
                  <div className="flex flex-col gap-3">
                    {upcoming.map((event) => (
                      <div key={event.id} className="group">
                        <EventCard event={event} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {upcoming.length === 0 && !showForm && (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}

              {past.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h2>
                  <div className="flex flex-col gap-3 opacity-60">
                    {past.map((event) => (
                      <div key={event.id} className="group">
                        <EventCard event={event} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
