import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useTasks } from '@/api/tasks'

const STATUS_DOT: Record<string, string> = {
  backlog: 'bg-zinc-400',
  todo: 'bg-zinc-500',
  in_progress: 'bg-blue-500',
  in_review: 'bg-yellow-500',
  done: 'bg-green-500',
}

function WorkspaceTaskItemView({ node }: NodeViewProps) {
  const { data: tasks = [] } = useTasks()
  const taskId = node.attrs.taskId as number | null
  const task = tasks.find((t) => t.id === taskId)
  const status = task?.status ?? 'backlog'
  const dotClass = STATUS_DOT[status] ?? 'bg-zinc-400'

  return (
    <NodeViewWrapper as="li" className="flex items-start gap-2 my-0.5">
      <span
        className={`w-2 h-2 rounded-full mt-[0.4rem] shrink-0 ${dotClass} ${!taskId ? 'opacity-40' : ''}`}
        title={task ? `Status: ${status.replace('_', ' ')}` : 'Unsaved task'}
      />
      <NodeViewContent as="div" className="flex-1 min-w-0" />
    </NodeViewWrapper>
  )
}

export const WorkspaceTaskItem = Node.create({
  name: 'workspaceTaskItem',
  content: 'paragraph',
  defining: true,

  addAttributes() {
    return {
      taskId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'li[data-type="workspaceTaskItem"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes({ 'data-type': 'workspaceTaskItem' }, HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(WorkspaceTaskItemView)
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
    }
  },
})
