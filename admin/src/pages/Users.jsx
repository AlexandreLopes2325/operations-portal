import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

const RESOURCE_TABS = [
  { key: 'manuals', label: 'Manuais' },
  { key: 'templates', label: 'Templates' },
  { key: 'tools', label: 'Ferramentas' },
  { key: 'logos', label: 'Logos e imagens' },
  { key: 'returns', label: 'Devoluções' },
  { key: 'users', label: 'Usuários' },
  { key: 'audit_logs', label: 'Auditoria' },
]

const PERMISSION_ACTIONS = [
  { key: 'view', label: 'Ver' },
  { key: 'create', label: 'Criar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Apagar' },
]

// Ações que não existem de verdade pro recurso (fica travado/oculto no checkbox)
const DISABLED_ACTIONS = {
  manuals: [],
  templates: [],
  tools: [],
  logos: ['edit'],
  users: ['delete'], // deletar usuário é exclusivo de Admin Master, não é delegável
  audit_logs: ['create', 'edit', 'delete'],
}

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [modalError, setModalError] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'viewer' })
  const [currentUser, setCurrentUser] = useState(null)
  const [showPermModal, setShowPermModal] = useState(false)
  const [permTarget, setPermTarget] = useState(null)
  const [permDraft, setPermDraft] = useState(null)
  const [permError, setPermError] = useState('')
  const [permSaving, setPermSaving] = useState(false)
  const navigate = useNavigate()

  const token = localStorage.getItem('token')

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (!token || !savedUser) {
      navigate('/login')
      return
    }
    setCurrentUser(JSON.parse(savedUser))
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setUsers(data)
    } catch (err) {
      console.error('Erro ao buscar usuários:', err)
    }
    setLoading(false)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setModalError('')

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      })

      const data = await response.json()

      if (!response.ok) {
        setModalError(data.error || data.errors?.join(', ') || 'Erro ao criar usuário')
        return
      }

      setUsers([data.user, ...users])
      setShowModal(false)
      setNewUser({ name: '', email: '', password: '', role: 'viewer' })
    } catch (err) {
      setModalError('Erro ao conectar com o servidor')
    }
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return

    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setUsers(users.filter(u => u.id !== id))
      }
    } catch (err) {
      console.error('Erro ao deletar usuário:', err)
    }
  }

  const handleChangeRole = async (id, newRole) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        // Mudar a role reseta os overrides de permissão pro padrão da nova role (feito no backend),
        // então busca a lista de novo pra já refletir isso em vez de só trocar a role localmente
        fetchUsers()
      }
    } catch (err) {
      console.error('Erro ao mudar role:', err)
    }
  }

  const openResetModal = (user) => {
    setResetTarget(user)
    setNewPassword('')
    setResetError('')
    setResetSuccess('')
    setShowResetModal(true)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetSuccess('')

    try {
      const response = await fetch(`${API_URL}/users/${resetTarget.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        setResetError(data.error || 'Erro ao redefinir senha')
        return
      }

      setResetSuccess(data.message)
      setNewPassword('')

      setTimeout(() => {
        setShowResetModal(false)
        setResetSuccess('')
      }, 2000)

    } catch (err) {
      setResetError('Erro ao conectar com o servidor')
    }
  }

  const openPermModal = (user) => {
    setPermTarget(user)
    setPermDraft(JSON.parse(JSON.stringify(user.permissions || {})))
    setPermError('')
    setShowPermModal(true)
  }

  const togglePermission = (resource, action) => {
    setPermDraft(prev => ({
      ...prev,
      [resource]: { ...prev[resource], [action]: !prev[resource]?.[action] }
    }))
  }

  const handleSavePermissions = async () => {
    setPermError('')
    setPermSaving(true)

    try {
      const response = await fetch(`${API_URL}/users/${permTarget.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: permDraft })
      })

      const data = await response.json()

      if (!response.ok) {
        setPermError(data.error || 'Erro ao salvar permissões')
        setPermSaving(false)
        return
      }

      setUsers(users.map(u => u.id === permTarget.id ? { ...u, permissions: data.user.permissions } : u))
      setPermSaving(false)
      setShowPermModal(false)
    } catch (err) {
      setPermError('Erro ao conectar com o servidor')
      setPermSaving(false)
    }
  }

  const canEditPermissions = (targetUser) => {
    return currentUser?.role === 'admin_master' && targetUser.role !== 'admin_master'
  }

  const canResetPassword = (targetUser) => {
    if (!currentUser) return false
    if (targetUser.id === currentUser.id) return false
    if (currentUser.role === 'admin_master') return true
    if (currentUser.role === 'admin' && targetUser.role !== 'admin_master') return true
    return false
  }

  const getRoleBadge = (role) => {
    const styles = {
      admin_master: 'bg-[#a855f7]/10 text-[#a855f7]',
      admin: 'bg-[#3b82f6]/10 text-[#3b82f6]',
      editor: 'bg-[#22c55e]/10 text-[#22c55e]',
      viewer: 'bg-[#888888]/10 text-[#888888]'
    }
    return styles[role] || styles.viewer
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <Layout>
      <div className="text-white">

        {/* Header */}
        <header className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Gerenciar Usuários</h1>
            <p className="text-sm text-[#555555] mt-1">{users.length} usuários cadastrados</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm px-4 py-2 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
          >
            + Novo Usuário
          </button>
        </header>

        {/* Content */}
        <main className="p-6">
          <div className="rounded-xl bg-[#111111] border border-[#222222] overflow-hidden">

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#222222] text-xs text-[#555555] uppercase">
              <div className="col-span-3">Nome</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-1">Criado em</div>
              <div className="col-span-3">Ações</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="p-8 text-center text-[#555555]">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-[#555555]">Nenhum usuário encontrado</div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {users.map((user) => (
                  <div key={user.id} className="grid grid-cols-12 gap-4 px-5 py-4 text-sm hover:bg-[#1a1a1a] transition-colors items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center text-sm font-bold shrink-0">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-white">{user.name}</span>
                    </div>
                    <div className="col-span-3 text-[#888888]">
                      {user.email}
                    </div>
                    <div className="col-span-2">
                      {currentUser?.role === 'admin_master' && user.id !== currentUser?.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          className="bg-[#1a1a1a] border border-[#333333] rounded-lg px-2 py-1 text-xs text-white cursor-pointer focus:outline-none focus:border-[#22c55e]"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                          <option value="admin_master">Admin Master</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 text-[#555555] text-xs">
                      {formatDate(user.created_at)}
                    </div>
                    <div className="col-span-3 flex items-center gap-3 flex-wrap">
                      {canEditPermissions(user) && (
                        <button
                          onClick={() => openPermModal(user)}
                          className="text-xs text-[#a855f7] hover:text-[#c084fc] transition-colors cursor-pointer"
                        >
                          Permissões
                        </button>
                      )}
                      {canResetPassword(user) && (
                        <button
                          onClick={() => openResetModal(user)}
                          className="text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors cursor-pointer"
                        >
                          Redefinir senha
                        </button>
                      )}
                      {currentUser?.role === 'admin_master' && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Deletar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Modal Criar Usuário */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-full max-w-lg p-6 rounded-xl bg-[#111111] border border-[#222222]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Novo Usuário</h2>
                <button
                  onClick={() => { setShowModal(false); setModalError('') }}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Nome</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Nome completo"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Senha</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 8 chars, 1 maiúscula, 1 número, 1 símbolo"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white focus:outline-none focus:border-[#22c55e] transition-colors cursor-pointer"
                  >
                    <option value="viewer">Viewer — só visualiza</option>
                    <option value="editor">Editor — edita conteúdo</option>
                    <option value="admin">Admin — gerencia tudo</option>
                    <option value="admin_master">Admin Master — controle total</option>
                  </select>
                </div>

                {modalError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {modalError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setModalError('') }}
                    className="flex-1 py-3 rounded-lg border border-[#333333] text-[#aaaaaa] hover:text-white hover:border-[#555555] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
                  >
                    Criar Usuário
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Redefinir Senha */}
        {showResetModal && resetTarget && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-full max-w-md p-6 rounded-xl bg-[#111111] border border-[#222222]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Redefinir Senha</h2>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-[#1a1a1a] border border-[#222222]">
                <p className="text-sm text-[#888888]">Redefinindo senha de:</p>
                <p className="text-white font-medium mt-1">{resetTarget.name}</p>
                <p className="text-xs text-[#555555]">{resetTarget.email}</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Nova Senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 chars, 1 maiúscula, 1 número, 1 símbolo"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                {resetError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {resetError}
                  </div>
                )}

                {resetSuccess && (
                  <div className="p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm">
                    {resetSuccess}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-3 rounded-lg border border-[#333333] text-[#aaaaaa] hover:text-white hover:border-[#555555] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] transition-colors cursor-pointer"
                  >
                    Redefinir Senha
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Permissões */}
        {showPermModal && permTarget && permDraft && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl p-6 rounded-xl bg-[#111111] border border-[#222222] max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Permissões de {permTarget.name}</h2>
                <button
                  onClick={() => setShowPermModal(false)}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-[#555555] mb-6">Marque exatamente em quais abas {permTarget.name} pode entrar e o que ele pode fazer nelas.</p>

              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_repeat(4,60px)] gap-2 px-3 pb-2 text-xs text-[#555555] uppercase">
                  <div>Aba</div>
                  {PERMISSION_ACTIONS.map((a) => (
                    <div key={a.key} className="text-center">{a.label}</div>
                  ))}
                </div>

                {RESOURCE_TABS.map((tab) => (
                  <div key={tab.key} className="grid grid-cols-[1fr_repeat(4,60px)] gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors">
                    <div className="text-sm text-white">{tab.label}</div>
                    {PERMISSION_ACTIONS.map((a) => {
                      const disabled = DISABLED_ACTIONS[tab.key]?.includes(a.key)
                      return (
                        <div key={a.key} className="flex justify-center">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={disabled ? false : !!permDraft[tab.key]?.[a.key]}
                            onChange={() => togglePermission(tab.key, a.key)}
                            className="w-4 h-4 accent-[#22c55e] cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                          />
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {permError && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {permError}
                </div>
              )}

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowPermModal(false)}
                  className="flex-1 py-3 rounded-lg border border-[#333333] text-[#aaaaaa] hover:text-white hover:border-[#555555] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={permSaving}
                  className="flex-1 py-3 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {permSaving ? 'Salvando...' : 'Salvar Permissões'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

export default Users