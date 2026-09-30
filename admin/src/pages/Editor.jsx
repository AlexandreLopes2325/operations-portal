import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_URL } from '../config'

function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [manual, setManual] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [editingColor, setEditingColor] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [activeTab, setActiveTab] = useState('blocks')
  const [customHtml, setCustomHtml] = useState('')
  const [htmlSaving, setHtmlSaving] = useState(false)
  const [htmlSaved, setHtmlSaved] = useState(false)
  const saveTimers = useRef({})

  const token = localStorage.getItem('token')
  // HTML customizado é exclusivo de admin/admin_master (o backend também bloqueia)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const canEditCustomHtml = ['admin', 'admin_master'].includes(currentUser.role)

  const colors = [
    '#22c55e', '#3b82f6', '#a855f7', '#f59e0b',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316',
    '#6366f1', '#84cc16', '#06b6d4', '#ffffff'
  ]

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    fetchManual()
    fetchSections()
  }, [])

  const fetchManual = async () => {
    try {
      const response = await fetch(`${API_URL}/manuals/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await response.json()
      if (response.ok) { setManual(data); setCustomHtml(data.custom_html || '') }
    } catch (err) { console.error('Erro ao buscar manual:', err) }
  }

  const fetchSections = async () => {
    try {
      const response = await fetch(`${API_URL}/sections/manual/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await response.json()
      if (response.ok) setSections(data)
    } catch (err) { console.error('Erro ao buscar seções:', err) }
    setLoading(false)
  }

  const saveCustomHtml = async () => {
    setHtmlSaving(true); setHtmlSaved(false)
    try {
      const response = await fetch(`${API_URL}/manuals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: manual.title, description: manual.description, slug: manual.slug, status: manual.status, custom_html: customHtml || null })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Erro ao salvar HTML customizado')
        setHtmlSaving(false)
        return
      }
      setManual({ ...manual, custom_html: customHtml || null })
      setHtmlSaved(true)
      setTimeout(() => setHtmlSaved(false), 2000)
    } catch (err) { console.error('Erro ao salvar HTML:', err); alert('Erro ao salvar HTML customizado') }
    setHtmlSaving(false)
  }

  const clearCustomHtml = async () => {
    if (!confirm('Tem certeza? Isso vai remover o HTML customizado e o site público vai voltar a usar os blocos.')) return
    try {
      const response = await fetch(`${API_URL}/manuals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: manual.title, description: manual.description, slug: manual.slug, status: manual.status, custom_html: null })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Erro ao remover HTML customizado')
        return
      }
      setCustomHtml('')
      setManual({ ...manual, custom_html: null })
    } catch (err) { console.error('Erro ao limpar HTML:', err) }
  }

  const uploadImageForHtml = async (file) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const response = await fetch(`${API_URL}/logos/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ image_data: base64, filename: file.name })
        })
        const data = await response.json()
        if (response.ok) {
          await navigator.clipboard.writeText(data.url)
          alert('URL copiada pro clipboard! Cole no seu HTML:\n\n' + data.url)
        } else { alert(data.error || 'Erro no upload') }
      } catch (err) { alert('Erro ao conectar com o servidor') }
    }
    reader.readAsDataURL(file)
  }

  const addSection = async (type) => {
    const defaultContent = {
      title: { text: 'Novo título' }, subtitle: { text: 'Novo subtítulo', level: 'h2' },
      text: { text: 'Escreva aqui...' }, alert: { text: 'Atenção: escreva o alerta aqui', variant: 'warning' },
      step: { text: 'Descreva o passo aqui', number: sections.length + 1 },
      checklist: { items: ['Item 1', 'Item 2', 'Item 3'] },
      image: { url: '', alt: 'Descrição da imagem', caption: '', width: '100%' },
      table: { headers: ['Coluna 1', 'Coluna 2', 'Coluna 3'], rows: [['', '', ''], ['', '', '']] },
      divider: { style: 'solid' }
    }
    try {
      const response = await fetch(`${API_URL}/sections/manual/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type, content: defaultContent[type] || { text: '' }, color: '#22c55e', sort_order: sections.length + 1 })
      })
      const data = await response.json()
      if (response.ok) { setSections([...sections, data.section]); setShowAddBlock(false) }
    } catch (err) { console.error('Erro ao criar seção:', err) }
  }

  const saveSection = async (sectionId, updates) => {
    try {
      const section = sections.find(s => s.id === sectionId)
      await fetch(`${API_URL}/sections/${sectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: updates.type || section.type, content: updates.content || section.content, color: updates.color || section.color, sort_order: updates.sort_order !== undefined ? updates.sort_order : section.sort_order })
      })
    } catch (err) { console.error('Erro ao salvar seção:', err) }
  }

  const updateSection = (sectionId, newContent) => {
    const section = sections.find(s => s.id === sectionId)
    setSections(sections.map(s => s.id === sectionId ? { ...s, content: newContent } : s))
    if (saveTimers.current[sectionId]) clearTimeout(saveTimers.current[sectionId])
    saveTimers.current[sectionId] = setTimeout(() => {
      saveSection(sectionId, { content: newContent, type: section.type, color: section.color, sort_order: section.sort_order })
    }, 1000)
  }

  const updateSectionColor = (sectionId, newColor) => {
    const section = sections.find(s => s.id === sectionId)
    setSections(sections.map(s => s.id === sectionId ? { ...s, color: newColor } : s))
    saveSection(sectionId, { content: section.content, type: section.type, color: newColor, sort_order: section.sort_order })
    setEditingColor(null)
  }

  const moveSection = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sections.length) return
    const ns = [...sections]; const temp = ns[index]; ns[index] = ns[newIndex]; ns[newIndex] = temp
    const updated = ns.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setSections(updated)
    saveSection(updated[index].id, { content: updated[index].content, type: updated[index].type, color: updated[index].color, sort_order: updated[index].sort_order })
    saveSection(updated[newIndex].id, { content: updated[newIndex].content, type: updated[newIndex].type, color: updated[newIndex].color, sort_order: updated[newIndex].sort_order })
  }

  const handleDragStart = (index) => { setDragIndex(index) }
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index) }
  const handleDragEnd = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) { setDragIndex(null); setDragOverIndex(null); return }
    const ns = [...sections]; const item = ns[dragIndex]; ns.splice(dragIndex, 1); ns.splice(dragOverIndex, 0, item)
    const updated = ns.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setSections(updated)
    updated.forEach((s) => { saveSection(s.id, { content: s.content, type: s.type, color: s.color, sort_order: s.sort_order }) })
    setDragIndex(null); setDragOverIndex(null)
  }

  const deleteSection = async (sectionId) => {
    if (!confirm('Deletar este bloco?')) return
    try {
      const r = await fetch(`${API_URL}/sections/${sectionId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      if (r.ok) setSections(sections.filter(s => s.id !== sectionId))
    } catch (err) { console.error('Erro:', err) }
  }

  const updateManualStatus = async (status) => {
    try {
      await fetch(`${API_URL}/manuals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title: manual.title, description: manual.description, slug: manual.slug, status }) })
      setManual({ ...manual, status })
    } catch (err) { console.error('Erro:', err) }
  }

  const addTableRow = (sid, c) => { updateSection(sid, { ...c, rows: [...c.rows, c.headers.map(() => '')] }) }
  const removeTableRow = (sid, c, ri) => { updateSection(sid, { ...c, rows: c.rows.filter((_, i) => i !== ri) }) }
  const addTableColumn = (sid, c) => { updateSection(sid, { ...c, headers: [...c.headers, `Col ${c.headers.length + 1}`], rows: c.rows.map(r => [...r, '']) }) }
  const removeTableColumn = (sid, c, ci) => { updateSection(sid, { ...c, headers: c.headers.filter((_, i) => i !== ci), rows: c.rows.map(r => r.filter((_, i) => i !== ci)) }) }

  const Preview = () => (
    <div className="bg-white rounded-xl p-8 text-black min-h-[400px]">
      {sections.length === 0 ? (<p className="text-gray-400 text-center mt-16">O preview aparece aqui</p>) : (
        <div className="space-y-4">
          {sections.map((s) => (
            <div key={s.id}>
              {s.type === 'title' && <h1 className="text-3xl font-bold" style={{ color: s.color }}>{s.content.text || 'Título vazio'}</h1>}
              {s.type === 'subtitle' && (s.content.level === 'h3' ? <h3 className="text-lg font-semibold" style={{ color: s.color }}>{s.content.text || ''}</h3> : <h2 className="text-xl font-bold" style={{ color: s.color }}>{s.content.text || ''}</h2>)}
              {s.type === 'text' && <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: '#333' }}>{s.content.text || ''}</p>}
              {s.type === 'alert' && <div className="p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ borderColor: s.color, backgroundColor: s.color + '10' }}><span className="text-lg">⚠️</span><p className="text-sm" style={{ color: '#333' }}>{s.content.text || ''}</p></div>}
              {s.type === 'step' && <div className="flex items-start gap-4"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: s.color }}>{s.content.number || s.sort_order}</div><p className="text-base pt-2 whitespace-pre-wrap" style={{ color: '#333' }}>{s.content.text || ''}</p></div>}
              {s.type === 'checklist' && <div className="space-y-2">{(s.content.items || []).map((item, i) => (<div key={i} className="flex items-center gap-3"><div className="w-5 h-5 rounded border-2 shrink-0" style={{ borderColor: s.color }} /><span style={{ color: '#333' }}>{item || ''}</span></div>))}</div>}
              {s.type === 'image' && s.content.url && <div className="my-4"><img src={s.content.url} alt={s.content.alt || ''} className="rounded-lg border border-gray-200" style={{ width: s.content.width || '100%' }} />{s.content.caption && <p className="text-sm text-gray-500 mt-2 text-center italic">{s.content.caption}</p>}</div>}
              {s.type === 'table' && <div className="my-4 overflow-x-auto"><table className="w-full border-collapse"><thead><tr>{(s.content.headers || []).map((h, i) => <th key={i} className="text-left text-sm font-semibold p-3 border-b-2" style={{ borderColor: s.color, color: '#333' }}>{h}</th>)}</tr></thead><tbody>{(s.content.rows || []).map((row, ri) => <tr key={ri} className={ri % 2 === 0 ? 'bg-gray-50' : ''}>{row.map((cell, ci) => <td key={ci} className="text-sm p-3 border-b border-gray-200" style={{ color: '#333' }}>{cell || '-'}</td>)}</tr>)}</tbody></table></div>}
              {s.type === 'divider' && <hr className="my-6" style={{ border: 'none', borderTop: `2px ${s.content.style || 'solid'} ${s.color}`, opacity: 0.3 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (loading) return <Layout><div className="min-h-screen flex items-center justify-center text-[#555555]">Carregando...</div></Layout>
  if (!manual) return <Layout><div className="min-h-screen flex items-center justify-center text-red-400">Manual não encontrado</div></Layout>

  return (
    <Layout>
      <div className="text-white">
        {/* Header */}
        <header className="border-b border-[#222222] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/manuals')} className="text-[#888888] hover:text-white transition-colors cursor-pointer">← Voltar</button>
            <div><h1 className="text-lg font-bold">{manual.title}</h1><p className="text-xs text-[#555555]">/{manual.slug}</p></div>
            <span className={`text-xs px-2 py-1 rounded ${manual.status === 'published' ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>{manual.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
            {manual.custom_html && <span title={canEditCustomHtml ? undefined : 'Este manual usa HTML customizado: o portal público mostra o HTML, não os blocos. Só Admin e Admin Master podem alterá-lo.'} className="text-xs px-2 py-1 rounded bg-[#a855f7]/10 text-[#a855f7]">HTML Customizado{canEditCustomHtml ? '' : ' (só admin)'}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={async () => { const r = await fetch(`${API_URL}/templates/save/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); const d = await r.json(); alert(r.ok ? d.message : (d.error || 'Erro')) }} className="text-sm px-4 py-2 rounded-lg border border-[#a855f7] text-[#a855f7] hover:bg-[#a855f7]/10 transition-colors cursor-pointer">💾 Template</button>
            <button onClick={() => setShowPreview(!showPreview)} className={`text-sm px-4 py-2 rounded-lg border transition-colors cursor-pointer ${showPreview ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#333333] text-[#888888]'}`}>{showPreview ? '👁️ ON' : '👁️ OFF'}</button>
            {manual.status === 'draft'
              ? <button onClick={() => updateManualStatus('published')} className="text-sm px-4 py-2 rounded-lg bg-[#22c55e] text-black font-semibold hover:bg-[#16a34a] transition-colors cursor-pointer">Publicar</button>
              : <button onClick={() => updateManualStatus('draft')} className="text-sm px-4 py-2 rounded-lg border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-colors cursor-pointer">Rascunho</button>}
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-[#222222] px-6">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('blocks')} className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'blocks' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-[#888888] hover:text-white'}`}>📝 Editor de Blocos</button>
            {canEditCustomHtml && (
              <button onClick={() => setActiveTab('html')} className={`px-5 py-3 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'html' ? 'text-[#a855f7] border-b-2 border-[#a855f7]' : 'text-[#888888] hover:text-white'}`}>🖥️ HTML Customizado</button>
            )}
          </div>
        </div>

        {activeTab === 'html' && canEditCustomHtml ? (
          /* ==================== ABA HTML ==================== */
          <main className="p-6">
            <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm text-[#555555] uppercase">HTML + CSS</h2>
                                    <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm px-4 py-2 rounded-lg bg-[#14b8a6] text-white font-semibold hover:bg-[#0d9488] transition-colors cursor-pointer flex items-center gap-2">
                      📄 Upload HTML
                      <input type="file" accept=".html,.htm" className="hidden" onChange={(e) => {
                        const file = e.target.files[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = () => setCustomHtml(reader.result)
                        reader.readAsText(file)
                      }} />
                    </label>
                    <label className="text-sm px-4 py-2 rounded-lg bg-[#3b82f6] text-white font-semibold hover:bg-[#2563eb] transition-colors cursor-pointer flex items-center gap-2">
                      📁 Upload Imagens
                      <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                        const files = Array.from(e.target.files)
                        if (files.length === 0) return
                        let updatedHtml = customHtml
                        let count = 0
                        for (const file of files) {
                          const reader = new FileReader()
                          const base64 = await new Promise((resolve) => {
                            reader.onload = () => resolve(reader.result.split(',')[1])
                            reader.readAsDataURL(file)
                          })
                          try {
                            const response = await fetch(`${API_URL}/logos/upload-image`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ image_data: base64, filename: file.name })
                            })
                            const data = await response.json()
                            if (response.ok) {
                                const namePatterns = [
                                `./telas-picking/${file.name}`,
                                `./img-picking/${file.name}`,
                                `./images/${file.name}`,
                                `./img/${file.name}`,
                                `telas-picking/${file.name}`,
                                `img-picking/${file.name}`,
                                `images/${file.name}`,
                                `img/${file.name}`,
                                `./${file.name}`,
                                file.name
                              ]
                              namePatterns.forEach(pattern => {
                                updatedHtml = updatedHtml.split(pattern).join(data.url)
                              })
                              count++
                            }
                          } catch (err) { console.error('Erro upload:', file.name, err) }
                        }
                        setCustomHtml(updatedHtml)
                        alert(`${count} de ${files.length} imagens enviadas! Os caminhos no HTML foram atualizados automaticamente.`)
                      }} />
                    </label>
                    <label className="text-sm px-4 py-2 rounded-lg bg-[#6366f1] text-white font-semibold hover:bg-[#4f46e5] transition-colors cursor-pointer flex items-center gap-2">
                      📷 1 Imagem
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files[0]) uploadImageForHtml(e.target.files[0]) }} />
                    </label>
                    {customHtml && (
                      <button onClick={clearCustomHtml} className="text-xs px-3 py-1 rounded text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 transition-colors cursor-pointer">Remover HTML</button>
                    )}
                    <button onClick={saveCustomHtml} disabled={htmlSaving} className="text-sm px-4 py-2 rounded-lg bg-[#a855f7] text-white font-semibold hover:bg-[#9333ea] transition-colors disabled:opacity-50 cursor-pointer">
                      {htmlSaving ? 'Salvando...' : htmlSaved ? '✅ Salvo!' : 'Salvar HTML'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-[#111111] border border-[#222222] overflow-hidden">
                  <div className="p-3 border-b border-[#222222] flex items-center justify-between">
                    <span className="text-xs text-[#555555]">Cole seu HTML completo aqui (com CSS inline ou style tag)</span>
                    {customHtml && <span className="text-xs text-[#a855f7]">Ativo — site público usa este HTML</span>}
                  </div>
                  <textarea value={customHtml} onChange={(e) => setCustomHtml(e.target.value)}
                    placeholder={"<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    /* Seu CSS aqui */\n  </style>\n</head>\n<body>\n  <!-- Seu conteúdo aqui -->\n</body>\n</html>"}
                    className="w-full p-4 bg-[#0a0a0a] text-[#22c55e] font-mono text-sm resize-none focus:outline-none"
                    style={{ minHeight: '600px', tabSize: 2 }} spellCheck={false} />
                </div>

                <div className="mt-4 p-4 rounded-xl bg-[#111111] border border-[#222222]">
                  <p className="text-sm text-[#888888] mb-2">💡 Como funciona:</p>
                    <ul className="text-xs text-[#555555] space-y-1">
                    <li>• <b>📄 Upload HTML</b> — seleciona o arquivo .html e preenche o editor</li>
                    <li>• <b>📁 Upload Imagens</b> — seleciona TODAS as imagens da pasta de uma vez</li>
                    <li>• O sistema sobe as imagens e troca os caminhos no HTML automaticamente</li>
                    <li>• <b>📷 1 Imagem</b> — sobe uma imagem e copia a URL pro clipboard</li>
                    <li>• Clique em "Salvar HTML" pra publicar</li>
                    <li>• Os blocos continuam salvos — você não perde nada</li>
                  </ul>
                </div>
              </div>

              {showPreview && (
                <div>
                  <h2 className="text-sm text-[#555555] uppercase mb-4">Preview</h2>
                  <div className="sticky top-6">
                    {customHtml ? (
                      <iframe srcDoc={customHtml} className="w-full rounded-xl border border-[#222222] bg-white" style={{ minHeight: '600px' }} title="Preview HTML" />
                    ) : (
                      <div className="bg-[#111111] rounded-xl p-8 text-center text-[#555555] border border-[#222222]">
                        <p className="text-lg mb-2">Nenhum HTML customizado</p>
                        <p className="text-sm">Cole seu HTML à esquerda pra ver o preview</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        ) : (
          /* ==================== ABA BLOCOS ==================== */
          <main className="p-6">
            <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
              <div>
                <h2 className="text-sm text-[#555555] uppercase mb-4">Editor</h2>
                {sections.length === 0 ? (
                  <div className="text-center py-16 text-[#555555]"><p className="text-lg mb-2">Nenhum bloco ainda</p><p className="text-sm">Clique em "+ Adicionar Bloco"</p></div>
                ) : (
                  <div className="space-y-4">
                    {sections.map((section, index) => (
                      <div key={section.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd}
                        className={`group relative rounded-xl bg-[#111111] border p-5 transition-all ${dragOverIndex === index && dragIndex !== index ? 'border-[#22c55e] bg-[#22c55e]/5' : dragIndex === index ? 'opacity-50 border-[#333333]' : 'border-[#222222] hover:border-[#333333]'}`}>
                        <div className="absolute top-3 right-3 hidden group-hover:flex items-center gap-1">
                          <button onClick={() => moveSection(index, -1)} disabled={index === 0} className={`text-xs bg-[#1a1a1a] px-2 py-1 rounded cursor-pointer ${index === 0 ? 'text-[#333]' : 'text-[#888] hover:text-white hover:bg-[#333]'}`}>↑</button>
                          <button onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} className={`text-xs bg-[#1a1a1a] px-2 py-1 rounded cursor-pointer ${index === sections.length - 1 ? 'text-[#333]' : 'text-[#888] hover:text-white hover:bg-[#333]'}`}>↓</button>
                          <span className="text-xs text-[#555] bg-[#1a1a1a] px-2 py-1 rounded">{section.type}</span>
                          <button onClick={() => setEditingColor(editingColor === section.id ? null : section.id)} className="text-xs bg-[#1a1a1a] px-2 py-1 rounded cursor-pointer hover:bg-[#333]"><span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: section.color }} /></button>
                          <button onClick={() => deleteSection(section.id)} className="text-xs text-red-400 hover:text-red-300 bg-[#1a1a1a] px-2 py-1 rounded cursor-pointer">Deletar</button>
                        </div>
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 hidden group-hover:flex cursor-grab active:cursor-grabbing text-[#555] hover:text-[#888]"><span className="text-xs">⠿</span></div>
                        {editingColor === section.id && (<div className="mb-4 p-3 rounded-lg bg-[#1a1a1a] border border-[#333]"><p className="text-xs text-[#888] mb-2">Cor:</p><div className="flex flex-wrap gap-2">{colors.map(c => <button key={c} onClick={() => updateSectionColor(section.id, c)} className={`w-7 h-7 rounded-full cursor-pointer border-2 hover:scale-110 ${section.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div></div>)}
                        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full" style={{ backgroundColor: section.color }} />
                        <div className="pl-4">
                          {section.type === 'title' && <input type="text" value={section.content.text} onChange={(e) => updateSection(section.id, { ...section.content, text: e.target.value })} className="w-full text-2xl font-bold bg-transparent border-none outline-none text-white" />}
                          {section.type === 'subtitle' && (<div className="space-y-2"><input type="text" value={section.content.text} onChange={(e) => updateSection(section.id, { ...section.content, text: e.target.value })} className="w-full text-lg font-semibold bg-transparent border-none outline-none text-white" /><div className="flex gap-2">{['h2','h3'].map(l => <button key={l} onClick={() => updateSection(section.id, { ...section.content, level: l })} className={`text-xs px-3 py-1 rounded cursor-pointer ${(section.content.level||'h2')===l ? 'bg-[#22c55e] text-black' : 'bg-[#1a1a1a] text-[#888]'}`}>{l==='h2'?'Grande':'Pequeno'}</button>)}</div></div>)}
                          {section.type === 'text' && <textarea value={section.content.text} onChange={(e) => updateSection(section.id, { ...section.content, text: e.target.value })} rows={4} className="w-full bg-transparent border-none outline-none text-[#ccc] resize-none" />}
                          {section.type === 'alert' && <div className="flex items-start gap-3"><span className="text-xl">⚠️</span><textarea value={section.content.text} onChange={(e) => updateSection(section.id, { ...section.content, text: e.target.value })} rows={2} className="w-full bg-transparent border-none outline-none text-[#f59e0b] resize-none" /></div>}
                          {section.type === 'step' && <div className="flex items-start gap-4"><div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ backgroundColor: section.color+'20', color: section.color }}>{section.content.number||section.sort_order}</div><textarea value={section.content.text} onChange={(e) => updateSection(section.id, { ...section.content, text: e.target.value })} rows={2} className="w-full bg-transparent border-none outline-none text-[#ccc] resize-none" /></div>}
                          {section.type === 'checklist' && (<div className="space-y-2">{(section.content.items||[]).map((item,idx) => (<div key={idx} className="flex items-center gap-3"><div className="w-4 h-4 rounded border-2 shrink-0" style={{ borderColor: section.color }} /><input type="text" value={item} onChange={(e) => { const ni=[...section.content.items]; ni[idx]=e.target.value; updateSection(section.id, { ...section.content, items: ni }) }} className="w-full bg-transparent border-none outline-none text-[#ccc]" /></div>))}<button onClick={() => updateSection(section.id, { ...section.content, items: [...(section.content.items||[]), ''] })} className="text-xs text-[#22c55e] cursor-pointer mt-1">+ Item</button></div>)}
                          {section.type === 'image' && (<div className="space-y-3"><div><label className="block text-xs text-[#888] mb-1">Imagem</label><div className="flex gap-2"><input type="text" value={section.content.url||''} onChange={(e) => updateSection(section.id, { ...section.content, url: e.target.value })} placeholder="URL ou faça upload" className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#22c55e]" /><label className="px-4 py-2 rounded-lg bg-[#22c55e] text-black text-sm font-semibold hover:bg-[#16a34a] cursor-pointer flex items-center">Upload<input type="file" accept="image/*" className="hidden" onChange={async(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{const b=r.result.split(',')[1];try{const res=await fetch(`${API_URL}/logos/upload-image`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({image_data:b,filename:f.name})});const d=await res.json();if(res.ok)updateSection(section.id,{...section.content,url:d.url});else alert(d.error)}catch(err){alert('Erro')}};r.readAsDataURL(f)}} /></label></div></div>{section.content.url&&(<div><img src={section.content.url} alt={section.content.alt||''} className="rounded-lg border border-[#333] object-contain" style={{width:section.content.width||'100%',maxHeight:'300px'}} /><div className="flex gap-2 mt-2">{['25%','50%','75%','100%'].map(sz=><button key={sz} onClick={()=>updateSection(section.id,{...section.content,width:sz})} className={`text-xs px-3 py-1 rounded cursor-pointer ${(section.content.width||'100%')===sz?'bg-[#22c55e] text-black':'bg-[#1a1a1a] text-[#888]'}`}>{sz}</button>)}</div></div>)}<div><label className="block text-xs text-[#888] mb-1">Alt</label><input type="text" value={section.content.alt||''} onChange={(e)=>updateSection(section.id,{...section.content,alt:e.target.value})} placeholder="Descrição" className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#22c55e]" /></div><div><label className="block text-xs text-[#888] mb-1">Legenda</label><input type="text" value={section.content.caption||''} onChange={(e)=>updateSection(section.id,{...section.content,caption:e.target.value})} placeholder="Legenda" className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#22c55e]" /></div></div>)}
                          {section.type === 'table' && (<div className="space-y-3"><div className="overflow-x-auto"><table className="w-full"><thead><tr>{(section.content.headers||[]).map((h,ci)=><th key={ci} className="p-0"><div className="flex items-center gap-1"><input type="text" value={h} onChange={(e)=>{const nh=[...section.content.headers];nh[ci]=e.target.value;updateSection(section.id,{...section.content,headers:nh})}} className="w-full px-2 py-1 bg-[#1a1a1a] border border-[#333] text-white text-xs font-semibold rounded focus:outline-none focus:border-[#22c55e]" />{section.content.headers.length>1&&<button onClick={()=>removeTableColumn(section.id,section.content,ci)} className="text-red-400 text-xs cursor-pointer shrink-0">✕</button>}</div></th>)}</tr></thead><tbody>{(section.content.rows||[]).map((row,ri)=><tr key={ri}>{row.map((cell,ci)=><td key={ci} className="p-0 pt-1"><input type="text" value={cell} onChange={(e)=>{const nr=[...section.content.rows];nr[ri]=[...nr[ri]];nr[ri][ci]=e.target.value;updateSection(section.id,{...section.content,rows:nr})}} className="w-full px-2 py-1 bg-[#0a0a0a] border border-[#222] text-[#ccc] text-xs rounded focus:outline-none focus:border-[#22c55e]" /></td>)}<td className="p-0 pt-1 pl-1"><button onClick={()=>removeTableRow(section.id,section.content,ri)} className="text-red-400 text-xs cursor-pointer">✕</button></td></tr>)}</tbody></table></div><div className="flex gap-3"><button onClick={()=>addTableRow(section.id,section.content)} className="text-xs text-[#22c55e] cursor-pointer">+ Linha</button><button onClick={()=>addTableColumn(section.id,section.content)} className="text-xs text-[#3b82f6] cursor-pointer">+ Coluna</button></div></div>)}
                          {section.type === 'divider' && (<div className="space-y-2"><hr style={{border:'none',borderTop:`2px ${section.content.style||'solid'} ${section.color}`,opacity:0.5}} /><div className="flex gap-2">{['solid','dashed','dotted'].map(st=><button key={st} onClick={()=>updateSection(section.id,{...section.content,style:st})} className={`text-xs px-3 py-1 rounded cursor-pointer ${(section.content.style||'solid')===st?'bg-[#22c55e] text-black':'bg-[#1a1a1a] text-[#888]'}`}>{st==='solid'?'Sólido':st==='dashed'?'Tracejado':'Pontilhado'}</button>)}</div></div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  {showAddBlock ? (
                    <div className="rounded-xl bg-[#111111] border border-[#222222] p-5">
                      <p className="text-sm text-[#888888] mb-4">Tipo de bloco:</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[{type:'title',label:'Título',icon:'📝'},{type:'subtitle',label:'Subtítulo',icon:'📌'},{type:'text',label:'Texto',icon:'📄'},{type:'alert',label:'Alerta',icon:'⚠️'},{type:'step',label:'Passo',icon:'🔢'},{type:'checklist',label:'Checklist',icon:'☑️'},{type:'image',label:'Imagem',icon:'🖼️'},{type:'table',label:'Tabela',icon:'📊'},{type:'divider',label:'Separador',icon:'➖'}].map(b=>(<button key={b.type} onClick={()=>addSection(b.type)} className="p-4 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-[#22c55e] transition-colors text-center cursor-pointer"><span className="text-2xl">{b.icon}</span><p className="text-sm text-[#aaa] mt-2">{b.label}</p></button>))}
                      </div>
                      <button onClick={()=>setShowAddBlock(false)} className="mt-4 text-sm text-[#555] hover:text-white cursor-pointer">Cancelar</button>
                    </div>
                  ) : (<button onClick={()=>setShowAddBlock(true)} className="w-full py-4 rounded-xl border border-dashed border-[#333] text-[#555] hover:text-[#22c55e] hover:border-[#22c55e] transition-colors cursor-pointer">+ Adicionar Bloco</button>)}
                </div>
              </div>
              {showPreview && <div><h2 className="text-sm text-[#555] uppercase mb-4">Preview</h2><div className="sticky top-6"><Preview /></div></div>}
            </div>
          </main>
        )}
      </div>
    </Layout>
  )
}

export default Editor