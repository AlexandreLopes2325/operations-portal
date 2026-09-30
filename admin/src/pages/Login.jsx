import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || data.errors?.join(', ') || 'Erro ao fazer login')
        setLoading(false)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      navigate('/dashboard')

    } catch (err) {
      setError('Erro ao conectar com o servidor')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#111111] border border-[#222222]">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Operations Portal</h1>
          <p className="text-[#888888] mt-2">Painel Administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm text-[#aaaaaa] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@example.com"
              className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#aaaaaa] mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#333333] text-white placeholder-[#555555] focus:outline-none focus:border-[#22c55e] transition-colors"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[#555555] text-sm mt-6">
          Operations Portal © 2026
        </p>

      </div>
    </div>
  )
}

export default Login