import { useNavigate, useLocation } from 'react-router-dom'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/manuals', label: 'Manuais', icon: '📘', resource: 'manuals', minRole: 'viewer' },
    { path: '/returns', label: 'Devoluções', icon: '↩️', resource: 'returns', minRole: 'viewer' },
    { path: '/audit-logs', label: 'Audit Logs', icon: '📋', resource: 'audit_logs', minRole: 'admin' },
    { path: '/users', label: 'Usuários', icon: '👥', resource: 'users', minRole: 'admin' },
    { path: '/logos', label: 'Logos', icon: '🎨', resource: 'logos', minRole: 'viewer' },
    { path: '/tools', label: 'Ferramentas', icon: '🔧', resource: 'tools', minRole: 'viewer' },
    { path: '/templates', label: 'Templates', icon: '📋', resource: 'templates', minRole: 'editor' }
  ]

  const ROLES = { viewer: 1, editor: 2, admin: 3, admin_master: 4 }

  const hasAccess = (item) => {
    if (!item.resource) return true
    if (user.role === 'admin_master') return true
    // Se o usuário tem permissões granulares carregadas, usa elas.
    // Senão (sessão antiga sem o campo), cai pro cheque por role.
    if (user.permissions && user.permissions[item.resource]) {
      return !!user.permissions[item.resource].view
    }
    return ROLES[user.role] >= ROLES[item.minRole]
  }

  return (
    <aside className="w-64 min-h-screen bg-[#111111] border-r border-[#222222] flex flex-col">

      {/* Logo */}
      <div className="p-5 border-b border-[#222222]">
        <h1 className="text-lg font-bold text-white">Operations Portal</h1>
        <p className="text-xs text-[#555555] mt-1">Painel Administrativo</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            if (!hasAccess(item)) return null

            const isActive = location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname === '/dashboard') ||
              (item.path === '/manuals' && location.pathname.startsWith('/editor'))

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                    : 'text-[#888888] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-[#222222]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center text-sm font-bold">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-white">{user.name}</p>
            <p className="text-xs text-[#555555]">{user.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-sm px-4 py-2 rounded-lg border border-[#333333] text-[#aaaaaa] hover:text-white hover:border-[#555555] transition-colors cursor-pointer"
        >
          Sair
        </button>
      </div>

    </aside>
  )
}

export default Sidebar