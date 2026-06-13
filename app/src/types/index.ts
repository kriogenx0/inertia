export interface Document {
  id: number
  title: string
  doc_type: 'document' | 'spreadsheet'
  folder_id: number
  pinned: boolean
  created_at: string
  updated_at: string
  content_updated_at: string | null
  content?: Record<string, unknown> | null
}

export interface Folder {
  id: number
  name: string
  parent_id: number | null
  position: number
  pinned: boolean
  children: Folder[]
  documents: Document[]
}

export interface Workspace {
  id: number
  name: string
  folders: Folder[]
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'backlog'
  due_date: string | null
  position: number
  document_id: number
  assignee_id: number | null
  document?: Document
}

export interface WorkspaceEvent {
  id: number
  title: string
  description: string | null
  date: string
  start_time: string | null
  end_time: string | null
  event_type: 'deadline' | 'milestone'
  tasks: Task[]
  created_at: string
  updated_at: string
}
