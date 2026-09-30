import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [manuals, setManuals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newManual, setNewManual] = useState({ title: '', description: '', slug: '' })
  const [modalError, setModalError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (!savedUser || !token) {
      navigate('/login')
      return
    }

    setUser(JSON.parse(savedUser))
    fetchManuals(token)
  }, [])

  const fetchManuals = async (token) => {
    try {
      const response = await fetch(`${API_URL}/manuals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        setManuals(data)
      }
    } catch (err) {
      console.error('Erro ao buscar manuais:', err)
    }

    setLoading(false)
  }

  const handleCreateManual = async (e) => {
    e.preventDefault()
    setModalError('')

    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`${API_URL}/manuals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newManual)
      })

      const data = await response.json()

      if (!response.ok) {
        setModalError(data.error || data.errors?.join(', ') || 'Erro ao criar manual')
        return
      }

      setManuals([data.manual, ...manuals])
      setShowModal(false)
      setNewManual({ title: '', description: '', slug: '' })

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

    const token = localStorage.getItem('token')

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

  if (!user) return null

  return (
    <Layout>
      <div className="text-white">

        {/* Header */}
        <header className="border-b border-[#222222] px-6 py-4">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-[#555555] mt-1">Visão geral do portal</p>
        </header>

        {/* Main Content */}
        <main className="p-6">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-5 rounded-xl bg-[#111111] border border-[#222222]">
              <p className="text-sm text-[#888888]">Total de Manuais</p>
              <p className="text-3xl font-bold mt-1">{manuals.length}</p>
            </div>
            <div className="p-5 rounded-xl bg-[#111111] border border-[#222222]">
              <p className="text-sm text-[#888888]">Publicados</p>
              <p className="text-3xl font-bold mt-1 text-[#22c55e]">
                {manuals.filter(m => m.status === 'published').length}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-[#111111] border border-[#222222]">
              <p className="text-sm text-[#888888]">Rascunhos</p>
              <p className="text-3xl font-bold mt-1 text-[#f59e0b]">
                {manuals.filter(m => m.status === 'draft').length}
              </p>
            </div>
          </div>

          {/* Manuals List */}
          <div className="rounded-xl bg-[#111111] border border-[#222222]">
            <div className="p-5 border-b border-[#222222] flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manuais</h2>
              {(user.role === 'admin_master' || user.role === 'admin' || user.role === 'editor') && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-sm px-4 py-2 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
                >
                  + Novo Manual
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-[#555555]">Carregando...</div>
            ) : manuals.length === 0 ? (
              <div className="p-8 text-center text-[#555555]">Nenhum manual criado ainda</div>
            ) : (
              <div className="divide-y divide-[#222222]">
                {manuals.map((manual) => (
                  <div key={manual.id} className="p-5 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors">
                    <div>
                      <h3 className="font-medium">{manual.title}</h3>
                      <p className="text-sm text-[#888888] mt-1">{manual.description}</p>
                      <p className="text-xs text-[#555555] mt-1">/{manual.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        manual.status === 'published'
                          ? 'bg-[#22c55e]/10 text-[#22c55e]'
                          : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                      }`}>
                        {manual.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                      <button
                        onClick={() => navigate(`/editor/${manual.id}`)}
                        className="text-sm text-[#888888] hover:text-white transition-colors cursor-pointer"
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
          </div>

        </main>

        {/* Modal Criar Manual */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="w-full max-w-lg p-6 rounded-xl bg-[#111111] border border-[#222222]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Novo Manual</h2>
                <button
                  onClick={() => { setShowModal(false); setModalError('') }}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateManual} className="space-y-4">
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
                    onClick={() => { setShowModal(false); setModalError('') }}
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

export default Dashboard