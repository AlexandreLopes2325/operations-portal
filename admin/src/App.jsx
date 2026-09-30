import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import AuditLogs from './pages/AuditLogs'
import Users from './pages/Users'
import Manuals from './pages/Manuals'
import Logos from './pages/Logos'
import Templates from './pages/Templates'
import Tools from './pages/Tools'
import Returns from './pages/Returns'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/manuals" element={<Manuals />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/login" />} />
        <Route path="/logos" element={<Logos />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/returns" element={<Returns />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App