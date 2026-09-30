import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

function Tools() {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [user, setUser] = useState(null)
  const [newTool, setNewTool] = useState({ title: '', description: '', icon: '🔧', slug: '' })
  const [htmlFile, setHtmlFile] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editModalError, setEditModalError] = useState('')
  const [editUploading, setEditUploading] = useState(false)
  const [editTool, setEditTool] = useState(null)
  const [editHtmlFile, setEditHtmlFile] = useState(null)
  const navigate = useNavigate()

  const token = localStorage.getItem('token')

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (!token || !savedUser) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(savedUser))
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      const response = await fetch(`${API_URL}/tools`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setTools(data)
    } catch (err) {
      console.error('Erro ao buscar ferramentas:', err)
    }
    setLoading(false)
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value) => {
    setNewTool({
      ...newTool,
      title: value,
      slug: generateSlug(value)
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setModalError('')
    setUploading(true)

    try {
      let html_content = null

      if (htmlFile) {
        html_content = await htmlFile.text()
      }

      if (!html_content) {
        setModalError('Envie um arquivo HTML')
        setUploading(false)
        return
      }

      const response = await fetch(`${API_URL}/tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newTool,
          html_content
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setModalError(data.error || 'Erro ao criar ferramenta')
        setUploading(false)
        return
      }

      setTools([data.tool, ...tools])
      setShowModal(false)
      setNewTool({ title: '', description: '', icon: '🔧', slug: '' })
      setHtmlFile(null)
    } catch (err) {
      setModalError('Erro ao conectar com o servidor')
    }
    setUploading(false)
  }

  const openEditModal = (tool) => {
    setEditTool({
      id: tool.id,
      title: tool.title,
      description: tool.description || '',
      icon: tool.icon,
      slug: tool.slug,
      is_active: tool.is_active
    })
    setEditHtmlFile(null)
    setEditModalError('')
    setShowEditModal(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditModalError('')
    setEditUploading(true)

    try {
      let html_content = null

      if (editHtmlFile) {
        html_content = await editHtmlFile.text()
      }

      const response = await fetch(`${API_URL}/tools/${editTool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTool.title,
          description: editTool.description,
          icon: editTool.icon,
          slug: editTool.slug,
          is_active: editTool.is_active,
          ...(html_content ? { html_content } : {})
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setEditModalError(data.error || 'Erro ao atualizar ferramenta')
        setEditUploading(false)
        return
      }

      setTools(tools.map(t => t.id === editTool.id ? data.tool : t))
      setShowEditModal(false)
    } catch (err) {
      setEditModalError('Erro ao conectar com o servidor')
    }
    setEditUploading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta ferramenta?')) return

    try {
      const response = await fetch(`${API_URL}/tools/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setTools(tools.filter(t => t.id !== id))
      }
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  const toggleActive = async (tool) => {
    try {
      const response = await fetch(`${API_URL}/tools/${tool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: tool.title,
          description: tool.description,
          icon: tool.icon,
          slug: tool.slug,
          is_active: !tool.is_active
        })
      })

      if (response.ok) {
        setTools(tools.map(t => t.id === tool.id ? { ...t, is_active: !t.is_active } : t))
      }
    } catch (err) {
      console.error('Erro ao atualizar:', err)
    }
  }

  const filteredTools = tools.filter(tool =>
    !search || tool.title.toLowerCase().includes(search.toLowerCase()) ||
    tool.description?.toLowerCase().includes(search.toLowerCase())
  )

  const icons = ['🔧', '📄', '🔄', '📊', '📐', '🏷️', '📦', '🖨️', '✂️', '🔍']

  return (
    <Layout>
      <div className="text-white">

        <header className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Ferramentas</h1>
            <p className="text-sm text-[#555555] mt-1">{tools.length} ferramentas cadastradas</p>
          </div>
          {(user?.role === 'admin_master' || user?.role === 'admin') && (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm px-4 py-2 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
            >
              + Nova Ferramenta
            </button>
          )}
        </header>

        <main className="p-6">

          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ferramenta..."
              className="w-full max-w-md px-4 py-3 rounded-lg bg-[#111111] border border-[#222222] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#555555]">Carregando...</div>
          ) : filteredTools.length === 0 ? (
            <div className="p-8 text-center text-[#555555]">
              {search ? 'Nenhuma ferramenta encontrada' : 'Nenhuma ferramenta cadastrada ainda'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className={`rounded-xl bg-[#111111] border overflow-hidden transition-colors ${
                    tool.is_active ? 'border-[#222222] hover:border-[#333333]' : 'border-[#222222] opacity-50'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{tool.icon}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        tool.is_active
                          ? 'bg-[#22c55e]/10 text-[#22c55e]'
                          : 'bg-[#888888]/10 text-[#888888]'
                      }`}>
                        {tool.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>

                    <h3 className="font-semibold text-lg mb-1">{tool.title}</h3>
                    <p className="text-sm text-[#888888] mb-2">{tool.description || 'Sem descrição'}</p>
                    <p className="text-xs text-[#555555]">/{tool.slug}</p>
                  </div>

                  <div className="border-t border-[#222222] px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tool.html_url && (
                        <button
                          onClick={() => window.open(`${API_URL}/portal/ferramenta/${tool.slug}`, '_blank')}
                          className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors cursor-pointer font-medium"
                        >
                          Abrir
                        </button>
                      )}
                      {(user?.role === 'admin_master' || user?.role === 'admin') && (
                        <button
                          onClick={() => openEditModal(tool)}
                          className="text-sm text-[#888888] hover:text-white transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                      )}
                      {(user?.role === 'admin_master' || user?.role === 'admin') && (
                        <button
                          onClick={() => toggleActive(tool)}
                          className="text-sm text-[#888888] hover:text-white transition-colors cursor-pointer"
                        >
                          {tool.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                    </div>
                    {user?.role === 'admin_master' && (
                      <button
                        onClick={() => handleDelete(tool.id)}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        Deletar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>

        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-full max-w-lg p-6 rounded-xl bg-[#111111] border border-[#222222]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Nova Ferramenta</h2>
                <button
                  onClick={() => { setShowModal(false); setModalError('') }}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {icons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewTool({ ...newTool, icon })}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer transition-colors ${
                          newTool.icon === icon
                            ? 'bg-[#22c55e]/20 border-2 border-[#22c55e]'
                            : 'bg-[#1a1a1a] border border-[#333333] hover:border-[#555555]'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Título</label>
                  <input
                    type="text"
                    value={newTool.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Compactador de PDF"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Descrição</label>
                  <textarea
                    value={newTool.description}
                    onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                    placeholder="O que essa ferramenta faz"
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#555555]">/</span>
                    <input
                      type="text"
                      value={newTool.slug}
                      onChange={(e) => setNewTool({ ...newTool, slug: e.target.value })}
                      placeholder="compactador-pdf"
                      className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Arquivo HTML</label>
                  <input
                    type="file"
                    accept=".html,.htm"
                    onChange={(e) => setHtmlFile(e.target.files[0])}
                    className="w-full text-sm text-[#888888] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#1a1a1a] file:text-white hover:file:bg-[#333333] file:cursor-pointer"
                    required
                  />
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
                    disabled={uploading}
                    className="flex-1 py-3 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {uploading ? 'Enviando...' : 'Criar Ferramenta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editTool && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-full max-w-lg p-6 rounded-xl bg-[#111111] border border-[#222222]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Editar Ferramenta</h2>
                <button
                  onClick={() => { setShowEditModal(false); setEditModalError('') }}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {icons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setEditTool({ ...editTool, icon })}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer transition-colors ${
                          editTool.icon === icon
                            ? 'bg-[#22c55e]/20 border-2 border-[#22c55e]'
                            : 'bg-[#1a1a1a] border border-[#333333] hover:border-[#555555]'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Título</label>
                  <input
                    type="text"
                    value={editTool.title}
                    onChange={(e) => setEditTool({ ...editTool, title: e.target.value })}
                    placeholder="Ex: Compactador de PDF"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Descrição</label>
                  <textarea
                    value={editTool.description}
                    onChange={(e) => setEditTool({ ...editTool, description: e.target.value })}
                    placeholder="O que essa ferramenta faz"
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#555555]">/</span>
                    <input
                      type="text"
                      value={editTool.slug}
                      onChange={(e) => setEditTool({ ...editTool, slug: e.target.value })}
                      placeholder="compactador-pdf"
                      className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                      required
                    />
                  </div>
                  <p className="text-xs text-[#555555] mt-1">Cuidado: mudar o slug muda o link público da ferramenta.</p>
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Arquivo HTML</label>
                  <input
                    type="file"
                    accept=".html,.htm"
                    onChange={(e) => setEditHtmlFile(e.target.files[0])}
                    className="w-full text-sm text-[#888888] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#1a1a1a] file:text-white hover:file:bg-[#333333] file:cursor-pointer"
                  />
                  <p className="text-xs text-[#555555] mt-1">Opcional — só envie se quiser substituir o arquivo atual (ex: corrigir um bug ou atualizar a ferramenta).</p>
                </div>

                {editModalError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {editModalError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setEditModalError('') }}
                    className="flex-1 py-3 rounded-lg border border-[#333333] text-[#aaaaaa] hover:text-white hover:border-[#555555] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editUploading}
                    className="flex-1 py-3 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {editUploading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

export default Tools