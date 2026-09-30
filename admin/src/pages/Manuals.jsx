import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

function Manuals() {
  const [user, setUser] = useState(null)
  const [manuals, setManuals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [newManual, setNewManual] = useState({ title: '', description: '', slug: '' })
  const [modalError, setModalError] = useState('')
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const navigate = useNavigate()

  const token = localStorage.getItem('token')

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (!token || !savedUser) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(savedUser))
    fetchManuals()
    fetchTemplates()
  }, [])

  const fetchManuals = async () => {
    try {
      const response = await fetch(`${API_URL}/manuals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setManuals(data)
    } catch (err) {
      console.error('Erro ao buscar manuais:', err)
    }
    setLoading(false)
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setTemplates(data)
    } catch (err) {
      console.error('Erro ao buscar templates:', err)
    }
  }

  const handleCreateManual = async (e) => {
    e.preventDefault()
    setModalError('')

    try {
      let response

      if (selectedTemplate) {
        response = await fetch(`${API_URL}/templates/use/${selectedTemplate}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newManual)
        })
      } else {
        response = await fetch(`${API_URL}/manuals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newManual)
        })
      }

      const data = await response.json()

      if (!response.ok) {
        setModalError(data.error || data.errors?.join(', ') || 'Erro ao criar manual')
        return
      }

      setManuals([data.manual, ...manuals])
      setShowModal(false)
      setNewManual({ title: '', description: '', slug: '' })
      setSelectedTemplate('')
    } catch (err) {
      setModalError('Erro ao conectar com o servidor')
    }
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
    setNewManual({
      ...newManual,
      title: value,
      slug: generateSlug(value)
    })
  }

  const handleDeleteManual = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este manual?')) return

    try {
      const response = await fetch(`${API_URL}/manuals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setManuals(manuals.filter(m => m.id !== id))
      }
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  const filteredManuals = manuals.filter(manual => {
    const matchesSearch = !search ||
      manual.title.toLowerCase().includes(search.toLowerCase()) ||
      manual.description?.toLowerCase().includes(search.toLowerCase()) ||
      manual.slug.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || manual.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (!user) return null

  return (
    <Layout>
      <div className="text-white">

        <header className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Manuais</h1>
            <p className="text-sm text-[#555555] mt-1">{manuals.length} manuais no total</p>
          </div>
          {(user.role === 'admin_master' || user.role === 'admin' || user.role === 'editor') && (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm px-4 py-2 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
            >
              + Novo Manual
            </button>
          )}
        </header>

        <main className="p-6">

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, descrição ou slug..."
              className="flex-1 px-4 py-3 rounded-lg bg-[#111111] border border-[#222222] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'published', label: 'Publicados' },
                { value: 'draft', label: 'Rascunhos' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    statusFilter === filter.value
                      ? 'bg-[#22c55e] text-black font-semibold'
                      : 'bg-[#111111] border border-[#222222] text-[#888888] hover:text-white hover:border-[#333333]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {search || statusFilter !== 'all' ? (
            <p className="text-sm text-[#555555] mb-4">
              {filteredManuals.length} resultado{filteredManuals.length !== 1 ? 's' : ''} encontrado{filteredManuals.length !== 1 ? 's' : ''}
            </p>
          ) : null}

          {loading ? (
            <div className="p-8 text-center text-[#555555]">Carregando...</div>
          ) : filteredManuals.length === 0 ? (
            <div className="p-8 text-center text-[#555555]">
              {search || statusFilter !== 'all'
                ? 'Nenhum manual encontrado com esses filtros'
                : 'Nenhum manual criado ainda'
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredManuals.map((manual) => (
                <div
                  key={manual.id}
                  className="rounded-xl bg-[#111111] border border-[#222222] hover:border-[#333333] transition-colors overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        manual.status === 'published'
                          ? 'bg-[#22c55e]/10 text-[#22c55e]'
                          : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                      }`}>
                        {manual.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                      <span className="text-xs text-[#555555]">{formatDate(manual.created_at)}</span>
                    </div>

                    <h3 className="font-semibold text-lg mb-1">{manual.title}</h3>
                    <p className="text-sm text-[#888888] mb-2">{manual.description || 'Sem descrição'}</p>
                    <p className="text-xs text-[#555555]">/{manual.slug}</p>
                  </div>

                  <div className="border-t border-[#222222] px-5 py-3 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/editor/${manual.id}`)}
                      className="text-sm text-[#22c55e] hover:text-[#16a34a] transition-colors cursor-pointer font-medium"
                    >
                      Editar
                    </button>
                    {user.role === 'admin_master' && (
                      <button
                        onClick={() => handleDeleteManual(manual.id)}
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
                <h2 className="text-lg font-semibold">Novo Manual</h2>
                <button
                  onClick={() => { setShowModal(false); setModalError(''); setSelectedTemplate('') }}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateManual} className="space-y-4">

                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm text-[#aaaaaa] mb-2">Criar a partir de template (opcional)</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white focus:outline-none focus:border-[#22c55e] transition-colors cursor-pointer"
                    >
                      <option value="">Do zero</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Título</label>
                  <input
                    type="text"
                    value={newManual.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Guia de Expedição"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Descrição</label>
                  <textarea
                    value={newManual.description}
                    onChange={(e) => setNewManual({ ...newManual, description: e.target.value })}
                    placeholder="Breve descrição do manual"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#555555]">/</span>
                    <input
                      type="text"
                      value={newManual.slug}
                      onChange={(e) => setNewManual({ ...newManual, slug: e.target.value })}
                      placeholder="guia-expedicao"
                      className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                      required
                    />
                  </div>
                </div>

                {modalError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {modalError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setModalError(''); setSelectedTemplate('') }}
                    className="flex-1 py-3 rounded-lg border border-[#333333] text-[#aaaaaa] hover:text-white hover:border-[#555555] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
                  >
                    Criar Manual
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

export default Manuals