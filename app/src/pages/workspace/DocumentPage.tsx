import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import TiptapDocument from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlock from '@tiptap/extension-code-block'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import TiptapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import type { Node } from '@tiptap/pm/model'
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Code2,
  Minus,
  Table as TableIcon,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Loader2,
  FileX,
} from 'lucide-react'
import Sidebar from '@/components/file-manager/Sidebar'
import { useDocument, useUpdateDocument } from '@/api/documents'

// Enforce: document always starts with a heading followed by body content
const CustomDocument = TiptapDocument.extend({ content: 'heading block*' })

function extractTitle(json: Record<string, unknown>): string {
  const first = (json.content as Node[] | undefined)?.[0] as Record<string, unknown> | undefined
  if (first?.type === 'heading') {
    const nodes = first.content as { text?: string }[] | undefined
    return nodes?.map((n) => n.text ?? '').join('').trim() || 'Untitled'
  }
  return 'Untitled'
}

function buildInitialContent(title: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: title ? [{ type: 'text', text: title }] : [],
      },
      { type: 'paragraph' },
    ],
  }
}

function ToolbarBtn({
  icon,
  onClick,
  active,
  disabled,
  title,
}: {
  icon: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {icon}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center shrink-0" />
}

export default function DocumentPage() {
  const { id: idStr } = useParams<{ id: string }>()
  const docId = Number(idStr)
  const { data: doc, isLoading } = useDocument(docId)
  const updateDocument = useUpdateDocument()
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const pendingRef = useRef<{ title?: string; content?: Record<string, unknown> }>({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const editor = useEditor({
    extensions: [
      CustomDocument,
      Paragraph,
      Text,
      HardBreak,
      Bold,
      Italic,
      Underline,
      Strike,
      Code,
      Heading.configure({ levels: [1, 2, 3] as (1 | 2 | 3 | 4 | 5 | 6)[] }),
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({ nested: false }),
      CodeBlock,
      HorizontalRule,
      TiptapImage,
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      History,
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? 'Untitled' : 'Start writing…',
        includeChildren: false,
      }),
      Dropcursor,
      Gapcursor,
    ],
    onUpdate: ({ editor }) => {
      const content = editor.getJSON() as Record<string, unknown>
      const title = extractTitle(content)
      scheduleSave({ content, title })
    },
  })

  useEffect(() => {
    if (!editor || !doc) return
    if (doc.content) {
      editor.commands.setContent(doc.content)
    } else {
      const initial = buildInitialContent(doc.title)
      editor.commands.setContent(initial)
      // Select the heading text so the user can type immediately to replace it
      const headingSize = editor.state.doc.firstChild?.nodeSize ?? 2
      editor.commands.setTextSelection({ from: 1, to: headingSize - 1 })
      editor.commands.focus()
    }
    setSaveStatus('saved')
  }, [editor, doc?.id])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  function scheduleSave(changes: { title?: string; content?: Record<string, unknown> }) {
    pendingRef.current = { ...pendingRef.current, ...changes }
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const toSave = { ...pendingRef.current }
      pendingRef.current = {}
      setSaveStatus('saving')
      try {
        await updateDocument.mutateAsync({ id: docId, ...toSave })
        setSaveStatus('saved')
      } catch {
        setSaveStatus('unsaved')
      }
    }, 1500)
  }

  if (isLoading || !editor) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <FileX className="w-8 h-8 text-muted-foreground opacity-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b px-3 py-1 flex items-center gap-0.5 overflow-x-auto shrink-0">
          <ToolbarBtn
            icon={<Undo2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          />
          <ToolbarBtn
            icon={<Redo2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          />
          <Divider />
          <ToolbarBtn
            icon={<Heading1 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          />
          <ToolbarBtn
            icon={<Heading2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          />
          <ToolbarBtn
            icon={<Heading3 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          />
          <Divider />
          <ToolbarBtn
            icon={<BoldIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          />
          <ToolbarBtn
            icon={<ItalicIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          />
          <ToolbarBtn
            icon={<UnderlineIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          />
          <ToolbarBtn
            icon={<Strikethrough className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          />
          <ToolbarBtn
            icon={<CodeIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          />
          <Divider />
          <ToolbarBtn
            icon={<List className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          />
          <ToolbarBtn
            icon={<ListOrdered className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered list"
          />
          <ToolbarBtn
            icon={<ListChecks className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Task list"
          />
          <Divider />
          <ToolbarBtn
            icon={<Code2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block"
          />
          <ToolbarBtn
            icon={<Minus className="w-4 h-4" />}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          />
          <Divider />
          <ToolbarBtn
            icon={<TableIcon className="w-4 h-4" />}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            active={editor.isActive('table')}
            title="Insert table"
          />
          <ToolbarBtn
            icon={<LinkIcon className="w-4 h-4" />}
            onClick={() => {
              const url = window.prompt('URL:', editor.getAttributes('link').href ?? '')
              if (url === null) return
              if (url === '') {
                editor.chain().focus().unsetLink().run()
              } else {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            active={editor.isActive('link')}
            title="Link"
          />
          <div className="ml-auto shrink-0 pr-2">
            {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {saveStatus === 'unsaved' && <div className="w-2 h-2 rounded-full bg-muted-foreground/60" />}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-12 px-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  )
}
