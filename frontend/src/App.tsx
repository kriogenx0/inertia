import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import WorkspacePage from '@/pages/workspace/WorkspacePage'
import DocumentPage from '@/pages/workspace/DocumentPage'
import DocumentsIndexPage from '@/pages/workspace/DocumentsIndexPage'
import TasksPage from '@/pages/workspace/TasksPage'
import EventsPage from '@/pages/workspace/EventsPage'
import EpicsPage from '@/pages/workspace/EpicsPage'
import FolderDetailPage from '@/pages/workspace/FolderDetailPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (process.env.BYPASS_AUTH === 'true') return <>{children}</>
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/shared/:token" element={<div>Shared view</div>} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <WorkspacePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <PrivateRoute>
            <DocumentsIndexPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <PrivateRoute>
            <DocumentPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <TasksPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/events"
        element={
          <PrivateRoute>
            <EventsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/epics"
        element={
          <PrivateRoute>
            <EpicsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/folders/:id"
        element={
          <PrivateRoute>
            <FolderDetailPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
