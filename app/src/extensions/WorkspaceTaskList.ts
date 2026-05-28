import { Node, mergeAttributes } from '@tiptap/core'

export const WorkspaceTaskList = Node.create({
  name: 'workspaceTaskList',
  group: 'block',
  content: 'workspaceTaskItem+',

  parseHTML() {
    return [{ tag: 'ul[data-type="workspaceTaskList"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['ul', mergeAttributes({ 'data-type': 'workspaceTaskList' }, HTMLAttributes), 0]
  },
})
