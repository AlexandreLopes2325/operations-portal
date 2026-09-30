import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

const STATUSES = [
  { key: 'aguardando_retorno', label: 'Aguardando retorno', emoji: '🕐', color: '#2563eb', bg: '#dbeafe' },
  { key: 'quarentena', label: 'Em quarentena', emoji: '🔒', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'aguardando_canal', label: 'Aguardando canal', emoji: '⏳', color: '#d97706', bg: '#fef3c7' },
  { key: 'finalizado', label: 'Finalizado', emoji: '✅', color: '#16a34a', bg: '#dcfce7' },
]

const EMPTY_FORM = {
  order_number: '', channel: '', product: '', reason: '', condition: '',
  request_date: '', received_date: '', has_complaint: false, quarantine_start: '',
  quarantine_days: '', complaint_details: '', product_value: '', has_penalty: false,
  penalty_value: '', refunded: false, status: 'aguardando_retorno', notes: '', channel_return_id: ''
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function statusInfo(key) {
  return STATUSES.find(s => s.key === key) || STATUSES[0]
}

function quarantineInfo(ret) {
  if (!ret.has_complaint || !ret.quarantine_start || !ret.quarantine_days) return null
  if (ret.resolution_notes) {
    return { percent: 100, label: 'Resolvida', color: '#16a34a', emoji: '✅', overdue: false, resolved: true }
  }
  const start = new Date(ret.quarantine_start + 'T00:00:00')
  const deadline = new Date(start.getTime() + ret.quarantine_days * 86400000)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((deadline - today) / 86400000)
  const percent = Math.min(100, Math.max(0, ((today - start) / (deadline - start)) * 100))

  if (daysLeft <= 0) {
    const daysOverdue = Math.abs(daysLeft)
    return {
      percent: 100,
      label: daysOverdue === 0 ? 'Vencida hoje' : `Vencida há ${daysOverdue} dia${daysOverdue === 1 ? '' : 's'}`,
      color: '#dc2626', emoji: '🔴', overdue: true
    }
  }
  if (daysLeft <= 2) {
    return { percent, label: `${daysLeft} dia${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'}`, color: '#d97706', emoji: '🟡', overdue: false }
  }
  return { percent, label: `${daysLeft} dias restantes`, color: '#16a34a', emoji: '🟢', overdue: false }
}

function monthLabel(key) {
  if (!key) return ''
  const [y, m] = key.split('-')
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${names[Number(m) - 1]}/${y.slice(2)}`
}

function BarChart({ data, color }) {
  const [hover, setHover] = useState(null)
  if (data.length === 0) return <p className="text-xs text-[#9aa1ab] py-10 text-center">Sem dados no período</p>

  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100, H = 56, padTop = 8, padBottom = 12
  const n = data.length
  const barW = Math.min(10, (W - 4) / n - 2)
  const gap = (W - barW * n) / (n + 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }} preserveAspectRatio="xMidYMid meet">
      {[0.5, 1].map(f => {
        const y = padTop + (H - padTop - padBottom) * (1 - f)
        return <line key={f} x1={0} x2={W} y1={y} y2={y} stroke="#eef0f3" strokeWidth="0.4" />
      })}
      {data.map((d, i) => {
        const x = gap + i * (barW + gap)
        const barH = ((H - padTop - padBottom) * d.value) / max
        const y = H - padBottom - barH
        const active = hover === null || hover === i
        return (
          <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
            <title>{`${d.fullLabel || d.label}: ${d.value}`}</title>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 0.5)} rx={1.5} fill={color} opacity={active ? 1 : 0.35} />
            <text x={x + barW / 2} y={y - 1.5} textAnchor="middle" fontSize="3.6" fontWeight="700" fill="#1a1d23">{d.value}</text>
            <text x={x + barW / 2} y={H - padBottom + 4.5} textAnchor="middle" fontSize="3" fill="#5f6774">
              {d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function AreaChart({ data, color, formatValue }) {
  const [hover, setHover] = useState(null)
  if (data.length === 0) return <p className="text-xs text-[#9aa1ab] py-8 text-center">Sem dados no período</p>

  const max = Math.max(...data.map(d => d.value), 1)
  const W = 100, H = 34, padTop = 5, padBottom = 9, padX = 3
  const n = data.length
  const stepX = n > 1 ? (W - padX * 2) / (n - 1) : 0
  const points = data.map((d, i) => ({
    ...d,
    x: padX + i * stepX,
    y: padTop + (H - padTop - padBottom) * (1 - d.value / max)
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${H - padBottom} L${points[0].x},${H - padBottom} Z`
  const gradId = `grad-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padX} x2={W - padX} y1={H - padBottom} y2={H - padBottom} stroke="#e2e5ea" strokeWidth="0.4" />
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
          <title>{`${p.fullLabel || p.label}: ${formatValue ? formatValue(p.value) : p.value}`}</title>
          <circle cx={p.x} cy={p.y} r={hover === i ? 1.8 : 1.1} fill={color} stroke="#fff" strokeWidth="0.5" />
          <rect x={p.x - (stepX || W) / 2} y={0} width={stepX || W} height={H} fill="transparent" />
        </g>
      ))}
      {points.map((p, i) => (
        (i === 0 || i === points.length - 1 || i === hover) && (
          <text key={`lbl-${i}`} x={p.x} y={H - 1.5} textAnchor="middle" fontSize="2.8" fill="#5f6774">{p.label}</text>
        )
      ))}
    </svg>
  )
}

function Returns() {
  const [activeTab, setActiveTab] = useState('list')
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ channel: '', status: '', from: '', to: '', search: '' })
  const [searchInput, setSearchInput] = useState('')
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)

  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolveMarketplaceFavor, setResolveMarketplaceFavor] = useState('')
  const [resolveSellerReimbursed, setResolveSellerReimbursed] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')
  const [reopening, setReopening] = useState(false)

  const [channels, setChannels] = useState([])
  const [newChannelLabel, setNewChannelLabel] = useState('')

  const [form, setForm] = useState(EMPTY_FORM)
  const [formReasons, setFormReasons] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [detailReturn, setDetailReturn] = useState(null)

  const [reasonChannel, setReasonChannel] = useState('')
  const [allReasons, setAllReasons] = useState([])
  const [newReasonLabel, setNewReasonLabel] = useState('')

  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (!token || !savedUser) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(savedUser))
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    try {
      const response = await fetch(`${API_URL}/returns/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setChannels(data)
        if (data.length > 0) setReasonChannel(prev => prev || data[0].key)
      }
    } catch (err) {
      console.error('Erro ao buscar canais:', err)
    }
  }

  const fetchReturns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.channel) params.set('channel', filters.channel)
      if (filters.status) params.set('status', filters.status)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)
      if (filters.search) params.set('search', filters.search)

      const response = await fetch(`${API_URL}/returns?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setReturns(data)
    } catch (err) {
      console.error('Erro ao buscar devoluções:', err)
    }
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const response = await fetch(`${API_URL}/returns/stats?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setStats(data)
    } catch (err) {
      console.error('Erro ao buscar stats:', err)
    }
  }

  const fetchAllReasons = async () => {
    try {
      const response = await fetch(`${API_URL}/returns/reasons`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setAllReasons(data)
    } catch (err) {
      console.error('Erro ao buscar motivos:', err)
    }
  }

  const fetchReasonsForChannel = async (channel) => {
    if (!channel) { setFormReasons([]); return }
    try {
      const response = await fetch(`${API_URL}/returns/reasons?channel=${channel}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setFormReasons(data.filter(r => r.is_active))
    } catch (err) {
      console.error('Erro ao buscar motivos:', err)
    }
  }

  useEffect(() => { fetchReturns() }, [filters])
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters(f => f.search === searchInput ? f : { ...f, search: searchInput })
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchInput])
  useEffect(() => { if (activeTab === 'dashboard') fetchStats() }, [activeTab])
  useEffect(() => { if (activeTab === 'reasons') fetchAllReasons() }, [activeTab])
  useEffect(() => { fetchReasonsForChannel(form.channel) }, [form.channel])

  const applyFilters = () => {
    fetchReturns()
    if (activeTab === 'dashboard') fetchStats()
  }

  const channelLabel = (key) => channels.find(c => c.key === key)?.label || key
  // Canais cujo marketplace fornece um ID próprio de devolução (coluna requires_return_id)
  const channelRequiresReturnId = (key) => !!channels.find(c => c.key === key)?.requires_return_id

  const openDetail = (ret) => {
    setResolutionNotes('')
    setResolveMarketplaceFavor('')
    setResolveSellerReimbursed('')
    setResolveError('')
    setDetailReturn(ret)
  }

  const openNewForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
    setActiveTab('form')
  }

  const openEditForm = (ret) => {
    setForm({
      order_number: ret.order_number || '',
      channel: ret.channel || '',
      product: ret.product || '',
      reason: ret.reason || '',
      condition: ret.condition || '',
      request_date: ret.request_date || '',
      received_date: ret.received_date || '',
      has_complaint: !!ret.has_complaint,
      quarantine_start: ret.quarantine_start || '',
      quarantine_days: ret.quarantine_days || '',
      complaint_details: ret.complaint_details || '',
      product_value: ret.product_value || '',
      has_penalty: !!ret.has_penalty,
      penalty_value: ret.penalty_value || '',
      refunded: !!ret.refunded,
      status: ret.status || 'aguardando_retorno',
      notes: ret.notes || '',
      channel_return_id: ret.channel_return_id || ''
    })
    setEditingId(ret.id)
    setFormError('')
    setDetailReturn(null)
    setActiveTab('form')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!form.order_number || !form.channel || !form.product || !form.reason) {
      setFormError('Preencha pedido, canal, produto e motivo')
      return
    }

    setSaving(true)
    try {
      const url = editingId ? `${API_URL}/returns/${editingId}` : `${API_URL}/returns`
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error || 'Erro ao salvar devolução')
        setSaving(false)
        return
      }

      await fetchReturns()
      setForm(EMPTY_FORM)
      setEditingId(null)
      setActiveTab('list')
    } catch (err) {
      setFormError('Erro ao conectar com o servidor')
    }
    setSaving(false)
  }

  const handleResolve = async (id) => {
    if (!resolutionNotes.trim()) {
      setResolveError('Descreva o que foi resolvido')
      return
    }
    setResolveError('')
    setResolving(true)
    try {
      const response = await fetch(`${API_URL}/returns/${id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          resolution_notes: resolutionNotes,
          marketplace_favor: resolveMarketplaceFavor === '' ? null : resolveMarketplaceFavor === 'sim',
          seller_reimbursed: resolveSellerReimbursed === '' ? null : resolveSellerReimbursed === 'sim'
        })
      })
      const data = await response.json()

      if (!response.ok) {
        setResolveError(data.error || 'Erro ao concluir devolução')
        setResolving(false)
        return
      }

      setReturns(returns.map(r => r.id === id ? data.return : r))
      setDetailReturn(data.return)
      setResolutionNotes('')
      setResolveMarketplaceFavor('')
      setResolveSellerReimbursed('')
    } catch (err) {
      setResolveError('Erro ao conectar com o servidor')
    }
    setResolving(false)
  }

  const handleReopen = async (id) => {
    if (!confirm('Reverter esta devolução pra Em Quarentena? Isso apaga a resolução registrada.')) return
    setReopening(true)
    try {
      const response = await fetch(`${API_URL}/returns/${id}/reopen`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Erro ao reverter devolução')
        setReopening(false)
        return
      }

      setReturns(returns.map(r => r.id === id ? data.return : r))
      setDetailReturn(data.return)
    } catch (err) {
      alert('Erro ao conectar com o servidor')
    }
    setReopening(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta devolução?')) return
    try {
      const response = await fetch(`${API_URL}/returns/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        setReturns(returns.filter(r => r.id !== id))
        setDetailReturn(null)
      }
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  const handleAddReason = async () => {
    if (!newReasonLabel.trim()) return
    try {
      const response = await fetch(`${API_URL}/returns/reasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ channel: reasonChannel, label: newReasonLabel.trim() })
      })
      const data = await response.json()
      if (response.ok) {
        setAllReasons([...allReasons, data.reason])
        setNewReasonLabel('')
      }
    } catch (err) {
      console.error('Erro ao criar motivo:', err)
    }
  }

  const toggleReasonActive = async (reason) => {
    try {
      const response = await fetch(`${API_URL}/returns/reasons/${reason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !reason.is_active })
      })
      if (response.ok) {
        setAllReasons(allReasons.map(r => r.id === reason.id ? { ...r, is_active: !r.is_active } : r))
      }
    } catch (err) {
      console.error('Erro ao atualizar motivo:', err)
    }
  }

  const handleDeleteReason = async (reason) => {
    if (!confirm(`Deletar o motivo "${reason.label}"? Isso não afeta devoluções já registradas.`)) return
    try {
      const response = await fetch(`${API_URL}/returns/reasons/${reason.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        setAllReasons(allReasons.filter(r => r.id !== reason.id))
      }
    } catch (err) {
      console.error('Erro ao deletar motivo:', err)
    }
  }

  const handleAddChannel = async () => {
    if (!newChannelLabel.trim()) return
    try {
      const response = await fetch(`${API_URL}/returns/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ label: newChannelLabel.trim() })
      })
      const data = await response.json()
      if (response.ok) {
        setChannels([...channels, data.channel])
        setNewChannelLabel('')
      } else {
        alert(data.error || 'Erro ao criar marketplace')
      }
    } catch (err) {
      console.error('Erro ao criar canal:', err)
    }
  }

  const toggleChannelActive = async (channel) => {
    try {
      const response = await fetch(`${API_URL}/returns/channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_active: !channel.is_active })
      })
      if (response.ok) {
        setChannels(channels.map(c => c.id === channel.id ? { ...c, is_active: !c.is_active } : c))
      }
    } catch (err) {
      console.error('Erro ao atualizar canal:', err)
    }
  }

  const toggleChannelReturnId = async (channel) => {
    try {
      const response = await fetch(`${API_URL}/returns/channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ requires_return_id: !channel.requires_return_id })
      })
      if (response.ok) {
        setChannels(channels.map(c => c.id === channel.id ? { ...c, requires_return_id: !c.requires_return_id } : c))
      }
    } catch (err) {
      console.error('Erro ao atualizar canal:', err)
    }
  }

  const handleExportExcel = () => {
    const headers = ['Pedido', 'ID no canal', 'Canal', 'Produto', 'Motivo', 'Condição', 'Data solicitação', 'Data recebimento', 'Reclamação', 'Quarentena', 'Valor produto', 'Penalização', 'Reembolsado (cliente)', 'Situação', 'Resolução', 'Marketplace deu razão', 'Reembolsado pelo marketplace', 'Registrado por']
    const boolLabel = (v) => v === true ? 'Sim' : v === false ? 'Não' : ''
    const rows = returns.map(r => {
      const qi = quarantineInfo(r)
      return [
        r.order_number, r.channel_return_id || '', channelLabel(r.channel), r.product, r.reason, r.condition || '',
        formatDate(r.request_date), formatDate(r.received_date),
        r.has_complaint ? 'Sim' : 'Não',
        qi ? qi.label : 'Sem reclamação',
        formatMoney(r.product_value),
        r.has_penalty ? formatMoney(r.penalty_value) : '',
        r.refunded ? 'Sim' : 'Não',
        statusInfo(r.status).label,
        r.resolution_notes || '',
        boolLabel(r.marketplace_favor),
        boolLabel(r.seller_reimbursed),
        r.users?.name || ''
      ]
    })
    const csvLines = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    const csvContent = '﻿' + csvLines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `devolucoes_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const overdueReturns = returns.filter(r => quarantineInfo(r)?.overdue)

  const canCreate = user?.permissions?.returns?.create || user?.role === 'admin_master'
  const canEdit = user?.permissions?.returns?.edit || user?.role === 'admin_master'
  const canDelete = user?.permissions?.returns?.delete || user?.role === 'admin_master'

  const activeChannels = channels.filter(c => c.is_active)

  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-white border border-[#e2e5ea] text-[#1a1d23] placeholder-[#9aa1ab] focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe] transition-colors text-sm"
  const labelClass = "block text-xs font-medium text-[#5f6774] mb-1.5"
  const cardClass = "bg-white border border-[#e2e5ea] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,.06)]"
  const btnOutline = "px-4 py-2.5 rounded-lg border border-[#e2e5ea] bg-white text-sm text-[#5f6774] hover:bg-[#f5f6f8] hover:text-[#1a1d23] transition-colors cursor-pointer"
  const btnPrimary = "px-4 py-2.5 rounded-lg bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-colors cursor-pointer"

  const reasonsForActiveChannel = allReasons.filter(r => r.channel === reasonChannel)

  return (
    <Layout>
      <div className="min-h-screen bg-[#f5f6f8] text-[#1a1d23]">

        <header className="bg-white border-b border-[#e2e5ea] px-6 py-4">
          <h1 className="text-xl font-bold">📦 Devoluções</h1>
          <p className="text-sm text-[#5f6774] mt-1">Registro e acompanhamento de devoluções de todos os marketplaces</p>
        </header>

        <div className="bg-white border-b border-[#e2e5ea] px-6 flex gap-1">
          {[
            { key: 'list', label: '📋 Devoluções' },
            { key: 'form', label: editingId ? '✏️ Editar Registro' : '✏️ Novo Registro' },
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'reasons', label: '⚙️ Motivos e Marketplaces' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { if (tab.key === 'form') openNewForm(); else setActiveTab(tab.key) }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'text-[#1a1d23] border-[#2563eb]'
                  : 'text-[#5f6774] border-transparent hover:text-[#1a1d23]'
              }`}
            >
              {tab.label}
              {tab.key === 'list' && overdueReturns.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#dc2626] text-white text-[10px] font-bold">{overdueReturns.length}</span>
              )}
            </button>
          ))}
        </div>

        <main className="p-6">

          {/* ===== LISTAGEM ===== */}
          {activeTab === 'list' && (
            <>
              {overdueReturns.length > 0 && (
                <button
                  onClick={() => openDetail(overdueReturns[0])}
                  className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-sm hover:bg-[#fecaca] transition-colors cursor-pointer text-left"
                >
                  <span className="text-lg">🚨</span>
                  <span className="flex-1">
                    <strong>{overdueReturns.length}</strong> devolução{overdueReturns.length > 1 ? 'ões' : ''} com quarentena vencida — ação necessária.
                  </span>
                  <span className="font-semibold whitespace-nowrap">
                    Ver pedido{overdueReturns.length > 1 ? ` (${overdueReturns[0].order_number})` : ''} →
                  </span>
                </button>
              )}

              <div className="flex flex-wrap items-end gap-3 mb-6">
                <div className="min-w-[220px]">
                  <label className={labelClass}>🔎 Buscar</label>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Pedido, produto, motivo, ID no canal..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Canal</label>
                  <select value={filters.channel} onChange={e => setFilters({ ...filters, channel: e.target.value })} className={inputClass}>
                    <option value="">Todos os canais</option>
                    {channels.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className={inputClass}>
                    <option value="">Todos</option>
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>De</label>
                  <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Até</label>
                  <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className={inputClass} />
                </div>
                <button onClick={applyFilters} className={btnOutline}>🔍 Filtrar</button>
                <button onClick={handleExportExcel} className={btnOutline}>⬇️ Exportar Excel</button>
                {canCreate && (
                  <button onClick={openNewForm} className={`${btnPrimary} ml-auto`}>➕ Nova devolução</button>
                )}
              </div>

              <div className={`${cardClass} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e2e5ea] text-xs text-[#5f6774] uppercase tracking-wide">
                        <th className="text-left px-5 py-3 font-semibold">📦 Pedido</th>
                        <th className="text-left px-5 py-3 font-semibold">🏪 Canal</th>
                        <th className="text-left px-5 py-3 font-semibold">👟 Produto</th>
                        <th className="text-left px-5 py-3 font-semibold">🏷️ Motivo</th>
                        <th className="text-left px-5 py-3 font-semibold">💰 Valor</th>
                        <th className="text-left px-5 py-3 font-semibold">📍 Situação</th>
                        <th className="text-left px-5 py-3 font-semibold">⏱️ Quarentena</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={7} className="p-8 text-center text-[#5f6774]">Carregando...</td></tr>
                      ) : returns.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-[#5f6774]">Nenhuma devolução registrada ainda</td></tr>
                      ) : returns.map(ret => {
                        const st = statusInfo(ret.status)
                        const qi = quarantineInfo(ret)
                        return (
                          <tr
                            key={ret.id}
                            onClick={() => openDetail(ret)}
                            className="border-b border-[#eef0f3] last:border-0 hover:bg-[#f9fafb] transition-colors cursor-pointer"
                          >
                            <td className="px-5 py-3.5">
                              <div className="font-semibold">{ret.order_number}</div>
                              {ret.channel_return_id && <div className="text-[11px] text-[#9aa1ab] font-mono">🔖 {ret.channel_return_id}</div>}
                            </td>
                            <td className="px-5 py-3.5 text-[#5f6774]">{channelLabel(ret.channel)}</td>
                            <td className="px-5 py-3.5 text-[#5f6774] max-w-[220px] truncate">{ret.product}</td>
                            <td className="px-5 py-3.5 text-[#5f6774]">{ret.reason}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span>{formatMoney(ret.product_value)}</span>
                                {ret.has_penalty && <span className="text-[#dc2626] text-xs">-{formatMoney(ret.penalty_value)} penal.</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>
                                {st.emoji} {st.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {qi ? (
                                <div className="flex flex-col gap-1 min-w-[110px]">
                                  <div className="h-1.5 rounded-full bg-[#eef0f3] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${qi.percent}%`, background: qi.color }}></div>
                                  </div>
                                  <span className="text-[10px] font-semibold" style={{ color: qi.color }}>{qi.emoji} {qi.label}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#9aa1ab]">Sem reclamação</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== FORMULÁRIO ===== */}
          {activeTab === 'form' && (
            <div className={`${cardClass} p-6 max-w-3xl`}>
              <form onSubmit={handleSubmit} className="space-y-6">

                <div>
                  <h3 className="text-sm font-bold mb-3 pb-2 border-b border-[#e2e5ea] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    Dados do pedido
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Canal de venda *</label>
                      <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value, reason: '' })} className={inputClass} required>
                        <option value="">Selecione o canal...</option>
                        {activeChannels.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Nº do Pedido *</label>
                      <input type="text" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} placeholder="Ex: MLB-928371" className={inputClass} required />
                    </div>
                    {channelRequiresReturnId(form.channel) && (
                      <div className="col-span-2">
                        <label className={labelClass}>🔖 ID da devolução no {channelLabel(form.channel)}</label>
                        <input
                          type="text"
                          value={form.channel_return_id}
                          onChange={e => setForm({ ...form, channel_return_id: e.target.value })}
                          placeholder={`Código da devolução informado pelo ${channelLabel(form.channel)}`}
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold mb-3 pb-2 border-b border-[#e2e5ea] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    Produto e motivo
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Produto *</label>
                      <input type="text" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="Nome ou referência" className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Motivo da devolução *</label>
                      <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className={inputClass} required>
                        <option value="">{form.channel ? 'Selecione o motivo...' : 'Selecione o canal primeiro'}</option>
                        {formReasons.map(r => <option key={r.id} value={r.label}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Condição do produto</label>
                      <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className={inputClass}>
                        <option value="">Como o produto chegou?</option>
                        <option value="revenda">OK para revenda</option>
                        <option value="avariado">Avariado</option>
                        <option value="extraviado">Extraviado</option>
                      </select>
                    </div>
                    <div></div>
                    <div>
                      <label className={labelClass}>Data da solicitação</label>
                      <input type="date" value={form.request_date} onChange={e => setForm({ ...form, request_date: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Data de recebimento</label>
                      <input type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold mb-3 pb-2 border-b border-[#e2e5ea] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    Reclamação e quarentena
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className={labelClass}>Abriu reclamação com o canal?</label>
                      <select value={form.has_complaint ? 'sim' : 'nao'} onChange={e => setForm({ ...form, has_complaint: e.target.value === 'sim' })} className={inputClass}>
                        <option value="nao">Não — devolução normal</option>
                        <option value="sim">Sim — abri reclamação</option>
                      </select>
                    </div>
                  </div>
                  {form.has_complaint && (
                    <div className="bg-[#f5f6f8] border border-dashed border-[#d5d9e0] rounded-lg p-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Data de início da quarentena</label>
                        <input type="date" value={form.quarantine_start} onChange={e => setForm({ ...form, quarantine_start: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Prazo da quarentena (dias)</label>
                        <input type="number" min="1" value={form.quarantine_days} onChange={e => setForm({ ...form, quarantine_days: e.target.value })} placeholder="Ex: 7" className={inputClass} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelClass}>Detalhes da reclamação (opcional)</label>
                        <textarea value={form.complaint_details} onChange={e => setForm({ ...form, complaint_details: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold mb-3 pb-2 border-b border-[#e2e5ea] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white text-[11px] font-bold flex items-center justify-center">4</span>
                    💰 Valores
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>💰 Valor do produto *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5f6774] pointer-events-none">R$</span>
                        <input type="number" step="0.01" value={form.product_value} onChange={e => setForm({ ...form, product_value: e.target.value })} placeholder="0,00" className={inputClass + ' pl-10'} required />
                      </div>
                      <p className="text-[11px] text-[#d97706] mt-1">Conta como valor em devolução (receita não realizada)</p>
                    </div>
                    <div>
                      <label className={labelClass}>O marketplace aplicou penalização?</label>
                      <select value={form.has_penalty ? 'sim' : 'nao'} onChange={e => setForm({ ...form, has_penalty: e.target.value === 'sim' })} className={inputClass}>
                        <option value="nao">Não houve penalização</option>
                        <option value="sim">Sim, houve penalização</option>
                      </select>
                    </div>
                    {form.has_penalty && (
                      <div>
                        <label className={labelClass}>💸 Valor da penalização</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5f6774] pointer-events-none">R$</span>
                          <input type="number" step="0.01" value={form.penalty_value} onChange={e => setForm({ ...form, penalty_value: e.target.value })} placeholder="0,00" className={inputClass + ' pl-10'} />
                        </div>
                        <p className="text-[11px] text-[#dc2626] mt-1">Este valor conta como prejuízo real</p>
                      </div>
                    )}
                    <div>
                      <label className={labelClass}>Já foi reembolsado ao cliente?</label>
                      <select value={form.refunded ? 'sim' : 'nao'} onChange={e => setForm({ ...form, refunded: e.target.value === 'sim' })} className={inputClass}>
                        <option value="nao">Ainda não</option>
                        <option value="sim">Sim, já reembolsado</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Situação</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass}>
                        {STATUSES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Observações (opcional)</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputClass + ' resize-none'} />
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-sm">{formError}</div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-[#e2e5ea]">
                  <button type="button" onClick={() => { setActiveTab('list'); setEditingId(null) }} className={btnOutline}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className={`${btnPrimary} disabled:opacity-50`}>
                    {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Salvar Devolução'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===== DASHBOARD ===== */}
          {activeTab === 'dashboard' && (
            <>
              <div className="flex flex-wrap items-end gap-3 mb-6">
                <div>
                  <label className={labelClass}>De</label>
                  <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Até</label>
                  <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} className={inputClass} />
                </div>
                <button onClick={fetchStats} className={btnOutline}>Filtrar</button>
              </div>

              {!stats ? (
                <div className="p-8 text-center text-[#5f6774]">Carregando...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className={`${cardClass} p-5 relative overflow-hidden`}>
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563eb]"></div>
                      <p className="text-xs text-[#5f6774] uppercase font-semibold">📦 Devoluções no período</p>
                      <p className="text-2xl font-extrabold mt-1">{stats.total}</p>
                    </div>
                    <div className={`${cardClass} p-5 relative overflow-hidden`}>
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d97706]"></div>
                      <p className="text-xs text-[#5f6774] uppercase font-semibold">💸 Valor em devolução</p>
                      <p className="text-2xl font-extrabold mt-1 text-[#d97706]">{formatMoney(stats.valorDevolucao)}</p>
                      <p className="text-[11px] text-[#5f6774] mt-1">Receita que deixou de entrar</p>
                    </div>
                    <div className={`${cardClass} p-5 relative overflow-hidden`}>
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#dc2626]"></div>
                      <p className="text-xs text-[#5f6774] uppercase font-semibold">🔻 Prejuízo real</p>
                      <p className="text-2xl font-extrabold mt-1 text-[#dc2626]">{formatMoney(stats.prejuizoReal)}</p>
                      <p className="text-[11px] text-[#5f6774] mt-1">Penalizações — impacta bônus</p>
                    </div>
                    <div className={`${cardClass} p-5 relative overflow-hidden`}>
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7c3aed]"></div>
                      <p className="text-xs text-[#5f6774] uppercase font-semibold">🚨 Reclamações em aberto</p>
                      <p className="text-2xl font-extrabold mt-1 text-[#7c3aed]">{stats.reclamacoesAbertas}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className={`${cardClass} p-5`}>
                      <h3 className="text-sm font-bold mb-2">🏪 Devoluções por canal</h3>
                      <BarChart
                        color="#2a78d6"
                        data={Object.entries(stats.porCanal).sort((a, b) => b[1] - a[1]).map(([ch, count]) => ({ label: channelLabel(ch), value: count }))}
                      />
                    </div>
                    <div className={`${cardClass} p-5`}>
                      <h3 className="text-sm font-bold mb-2">🏷️ Motivos mais frequentes</h3>
                      <BarChart
                        color="#4a3aa7"
                        data={Object.entries(stats.porMotivo).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([reason, count]) => ({ label: reason, fullLabel: reason, value: count }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`${cardClass} p-5`}>
                      <h3 className="text-sm font-bold mb-2">📈 Evolução mensal — valor em devolução</h3>
                      <AreaChart
                        color="#d97706"
                        formatValue={formatMoney}
                        data={Object.entries(stats.porMes || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([mes, v]) => ({ label: monthLabel(mes), fullLabel: monthLabel(mes), value: v.valorDevolucao }))}
                      />
                    </div>
                    <div className={`${cardClass} p-5`}>
                      <h3 className="text-sm font-bold mb-2">📈 Evolução mensal — prejuízo real</h3>
                      <AreaChart
                        color="#dc2626"
                        formatValue={formatMoney}
                        data={Object.entries(stats.porMes || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([mes, v]) => ({ label: monthLabel(mes), fullLabel: monthLabel(mes), value: v.prejuizoReal }))}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== MOTIVOS E MARKETPLACES ===== */}
          {activeTab === 'reasons' && (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="grid grid-cols-[220px_1fr]">
                <div className="border-r border-[#e2e5ea] p-3">
                  {channels.map(c => (
                    <div key={c.key} className="group flex items-center gap-1 mb-1">
                      <button
                        onClick={() => setReasonChannel(c.key)}
                        className={`flex-1 text-left px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                          reasonChannel === c.key ? 'bg-[#dbeafe] text-[#2563eb] font-semibold' : 'text-[#5f6774] hover:text-[#1a1d23] hover:bg-[#f5f6f8]'
                        } ${!c.is_active ? 'opacity-40' : ''}`}
                      >
                        {c.label}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => toggleChannelActive(c)}
                          title={c.is_active ? 'Desativar marketplace' : 'Ativar marketplace'}
                          className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 rounded text-[#9aa1ab] hover:text-[#1a1d23] transition-all cursor-pointer"
                        >
                          {c.is_active ? '●' : '○'}
                        </button>
                      )}
                    </div>
                  ))}

                  {canEdit && (
                    <div className="mt-3 pt-3 border-t border-[#e2e5ea] flex flex-col gap-2">
                      <input
                        type="text"
                        value={newChannelLabel}
                        onChange={e => setNewChannelLabel(e.target.value)}
                        placeholder="Novo marketplace..."
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[#e2e5ea] text-[#1a1d23] placeholder-[#9aa1ab] focus:outline-none focus:border-[#2563eb] text-xs"
                      />
                      <button onClick={handleAddChannel} className="text-xs px-3 py-2 rounded-lg bg-[#2563eb] text-white font-semibold hover:bg-[#1d4ed8] transition-colors cursor-pointer">
                        + Adicionar marketplace
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold">Motivos — {channelLabel(reasonChannel)}</span>
                    {canEdit && channels.find(c => c.key === reasonChannel) && (
                      <label className="flex items-center gap-2 text-xs text-[#5f6774] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channelRequiresReturnId(reasonChannel)}
                          onChange={() => toggleChannelReturnId(channels.find(c => c.key === reasonChannel))}
                          className="cursor-pointer"
                        />
                        🔖 Marketplace fornece ID de devolução
                      </label>
                    )}
                  </div>

                  {canEdit && (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newReasonLabel}
                        onChange={e => setNewReasonLabel(e.target.value)}
                        placeholder="Novo motivo..."
                        className={inputClass}
                      />
                      <button onClick={handleAddReason} className={`${btnPrimary} whitespace-nowrap`}>+ Adicionar</button>
                    </div>
                  )}

                  <div className="divide-y divide-[#eef0f3]">
                    {reasonsForActiveChannel.length === 0 ? (
                      <p className="text-sm text-[#9aa1ab] py-4">Nenhum motivo cadastrado pra esse canal</p>
                    ) : reasonsForActiveChannel.map(r => (
                      <div key={r.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm">{r.label}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.is_active ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                            {r.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleReasonActive(r)} className="text-xs text-[#5f6774] hover:text-[#1a1d23] transition-colors cursor-pointer">
                              {r.is_active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button onClick={() => handleDeleteReason(r)} className="text-xs text-[#dc2626] hover:text-[#991b1b] transition-colors cursor-pointer">
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Modal de detalhes */}
        {detailReturn && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-white border border-[#e2e5ea] rounded-xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e5ea]">
                <h2 className="text-lg font-bold">Devolução {detailReturn.order_number}</h2>
                <button onClick={() => setDetailReturn(null)} className="w-8 h-8 rounded-lg bg-[#f5f6f8] hover:bg-[#fee2e2] hover:text-[#dc2626] flex items-center justify-center text-[#5f6774] transition-colors cursor-pointer">✕</button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Canal</p>
                  <p className="mt-0.5">{channelLabel(detailReturn.channel)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Situação</p>
                  <p className="mt-0.5 font-semibold" style={{ color: statusInfo(detailReturn.status).color }}>{statusInfo(detailReturn.status).emoji} {statusInfo(detailReturn.status).label}</p>
                </div>
                {detailReturn.channel_return_id && (
                  <div className="col-span-2">
                    <p className="text-xs text-[#5f6774] uppercase font-semibold">🔖 ID da devolução no {channelLabel(detailReturn.channel)}</p>
                    <p className="mt-0.5 font-mono">{detailReturn.channel_return_id}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Produto</p>
                  <p className="mt-0.5">{detailReturn.product}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Motivo</p>
                  <p className="mt-0.5">{detailReturn.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Condição</p>
                  <p className="mt-0.5">{detailReturn.condition || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Data da solicitação</p>
                  <p className="mt-0.5">{formatDate(detailReturn.request_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Data de recebimento</p>
                  <p className="mt-0.5">{formatDate(detailReturn.received_date)}</p>
                </div>

                <div className="col-span-2 h-px bg-[#e2e5ea] my-1"></div>

                <div className="col-span-2">
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Reclamação</p>
                  {detailReturn.has_complaint ? (
                    <div className="mt-1 space-y-1">
                      <p className="text-[#dc2626] text-xs font-medium">Sim — reclamação aberta com o canal</p>
                      {quarantineInfo(detailReturn) && (
                        <div className="max-w-[240px]">
                          <div className="h-1.5 rounded-full bg-[#eef0f3] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${quarantineInfo(detailReturn).percent}%`, background: quarantineInfo(detailReturn).color }}></div>
                          </div>
                          <span className="text-[11px] font-semibold" style={{ color: quarantineInfo(detailReturn).color }}>{quarantineInfo(detailReturn).emoji} {quarantineInfo(detailReturn).label}</span>
                        </div>
                      )}
                      {detailReturn.complaint_details && <p className="text-[#5f6774] text-xs">{detailReturn.complaint_details}</p>}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-[#5f6774]">Não — devolução normal</p>
                  )}
                </div>

                <div className="col-span-2 h-px bg-[#e2e5ea] my-1"></div>

                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">💰 Valor do produto</p>
                  <p className="mt-0.5 text-[#d97706] font-bold">{formatMoney(detailReturn.product_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">💸 Penalização</p>
                  <p className="mt-0.5">{detailReturn.has_penalty ? <span className="text-[#dc2626] font-bold">{formatMoney(detailReturn.penalty_value)}</span> : <span className="text-[#5f6774]">Não houve</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Reembolsado?</p>
                  <p className="mt-0.5">{detailReturn.refunded ? 'Sim' : 'Ainda não'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5f6774] uppercase font-semibold">Registrado por</p>
                  <p className="mt-0.5">{detailReturn.users?.name || '-'}</p>
                </div>

                {detailReturn.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-[#5f6774] uppercase font-semibold">Observações</p>
                    <p className="mt-0.5 text-[#5f6774]">{detailReturn.notes}</p>
                  </div>
                )}

                {detailReturn.resolution_notes && (
                  <div className="col-span-2">
                    <div className="h-px bg-[#e2e5ea] my-1"></div>
                    <p className="text-xs text-[#16a34a] uppercase font-semibold mt-3">✅ Resolução da quarentena</p>
                    <p className="mt-0.5 text-[#1a1d23]">{detailReturn.resolution_notes}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {detailReturn.marketplace_favor !== null && detailReturn.marketplace_favor !== undefined && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${detailReturn.marketplace_favor ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                          {detailReturn.marketplace_favor ? '⚖️ Marketplace deu razão pra nós' : '⚖️ Marketplace não deu razão pra nós'}
                        </span>
                      )}
                      {detailReturn.seller_reimbursed !== null && detailReturn.seller_reimbursed !== undefined && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${detailReturn.seller_reimbursed ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'}`}>
                          {detailReturn.seller_reimbursed ? '💵 Fomos reembolsados pelo marketplace' : '💵 Não fomos reembolsados pelo marketplace'}
                        </span>
                      )}
                    </div>
                    {detailReturn.resolved_at && <p className="text-[11px] text-[#9aa1ab] mt-2">Concluído em {new Date(detailReturn.resolved_at).toLocaleString('pt-BR')}</p>}
                  </div>
                )}

                {quarantineInfo(detailReturn)?.overdue && !detailReturn.resolution_notes && (
                  <div className="col-span-2 bg-[#fee2e2] border border-[#fca5a5] rounded-lg p-4">
                    <p className="text-sm font-bold text-[#991b1b] mb-2">🚨 Quarentena vencida — o que foi resolvido?</p>
                    <textarea
                      value={resolutionNotes}
                      onChange={e => setResolutionNotes(e.target.value)}
                      placeholder="Ex: Marketplace liberou o produto, cliente reembolsado, produto descartado..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#fca5a5] text-[#1a1d23] placeholder-[#9aa1ab] focus:outline-none focus:border-[#dc2626] text-sm resize-none"
                    />
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-[#991b1b] mb-1">⚖️ O marketplace deu razão pra nós?</label>
                        <select
                          value={resolveMarketplaceFavor}
                          onChange={e => setResolveMarketplaceFavor(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#fca5a5] text-[#1a1d23] focus:outline-none focus:border-[#dc2626] text-sm"
                        >
                          <option value="">Não informado</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#991b1b] mb-1">💵 Fomos reembolsados pelo marketplace?</label>
                        <select
                          value={resolveSellerReimbursed}
                          onChange={e => setResolveSellerReimbursed(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#fca5a5] text-[#1a1d23] focus:outline-none focus:border-[#dc2626] text-sm"
                        >
                          <option value="">Não informado</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                    </div>
                    {resolveError && <p className="text-xs text-[#991b1b] mt-2">{resolveError}</p>}
                    {canEdit && (
                      <button
                        onClick={() => handleResolve(detailReturn.id)}
                        disabled={resolving}
                        className="mt-2 px-4 py-2 rounded-lg bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {resolving ? 'Salvando...' : '✅ Marcar como Concluído'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e2e5ea]">
                {user?.role === 'admin_master' && (detailReturn.status === 'finalizado' || detailReturn.resolution_notes) && (
                  <button
                    onClick={() => handleReopen(detailReturn.id)}
                    disabled={reopening}
                    title="Exclusivo do criador: desfaz a resolução e volta pra quarentena"
                    className="mr-auto px-4 py-2 rounded-lg text-sm text-[#7c3aed] border border-[#ddd6fe] hover:bg-[#ede9fe] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {reopening ? 'Revertendo...' : '↩️ Reverter p/ Quarentena'}
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(detailReturn.id)} className="px-4 py-2 rounded-lg text-sm text-[#dc2626] hover:bg-[#fee2e2] transition-colors cursor-pointer">
                    Deletar
                  </button>
                )}
                <button onClick={() => setDetailReturn(null)} className={btnOutline}>Fechar</button>
                {(canEdit || user?.role === 'admin_master') && (
                  <button onClick={() => openEditForm(detailReturn)} className={btnPrimary}>Editar</button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

export default Returns
