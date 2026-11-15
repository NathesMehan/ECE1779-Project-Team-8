
import { Routes, Route, Navigate } from 'react-router-dom'

import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

import DashboardPage from './pages/DashboardPage'
import WorkspacesPage from './pages/WorkspacesPage'
import WorkspaceDetailPage from './pages/WorkspaceDetailPage'
import DocumentsPage from './pages/DocumentsPage'
import MembersPage from './pages/MembersPage'
import ChatPage from './pages/ChatPage'
import ActivityPage from './pages/ActivityPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function App() {
  return (
    <Routes>
      {/* Public authentication pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Pages requiring authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/workspaces" element={<WorkspacesPage />} />

          <Route
            path="/workspaces/:workspaceId"
            element={<WorkspaceDetailPage />}
          />

          <Route
            path="/workspaces/:workspaceId/documents"
            element={<DocumentsPage />}
          />

          <Route
            path="/workspaces/:workspaceId/members"
            element={<MembersPage />}
          />

          <Route
            path="/workspaces/:workspaceId/chat"
            element={<ChatPage />}
          />

          <Route
            path="/workspaces/:workspaceId/activity"
            element={<ActivityPage />}
          />

          <Route path="/chat" element={<ChatPage />} />
          <Route path="/activity" element={<ActivityPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
