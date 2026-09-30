import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()

  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        setLogs(data)
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err)
    }

    setLoading(false)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR')
  }

  const getActionColor = (action) => {
    if (action.includes('DELETE')) return 'text-red-400 bg-red-500/10'
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'text-[#22c55e] bg-[#22c55e]/10'
    if (action.includes('UPDATE')) return 'text-[#3b82f6] bg-[#3b82f6]/10'
    if (action.includes('LOGIN')) return 'text-[#a855f7] bg-[#a855f7]/10'
    if (action.includes('PASSWORD')) return 'text-[#f59e0b] bg-[#f59e0b]/10'
    return 'text-[#888888] bg-[#888888]/10'
  }

  const filteredLogs = logs.filter(log => {
    if (!filter) return true
    return (
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.users?.name?.toLowerCase().includes(filter.toLowerCase()) ||
      log.users?.email?.toLowerCase().includes(filter.toLowerCase())
    )
  })

  return (
    <Layout>
      <div className="text-white">

        {/* Header */}
        <header className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Audit Logs</h1>
            <p className="text-sm text-[#555555] mt-1">Histórico de todas as ações do sistema</p>
          </div>
          <div className="text-sm text-[#555555]">
            {logs.length} registros
          </div>
        </header>

        {/* Content */}
        <main className="p-6">

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por ação, nome ou email..."
              className="w-full max-w-md px-4 py-3 rounded-lg bg-[#111111] border border-[#222222] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl bg-[#111111] border border-[#222222] overflow-hidden">

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#222222] text-xs text-[#555555] uppercase">
              <div className="col-span-3">Usuário</div>
              <div className="col-span-3">Ação</div>
              <div className="col-span-3">Detalhes</div>
              <div className="col-span-1">IP</div>
              <div className="col-span-2">Data</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="p-8 text-center text-[#555555]">Carregando...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-[#555555]">Nenhum log encontrado</div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="grid grid-cols-12 gap-4 px-5 py-4 text-sm hover:bg-[#1a1a1a] transition-colors">
                    <div className="col-span-3">
                      <p className="text-white">{log.users?.name || 'Desconhecido'}</p>
                      <p className="text-xs text-[#555555]">{log.users?.email}</p>
                    </div>
                    <div className="col-span-3">
                      <span className={`text-xs px-2 py-1 rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="col-span-3 text-[#888888] text-xs">
                      {Object.entries(log.details || {}).map(([key, value]) => {
                        const text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
                        return (
                          <span key={key} className="block truncate" title={text}>
                            {key}: {text}
                          </span>
                        )
                      })}
                    </div>
                    <div className="col-span-1 text-[#555555] text-xs">
                      {log.ip_address}
                    </div>
                    <div className="col-span-2 text-[#555555] text-xs">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </Layout>
  )
}

export default AuditLogs