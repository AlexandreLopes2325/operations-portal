import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

function Logos() {
  const [logos, setLogos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [svgFile, setSvgFile] = useState(null)
  const [pngFile, setPngFile] = useState(null)
  const [modalError, setModalError] = useState('')
  const [uploading, setUploading] = useState(false)
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
    fetchLogos()
  }, [])

  const fetchLogos = async () => {
    try {
      const response = await fetch(`${API_URL}/logos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setLogos(data)
    } catch (err) {
      console.error('Erro ao buscar logos:', err)
    }
    setLoading(false)
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
    })
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setModalError('')
    setUploading(true)

    try {
      let svg_data = null
      let png_data = null

      if (svgFile) svg_data = await fileToBase64(svgFile)
      if (pngFile) png_data = await fileToBase64(pngFile)

      if (!svg_data && !png_data) {
        setModalError('Envie pelo menos um arquivo (SVG ou PNG)')
        setUploading(false)
        return
      }

      const response = await fetch(`${API_URL}/logos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ brand_name: brandName, svg_data, png_data })
      })

      const data = await response.json()

      if (!response.ok) {
        setModalError(data.error || 'Erro ao enviar logo')
        setUploading(false)
        return
      }

      setLogos([data.logo, ...logos])
      setShowModal(false)
      setBrandName('')
      setSvgFile(null)
      setPngFile(null)
    } catch (err) {
      setModalError('Erro ao conectar com o servidor')
    }
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este logo?')) return

    try {
      const response = await fetch(`${API_URL}/logos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setLogos(logos.filter(l => l.id !== id))
      }
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  const filteredLogos = logos.filter(logo =>
    !search || logo.brand_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="text-white">

        <header className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Biblioteca de Logos</h1>
            <p className="text-sm text-[#555555] mt-1">{logos.length} logos cadastrados</p>
          </div>
          {(user?.role === 'admin_master' || user?.role === 'admin') && (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm px-4 py-2 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer"
            >
              + Novo Logo
            </button>
          )}
        </header>

        <main className="p-6">

          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por marca..."
              className="w-full max-w-md px-4 py-3 rounded-lg bg-[#111111] border border-[#222222] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#555555]">Carregando...</div>
          ) : filteredLogos.length === 0 ? (
            <div className="p-8 text-center text-[#555555]">
              {search ? 'Nenhum logo encontrado' : 'Nenhum logo cadastrado ainda'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredLogos.map((logo) => (
                <div
                  key={logo.id}
                  className="group rounded-xl bg-[#111111] border border-[#222222] hover:border-[#333333] transition-colors overflow-hidden"
                >
                  <div className="p-6 flex items-center justify-center h-32 bg-white">
                    <img
                      src={logo.svg_url || logo.png_url}
                      alt={logo.brand_name}
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{logo.brand_name}</p>
                    <div className="hidden group-hover:flex items-center gap-2">
                      {logo.svg_url && (
                        <button
                          onClick={() => window.open(logo.svg_url, '_blank')}
                          className="text-xs text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer"
                        >
                          SVG
                        </button>
                      )}
                      {logo.png_url && (
                        <button
                          onClick={() => window.open(logo.png_url, '_blank')}
                          className="text-xs text-[#22c55e] hover:text-[#16a34a] cursor-pointer"
                        >
                          PNG
                        </button>
                      )}
                      {user?.role === 'admin_master' && (
                        <button
                          onClick={() => handleDelete(logo.id)}
                          className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
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
                <h2 className="text-lg font-semibold">Novo Logo</h2>
                <button
                  onClick={() => { setShowModal(false); setModalError('') }}
                  className="text-[#888888] hover:text-white transition-colors cursor-pointer text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Nome da Marca</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ex: Nike, Pegada, New Balance"
                    className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Arquivo SVG</label>
                  <input
                    type="file"
                    accept=".svg"
                    onChange={(e) => setSvgFile(e.target.files[0])}
                    className="w-full text-sm text-[#888888] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#1a1a1a] file:text-white hover:file:bg-[#333333] file:cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-2">Arquivo PNG (fundo transparente)</label>
                  <input
                    type="file"
                    accept=".png"
                    onChange={(e) => setPngFile(e.target.files[0])}
                    className="w-full text-sm text-[#888888] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-[#1a1a1a] file:text-white hover:file:bg-[#333333] file:cursor-pointer"
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
                    {uploading ? 'Enviando...' : 'Enviar Logo'}
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

export default Logos