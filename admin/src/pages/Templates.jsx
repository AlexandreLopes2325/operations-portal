import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  const token = localStorage.getItem('token')

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (!token || !savedUser) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(savedUser))
    fetchTemplates()
  }, [])

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
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) return

    try {
      const response = await fetch(`${API_URL}/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== id))
      }
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <Layout>
      <div className="text-white">

        <header className="border-b border-[#222222] px-6 py-4">
          <h1 className="text-xl font-bold">Templates</h1>
          <p className="text-sm text-[#555555] mt-1">{templates.length} templates disponíveis</p>
        </header>

        <main className="p-6">

          {loading ? (
            <div className="p-8 text-center text-[#555555]">Carregando...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-[#555555]">
              <p className="text-lg mb-2">Nenhum template ainda</p>
              <p className="text-sm">Abra um manual no editor e clique em "💾 Salvar como Template"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-xl bg-[#111111] border border-[#222222] hover:border-[#333333] transition-colors overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs px-2 py-1 rounded bg-[#a855f7]/10 text-[#a855f7]">
                        Template
                      </span>
                      <span className="text-xs text-[#555555]">{formatDate(template.created_at)}</span>
                    </div>

                    <h3 className="font-semibold text-lg mb-1">{template.title}</h3>
                    <p className="text-sm text-[#888888] mb-2">{template.description || 'Sem descrição'}</p>
                  </div>

                  <div className="border-t border-[#222222] px-5 py-3 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/editor/${template.id}`)}
                      className="text-sm text-[#a855f7] hover:text-[#c084fc] transition-colors cursor-pointer font-medium"
                    >
                      Visualizar
                    </button>
                    {user?.role === 'admin_master' && (
                      <button
                        onClick={() => handleDelete(template.id)}
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
      </div>
    </Layout>
  )
}

export default Templates