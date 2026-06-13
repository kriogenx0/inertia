import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, X, Flag, Trophy, ChevronLeft, ChevronRight,
  LayoutList, Calendar, Loader2,
} from 'lucide-react'
import {
  format, isPast, isToday, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths,
} from 'date-fns'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import {
  useEvents, useCreateEvent, useDeleteEvent,
  useAddTaskToEvent, useRemoveTaskFromEvent,
} from '@/api/events'
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
  return type === 'deadline' ? <Flag className={className} /> : <Trophy className={className} />
}

function dateBadgeClass(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isPast(d) && !isToday(d)) return 'text-red-500'
  if (isToday(d)) return 'text-orange-500'
  return 'text-muted-foreground'
}

// ── Task picker ───────────────────────────────────────────────────────────────

function TaskPicker({ availableTasks, onAdd, onClose }: {
  availableTasks: Task[]
  onAdd: (task: Task) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = availableTasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="absolute z-20 bottom-8 left-0 w-full bg-card border rounded-lg shadow-lg overflow-hidden">
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
        {filtered.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No tasks found</p>}
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

// ── Right sidebar ─────────────────────────────────────────────────────────────

type SidebarState =
  | { mode: 'new'; defaultDate: string }
  | { mode: 'event'; event: WorkspaceEvent }
  | null

function EventSidebar({ state, onClose }: { state: SidebarState; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  const lastState = useRef<SidebarState>(null)
  if (state) lastState.current = state

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (state) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [!!state])

  useEffect(() => {
    if (state) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [!!state])

  const navigate = useNavigate()
  const createEvent = useCreateEvent()
  const deleteEvent = useDeleteEvent()
  const addTask = useAddTaskToEvent()
  const removeTask = useRemoveTaskFromEvent()
  const { data: allTasks = [] } = useTasks()
  const [showPicker, setShowPicker] = useState(false)

  // new-event form state
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(state?.mode === 'new' ? state.defaultDate : '')
  const [type, setType] = useState<'deadline' | 'milestone'>('milestone')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.mode === 'new') {
      setTitle('')
      setDate(state.defaultDate)
      setType('milestone')
      setTimeout(() => titleInputRef.current?.focus(), 20)
    }
  }, [state?.mode === 'new' ? state.defaultDate : null])

  const rendered = state ?? lastState.current
  if (!rendered && !visible) return null

  const sidebarClass = `w-72 border-l flex flex-col bg-card shrink-0 transition-all duration-150 overflow-hidden ${
    visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
  }`

  if (!state) return null

  if (rendered?.mode === 'new') {
    function submit(e: React.FormEvent) {
      e.preventDefault()
      if (!title.trim() || !date) return
      createEvent.mutate({ title: title.trim(), date, event_type: type })
      onClose()
    }

    return (
      <aside className={sidebarClass}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-sm">New Event</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 p-4">
          <input
            ref={titleInputRef}
            autoFocus
            placeholder="Event title"
            className="text-sm outline-none bg-transparent border-b border-input pb-1 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <input
              type="date"
              required
              className="text-sm outline-none bg-transparent border border-input rounded px-2 py-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <div className="flex gap-2">
              {(['milestone', 'deadline'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border flex-1 justify-center ${type === t ? 'bg-accent border-accent-foreground/20 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  <EventTypeIcon type={t} className="w-3 h-3" />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="mt-2 w-full text-sm bg-primary text-primary-foreground py-1.5 rounded-md hover:opacity-90"
          >
            Create
          </button>
        </form>
      </aside>
    )
  }

  // mode === 'event'
  const event = (rendered as { mode: 'event'; event: WorkspaceEvent }).event
  const linkedIds = new Set(event.tasks.map((t) => t.id))
  const available = allTasks.filter((t) => !linkedIds.has(t.id))

  return (
    <aside className={sidebarClass}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <EventTypeIcon
            type={event.event_type}
            className={`w-4 h-4 shrink-0 ${event.event_type === 'deadline' ? 'text-red-500' : 'text-purple-500'}`}
          />
          <span className="font-semibold text-sm truncate">{event.title}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Date */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Date</p>
          <p className={`text-sm font-medium ${dateBadgeClass(event.date)}`}>
            {format(new Date(event.date + 'T00:00:00'), 'MMMM d, yyyy')}
          </p>
        </div>

        {/* Type */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Type</p>
          <div className="flex items-center gap-1.5">
            <EventTypeIcon
              type={event.event_type}
              className={`w-3.5 h-3.5 ${event.event_type === 'deadline' ? 'text-red-500' : 'text-purple-500'}`}
            />
            <span className="text-sm capitalize">{event.event_type}</span>
          </div>
        </div>

        {/* Tasks */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Tasks</p>
          <div className="flex flex-col gap-1">
            {event.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-1 group/task">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status]}`} />
                <span
                  className="text-sm flex-1 truncate cursor-pointer hover:underline"
                  onClick={() => task.document_id && navigate(`/documents/${task.document_id}`)}
                >
                  {task.title}
                </span>
                <button
                  onClick={() => removeTask.mutate({ eventId: event.id, taskId: task.id })}
                  className="opacity-0 group-hover/task:opacity-100 text-muted-foreground hover:text-red-500 shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {event.tasks.length === 0 && (
              <p className="text-xs text-muted-foreground">No tasks linked</p>
            )}
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
      </div>

      <div className="border-t p-4">
        <button
          onClick={() => { deleteEvent.mutate(event.id); onClose() }}
          className="w-full text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 border border-red-200 dark:border-red-900 py-1.5 rounded-md"
        >
          Delete event
        </button>
      </div>
    </aside>
  )
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({ events, onDayClick, onEventClick, selectedDate }: {
  events: WorkspaceEvent[]
  onDayClick: (dateStr: string) => void
  onEventClick: (event: WorkspaceEvent) => void
  selectedDate?: string
}) {
  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  })

  const byDate: Record<string, WorkspaceEvent[]> = {}
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = []
    byDate[ev.date].push(ev)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0">
        <button
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-sm w-32 text-center">{format(month, 'MMMM yyyy')}</span>
        <button
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="ml-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 border-b shrink-0">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 overflow-hidden" style={{ gridAutoRows: '1fr' }}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = byDate[key] ?? []
          const inMonth = isSameMonth(day, month)
          const isT = isToday(day)
          const isSelected = key === selectedDate

          return (
            <div
              key={key}
              onClick={() => onDayClick(key)}
              className={`border-r border-b p-1.5 flex flex-col gap-0.5 cursor-pointer min-h-0 overflow-hidden transition-colors
                ${!inMonth ? 'opacity-30' : ''}
                ${isSelected ? 'bg-primary/10' : 'hover:bg-accent/30'}`}
            >
              <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 self-start
                ${isT ? 'bg-primary text-primary-foreground' : isSelected ? 'text-primary font-semibold' : 'text-foreground'}`}>
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                    className={`text-xs px-1.5 py-0.5 rounded truncate text-left w-full
                      ${ev.event_type === 'deadline'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900'}`}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-muted-foreground px-1">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ events, onEventClick }: {
  events: WorkspaceEvent[]
  onEventClick: (event: WorkspaceEvent) => void
}) {
  const upcoming = events.filter((e) => !isPast(new Date(e.date + 'T00:00:00')) || isToday(new Date(e.date + 'T00:00:00')))
  const past = events.filter((e) => isPast(new Date(e.date + 'T00:00:00')) && !isToday(new Date(e.date + 'T00:00:00')))

  function EventRow({ event, dim }: { event: WorkspaceEvent; dim?: boolean }) {
    return (
      <button
        onClick={() => onEventClick(event)}
        className={`flex items-center gap-3 w-full px-4 py-3 border rounded-xl bg-card hover:bg-accent text-left transition-colors ${dim ? 'opacity-60' : ''}`}
      >
        <EventTypeIcon
          type={event.event_type}
          className={`w-4 h-4 shrink-0 ${event.event_type === 'deadline' ? 'text-red-500' : 'text-purple-500'}`}
        />
        <span className="font-medium text-sm flex-1 truncate">{event.title}</span>
        {event.tasks.length > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">{event.tasks.length} task{event.tasks.length !== 1 ? 's' : ''}</span>
        )}
        <span className={`text-xs shrink-0 ${dateBadgeClass(event.date)}`}>
          {format(new Date(event.date + 'T00:00:00'), 'MMM d, yyyy')}
        </span>
      </button>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {upcoming.length === 0 && past.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No events yet</p>
              <p className="text-sm text-muted-foreground">Create an event to get started.</p>
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h2>
            <div className="flex flex-col gap-2">
              {upcoming.map((e) => <EventRow key={e.id} event={e} />)}
            </div>
          </section>
        )}
        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h2>
            <div className="flex flex-col gap-2">
              {past.map((e) => <EventRow key={e.id} event={e} dim />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: events = [], isLoading } = useEvents()
  const view = searchParams.get('view') === 'month' ? 'month' : 'list'
  const [sidebar, setSidebar] = useState<SidebarState>(null)

  function todayISO() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function openNew(defaultDate?: string) {
    setSidebar({ mode: 'new', defaultDate: defaultDate ?? todayISO() })
  }

  function openEvent(event: WorkspaceEvent) {
    setSidebar({ mode: 'event', event })
  }

  // Keep sidebar event data fresh when events refetch
  if (sidebar?.mode === 'event') {
    const fresh = events.find((e) => e.id === sidebar.event.id)
    if (fresh && fresh !== sidebar.event) {
      setSidebar({ mode: 'event', event: fresh })
    }
  }

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b px-6 py-3 shrink-0 flex items-center gap-4">
            <h1 className="text-xl font-semibold">Events</h1>
            <div className="flex gap-1">
              <button
                onClick={() => navigate('/events?view=list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm ${view === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                List
              </button>
              <button
                onClick={() => navigate('/events?view=month')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm ${view === 'month' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Month
              </button>
            </div>
            <button
              onClick={() => openNew()}
              className="ml-auto flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90"
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

          {!isLoading && view === 'month' && (
            <MonthView
              events={events}
              onDayClick={(date) => openNew(date)}
              onEventClick={openEvent}
              selectedDate={
                sidebar?.mode === 'new' ? sidebar.defaultDate :
                sidebar?.mode === 'event' ? sidebar.event.date : undefined
              }
            />
          )}

          {!isLoading && view === 'list' && (
            <ListView events={events} onEventClick={openEvent} />
          )}
        </div>

        <EventSidebar state={sidebar} onClose={() => setSidebar(null)} />
      </div>
    </WorkspaceLayout>
  )
}
