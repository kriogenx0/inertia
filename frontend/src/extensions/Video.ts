import { Node, mergeAttributes } from '@tiptap/core'

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'video[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ controls: '', class: 'max-w-full rounded my-2' }, HTMLAttributes)]
  },
})

export default Video
