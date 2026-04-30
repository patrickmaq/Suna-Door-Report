import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ACT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug']

// Light mode: original warm cream palette (unchanged from v1)
const light = {
  bg:'#f2f1ee', surface:'#FFFFFF', surface2:'#ebe9e4',
  border:'#dddad4', border2:'#cdc9c0', text:'#413124',
  muted:'#7a7168', muted2:'#b0a899', gold:'#413124',
  goldLight:'rgba(65,49,36,0.08)', green:'#2e3d37',
  blue:'#80bacf', red:'#b83232', tag:'#e4e1db'
}
// Dark mode: true inversion — cream↔dark-brown, white↔near-black, borders flipped.
// Gold becomes a warm light tan so it's visible on dark surfaces.
const dark = {
  bg:'#413124', surface:'#2e2318', surface2:'#241a10',
  border:'#5a4535', border2:'#6e5642', text:'#f2f1ee',
  muted:'#b0a899', muted2:'#7a7168', gold:'#d4956a',
  goldLight:'rgba(212,149,106,0.12)', green:'#6dbf9e',
  blue:'#80bacf', red:'#e05757', tag:'#5a4535'
}

// FIX 2: Analytics bar color palette — first color changed from #413124
// (same as font) to a visible amber/gold that works in both themes.
// The palette is used in analytics charts; index 0 was the culprit for Nathan.
const CHART_COLORS = ['#c9943a','#80bacf','#4caf80','#a78bfa','#fb923c','#f472b6','#34d399','#fbbf24']

const ACCOUNT_TYPES = ['Major','Chain','Independent','Pharmacy','Franchise','eCommerce','Cafe','Hotel - Hospitality','Spa/Gym','Retail','Tourism - Cafe','Co-op','']
const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

// FIX 4: Suna logo as base64 — replaces the hand-drawn SVG wordmark on login & topbar.
// The source PNG is near-black on black, so we apply CSS filter to make it visible.
const SUNA_LOGO_B64 = 'data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAoADwDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAEI/8QAHBABAQADAQADAAAAAAAAAAAAAAERIUExAmFx/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AMZAAC8QAAAAFnmimi0Fzi3UsS8/FuLPvqUC6pT5bpQN8L6XFucl90CAAAAAAAA//9k='

function fmt(n){ if(!n) return '—'; return '$'+Math.round(n).toLocaleString('en-CA') }
function fmtS(n){ if(!n) return ''; if(n>=10000) return '$'+(n/1000).toFixed(0)+'k'; if(n>=1000) return '$'+(n/1000).toFixed(1)+'k'; return '$'+Math.round(n) }

// ── MODAL WRAPPER ─────────────────────────────────────
function Modal({ onClose, children, width = '520px' }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:200, backdropFilter:'blur(3px)' }} onClick={onClose}/>
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto', zIndex:201, borderRadius:'14px' }}>
        {children}
      </div>
    </>
  )
}

export default function App() {
  const [isDark, setIsDark] = useState(false)
  const c = isDark ? dark : light
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')
  const [accounts, setAccounts] = useState([])
  const [revenue, setRevenue] = useState({})
  const [activity, setActivity] = useState({})
  const [spocFilter, setSpocFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const PAGE_SIZE = 30
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // Modal states
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showAddRep, setShowAddRep] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showLogoUpload, setShowLogoUpload] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)

  // Derived reps list
  const reps = [...new Set(accounts.map(a => a.spoc).filter(Boolean))].sort()

  // FIX 3: Count of accounts per rep (for sidebar badges)
  const repCounts = reps.reduce((acc, rep) => {
    acc[rep] = accounts.filter(a => a.spoc === rep).length
    return acc
  }, {})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) loadData() }, [session])

  async function loadData() {
    const [{ data: acc }, { data: rev }, { data: act }] = await Promise.all([
      supabase.from('accounts').select('*').order('company'),
      supabase.from('monthly_revenue').select('*'),
      supabase.from('activity_log').select('*')
    ])
    setAccounts(acc || [])
    const revMap = {}
    ;(rev || []).forEach(r => { if (!revMap[r.account_id]) revMap[r.account_id] = {}; revMap[r.account_id][r.month] = r.amount })
    setRevenue(revMap)
    const actMap = {}
    ;(act || []).forEach(a => { if (!actMap[a.account_id]) actMap[a.account_id] = {}; actMap[a.account_id][a.month] = a })
    setActivity(actMap)
    // Load logo from Supabase storage (user-uploaded override)
    const { data: logoFiles } = await supabase.storage.from('logos').list('')
    if (logoFiles && logoFiles.length > 0) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(logoFiles[0].name)
      setLogoUrl(publicUrl)
    }
  }

  async function uploadLogo(file) {
    setLogoUploading(true)
    const { data: existing } = await supabase.storage.from('logos').list('')
    if (existing && existing.length > 0) {
      await supabase.storage.from('logos').remove(existing.map(f => f.name))
    }
    const ext = file.name.split('.').pop()
    const { error } = await supabase.storage.from('logos').upload(`logo.${ext}`, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(`logo.${ext}`)
      setLogoUrl(publicUrl + '?t=' + Date.now())
    }
    setLogoUploading(false)
    setShowLogoUpload(false)
  }

  async function removeLogo() {
    const { data: existing } = await supabase.storage.from('logos').list('')
    if (existing && existing.length > 0) {
      await supabase.storage.from('logos').remove(existing.map(f => f.name))
    }
    setLogoUrl(null)
    setShowLogoUpload(false)
  }

  async function signIn() {
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
  }

  async function signOut() { await supabase.auth.signOut() }

  async function toggleActivity(accountId, month, field) {
    setSaving(true)
    const current = activity[accountId]?.[month] || {}
    const newVal = !current[field]
    const upsertData = { account_id: accountId, month, email_sent: current.email_sent || false, visit_done: current.visit_done || false, order_placed: current.order_placed || 0, call_done: current.call_done || false, [field]: newVal }
    const { error } = await supabase.from('activity_log').upsert(upsertData, { onConflict: 'account_id,month' })
    if (!error) setActivity(prev => ({ ...prev, [accountId]: { ...prev[accountId], [month]: { ...current, [field]: newVal } } }))
    setSaving(false)
  }

  async function updateRevenue(accountId, month, amount) {
    const num = parseFloat(amount) || 0
    await supabase.from('monthly_revenue').upsert({ account_id: accountId, month, amount: num }, { onConflict: 'account_id,month' })
    setRevenue(prev => ({ ...prev, [accountId]: { ...prev[accountId], [month]: num } }))
  }

  async function addAccount(formData) {
    setSaving(true)
    const { data, error } = await supabase.from('accounts').insert([{
      company: formData.company,
      spoc: formData.spoc,
      type: formData.type || null,
      city: formData.city || null,
      prov: formData.prov || null,
      address: formData.address || null,
      email: formData.email || null,
      manager: formData.manager || null,
      commission: formData.commission || null,
      status: false,
      actual_doors: parseInt(formData.actual_doors) || 0,
      target_doors: parseInt(formData.target_doors) || 1,
    }]).select()
    if (!error && data) {
      setAccounts(prev => [...prev, ...data].sort((a,b) => a.company.localeCompare(b.company)))
      setShowAddAccount(false)
    }
    setSaving(false)
    return error
  }

  async function saveAccountEdit(formData) {
    setSaving(true)
    const { data, error } = await supabase.from('accounts').update({
      company: formData.company,
      spoc: formData.spoc,
      type: formData.type || null,
      city: formData.city || null,
      prov: formData.prov || null,
      address: formData.address || null,
      email: formData.email || null,
      manager: formData.manager || null,
      commission: formData.commission || null,
      status: formData.status === 'true' || formData.status === true,
      actual_doors: parseInt(formData.actual_doors) || 0,
      target_doors: parseInt(formData.target_doors) || 1,
    }).eq('id', formData.id).select()
    if (!error && data) {
      setAccounts(prev => prev.map(a => a.id === formData.id ? data[0] : a))
      if (selectedAccount?.id === formData.id) setSelectedAccount(data[0])
      setEditingAccount(null)
    }
    setSaving(false)
    return error
  }

  async function deleteAccount(id) {
    setSaving(true)
    await supabase.from('activity_log').delete().eq('account_id', id)
    await supabase.from('monthly_revenue').delete().eq('account_id', id)
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (!error) {
      setAccounts(prev => prev.filter(a => a.id !== id))
      setRevenue(prev => { const n = {...prev}; delete n[id]; return n })
      setActivity(prev => { const n = {...prev}; delete n[id]; return n })
      if (selectedAccount?.id === id) setSelectedAccount(null)
    }
    setShowDeleteConfirm(null)
    setSaving(false)
  }

  function getTotal(id) { return MONTHS.reduce((a, m) => a + (revenue[id]?.[m] || 0), 0) }
  function isActive(acc) { return acc.status || getTotal(acc.id) > 0 }

  const filtered = accounts.filter(a => {
    if (spocFilter && a.spoc !== spocFilter) return false
    if (statusFilter === 'active' && !isActive(a)) return false
    if (statusFilter === 'inactive' && isActive(a)) return false
    if (typeFilter && a.type !== typeFilter) return false
    if (search) { const q = search.toLowerCase(); if (!((a.company||'').toLowerCase().includes(q)||(a.city||'').toLowerCase().includes(q)||(a.spoc||'').toLowerCase().includes(q)||(a.manager||'').toLowerCase().includes(q))) return false }
    return true
  })

  const totalRevenue = accounts.reduce((s, a) => s + getTotal(a.id), 0)
  const activeCount = accounts.filter(isActive).length
  const TARGET = 255000
  const pct = Math.round(totalRevenue / TARGET * 100)
  const types = [...new Set(accounts.map(a => a.type).filter(Boolean))].sort()
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const s = {
    app: { display:'grid', gridTemplateColumns:'220px 1fr', gridTemplateRows:'58px 1fr', height:'100vh', overflow:'hidden', background:c.bg, color:c.text, fontFamily:'"DM Sans",sans-serif', fontSize:'14px' },
    topbar: { gridColumn:'1/-1', display:'flex', alignItems:'center', gap:'16px', padding:'0 24px', borderBottom:`1px solid ${c.border}`, background:c.surface },
    sidebar: { borderRight:`1px solid ${c.border}`, background:c.surface, padding:'12px 10px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'2px' },
    main: { overflowY:'auto', padding:'28px 32px', background:c.bg },
    navItem: (active) => ({ display:'flex', alignItems:'center', gap:'9px', padding:'8px 10px', borderRadius:'7px', cursor:'pointer', color: active ? '#fff' : c.muted, background: active ? c.gold : 'transparent', fontSize:'13px', userSelect:'none', justifyContent:'space-between' }),
    navLabel: { fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted2, textTransform:'uppercase', padding:'10px 10px 4px', marginTop:'6px' },
    card: { background:c.surface, border:`1px solid ${c.border}`, borderRadius:'12px', padding:'20px 22px' },
    statCard: (color) => ({ background:c.surface, border:`1px solid ${c.border}`, borderRadius:'12px', padding:'20px 22px', borderTop:`3px solid ${color}` }),
    btn: (variant='primary') => ({ padding:'8px 18px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'500', background: variant==='primary' ? c.gold : variant==='danger' ? c.red : c.surface2, color: variant==='primary' ? '#fff' : variant==='danger' ? '#fff' : c.text }),
    input: { padding:'8px 12px', borderRadius:'7px', border:`1px solid ${c.border}`, background:c.surface2, color:c.text, fontSize:'13px', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' },
    select: { padding:'6px 10px', borderRadius:'6px', border:`1px solid ${c.border}`, background:c.surface, color:c.text, fontSize:'12px', fontFamily:'inherit', cursor:'pointer', outline:'none' },
    table: { width:'100%', borderCollapse:'collapse' },
    th: { padding:'10px 14px', textAlign:'left', fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', color:c.muted, textTransform:'uppercase', borderBottom:`1px solid ${c.border2}`, background:c.surface2 },
    td: { padding:'10px 14px', fontSize:'13px', borderBottom:`1px solid ${c.border}` },
    pill: (type) => {
      const col = isDark ? { Major:{bg:'rgba(232,181,106,0.12)',color:'#e8b56a'}, Chain:{bg:'rgba(126,200,200,0.08)',color:'#7ec8c8'}, Independent:{bg:'rgba(167,139,250,0.08)',color:'#a78bfa'}, Pharmacy:{bg:'rgba(244,114,182,0.08)',color:'#f472b6'}, Franchise:{bg:'rgba(251,146,60,0.08)',color:'#fb923c'}, eCommerce:{bg:'rgba(52,211,153,0.08)',color:'#34d399'}, Cafe:{bg:'rgba(251,191,36,0.08)',color:'#fbbf24'} } : { Major:{bg:'rgba(184,149,90,0.15)',color:'#8B6914'}, Chain:{bg:'rgba(74,175,175,0.1)',color:'#2A6B6B'}, Independent:{bg:'rgba(139,107,212,0.1)',color:'#5B3B9E'}, Pharmacy:{bg:'rgba(200,80,150,0.1)',color:'#8B2B6B'}, Franchise:{bg:'rgba(210,110,50,0.1)',color:'#8B4A15'}, eCommerce:{bg:'rgba(52,175,120,0.1)',color:'#1A7A52'}, Cafe:{bg:'rgba(210,170,50,0.1)',color:'#7A5A10'} }
      const t = type?.replace(/[^a-zA-Z]/g,'') || ''
      const style = col[t] || { bg:c.tag, color:c.muted }
      return { display:'inline-block', fontSize:'10px', fontWeight:'600', padding:'2px 7px', borderRadius:'3px', letterSpacing:'0.04em', textTransform:'uppercase', background:style.bg, color:style.color }
    },
    status: (active) => ({ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'10px', fontWeight:'600', padding:'3px 8px', borderRadius:'4px', textTransform:'uppercase', background: active ? 'rgba(58,125,94,0.1)' : c.tag, color: active ? c.green : c.muted }),
    checkbox: (checked, color) => ({ width:'18px', height:'18px', borderRadius:'4px', border:`2px solid ${checked ? color : c.border2}`, background: checked ? color : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:'0', transition:'all 0.15s' }),
    modalBox: { background:c.surface, border:`1px solid ${c.border}`, borderRadius:'14px', padding:'28px' },
    formRow: { marginBottom:'16px' },
    label: { fontSize:'11px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'5px', fontWeight:'600' },
    formGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' },
  }

  // ── ACCOUNT FORM ──────────────────────────────────────
  function AccountForm({ initial = {}, onSave, onCancel, title }) {
    const [form, setForm] = useState({
      company: initial.company || '',
      spoc: initial.spoc || '',
      type: initial.type || '',
      city: initial.city || '',
      prov: initial.prov || '',
      address: initial.address || '',
      email: initial.email || '',
      manager: initial.manager || '',
      commission: initial.commission || '',
      actual_doors: initial.actual_doors ?? 0,
      target_doors: initial.target_doors ?? 1,
      status: initial.status ?? false,
      id: initial.id,
    })
    const [error, setError] = useState('')
    const set = (k, v) => setForm(p => ({...p, [k]: v}))

    async function handleSubmit() {
      if (!form.company.trim()) { setError('Account name is required'); return }
      if (!form.spoc.trim()) { setError('Rep (SPOC) is required'); return }
      const err = await onSave(form)
      if (err) setError(err.message)
    }

    const inputStyle = { ...s.input, marginBottom: 0 }
    const selectStyle = { ...inputStyle, cursor:'pointer' }

    return (
      <div style={s.modalBox}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
          <div style={{ fontSize:'16px', fontWeight:'600' }}>{title}</div>
          <button style={{ background:'none', border:'none', color:c.muted, cursor:'pointer', fontSize:'18px' }} onClick={onCancel}>✕</button>
        </div>
        {error && <div style={{ fontSize:'12px', color:c.red, marginBottom:'14px', padding:'8px 12px', background:'rgba(192,57,43,0.08)', borderRadius:'6px' }}>{error}</div>}

        <div style={s.formGrid}>
          <div style={s.formRow}>
            <label style={s.label}>Account Name *</label>
            <input style={inputStyle} value={form.company} onChange={e=>set('company',e.target.value)} placeholder="e.g. Choices Kitsilano"/>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Rep (SPOC) *</label>
            <select style={selectStyle} value={form.spoc} onChange={e=>set('spoc',e.target.value)}>
              <option value="">Select rep…</option>
              {reps.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="__new__">+ Add new rep</option>
            </select>
            {form.spoc === '__new__' && (
              <input style={{ ...inputStyle, marginTop:'6px' }} placeholder="New rep name…" onChange={e=>set('spoc',e.target.value)} autoFocus/>
            )}
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Account Type</label>
            <select style={selectStyle} value={form.type} onChange={e=>set('type',e.target.value)}>
              <option value="">— None —</option>
              {ACCOUNT_TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Province</label>
            <select style={selectStyle} value={form.prov} onChange={e=>set('prov',e.target.value)}>
              <option value="">— None —</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>City</label>
            <input style={inputStyle} value={form.city} onChange={e=>set('city',e.target.value)} placeholder="e.g. Vancouver"/>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Manager</label>
            <input style={inputStyle} value={form.manager} onChange={e=>set('manager',e.target.value)} placeholder="Contact name"/>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="contact@store.com"/>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Commission</label>
            <input style={inputStyle} value={form.commission} onChange={e=>set('commission',e.target.value)} placeholder="e.g. House / Catalyst Sales"/>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Actual Doors</label>
            <input style={inputStyle} type="number" min="0" value={form.actual_doors} onChange={e=>set('actual_doors',e.target.value)}/>
          </div>
          <div style={s.formRow}>
            <label style={s.label}>Target Doors</label>
            <input style={inputStyle} type="number" min="1" value={form.target_doors} onChange={e=>set('target_doors',e.target.value)}/>
          </div>
        </div>

        <div style={{ ...s.formRow, gridColumn:'1/-1' }}>
          <label style={s.label}>Full Address</label>
          <input style={inputStyle} value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Street address"/>
        </div>

        {initial.id && (
          <div style={{ ...s.formRow, marginTop:'4px' }}>
            <label style={s.label}>Status</label>
            <select style={selectStyle} value={String(form.status)} onChange={e=>set('status', e.target.value === 'true')}>
              <option value="false">Target (inactive)</option>
              <option value="true">Active</option>
            </select>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'22px', paddingTop:'18px', borderTop:`1px solid ${c.border}` }}>
          <button style={s.btn('secondary')} onClick={onCancel}>Cancel</button>
          <button style={s.btn('primary')} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : initial.id ? 'Save changes' : 'Add account'}
          </button>
        </div>
      </div>
    )
  }

  // ── ADD REP FORM ──────────────────────────────────────
  function AddRepForm({ onClose }) {
    const [repName, setRepName] = useState('')
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    async function handleAdd() {
      if (!repName.trim()) { setError('Rep name is required'); return }
      if (reps.includes(repName.trim())) { setError('This rep already exists'); return }
      const { data, error: err } = await supabase.from('accounts').insert([{
        company: `[${repName.trim()} — placeholder]`,
        spoc: repName.trim(),
        status: false,
        actual_doors: 0,
        target_doors: 0,
      }]).select()
      if (err) { setError(err.message); return }
      if (data) setAccounts(prev => [...prev, ...data].sort((a,b) => a.company.localeCompare(b.company)))
      setDone(true)
    }

    return (
      <div style={s.modalBox}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
          <div style={{ fontSize:'16px', fontWeight:'600' }}>Add New Rep</div>
          <button style={{ background:'none', border:'none', color:c.muted, cursor:'pointer', fontSize:'18px' }} onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div>
            <div style={{ fontSize:'14px', color:c.green, marginBottom:'16px' }}>✓ Rep "{repName}" added. You can now assign accounts to them.</div>
            <button style={s.btn('primary')} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <div style={{ fontSize:'12px', color:c.red, marginBottom:'14px', padding:'8px 12px', background:'rgba(192,57,43,0.08)', borderRadius:'6px' }}>{error}</div>}
            <div style={s.formRow}>
              <label style={s.label}>Rep Name</label>
              <input style={s.input} value={repName} onChange={e=>setRepName(e.target.value)} placeholder="e.g. Sarah" onKeyDown={e=>e.key==='Enter'&&handleAdd()} autoFocus/>
            </div>
            <div style={{ fontSize:'12px', color:c.muted, marginBottom:'18px' }}>A placeholder account will be created so you can assign accounts to this rep immediately.</div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
              <button style={s.btn('secondary')} onClick={onClose}>Cancel</button>
              <button style={s.btn('primary')} onClick={handleAdd}>Add rep</button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── DELETE CONFIRM ────────────────────────────────────
  function DeleteConfirm({ acc, onClose }) {
    return (
      <div style={{ ...s.modalBox, maxWidth:'420px' }}>
        <div style={{ fontSize:'16px', fontWeight:'600', marginBottom:'12px' }}>Delete account?</div>
        <div style={{ fontSize:'13px', color:c.muted, marginBottom:'20px' }}>
          This will permanently delete <strong style={{ color:c.text }}>{acc.company}</strong> and all its revenue and activity data. This cannot be undone.
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
          <button style={s.btn('secondary')} onClick={onClose}>Cancel</button>
          <button style={s.btn('danger')} onClick={()=>deleteAccount(acc.id)}>Delete permanently</button>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ minHeight:'100vh', background:dark.bg, display:'flex', alignItems:'center', justifyContent:'center', color:dark.muted, fontFamily:'"DM Sans",sans-serif' }}>Loading…</div>

  // ── LOGIN SCREEN ──────────────────────────────────────
  if (!session) {
    return (
      <div style={{ minHeight:'100vh', background:c.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"DM Sans",sans-serif' }}>
        <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:'16px', padding:'40px', width:'380px', borderTop:`3px solid ${c.gold}` }}>
          {/* FIX 4: Use the real Suna logo PNG instead of hand-drawn SVG.
              The PNG is near-black, so we invert it in light mode to show on white,
              and leave it inverted in dark mode too since the bg is dark. */}
          <div style={{ marginBottom:'28px', textAlign:'center' }}>
            <img
              src={SUNA_LOGO_B64}
              alt="Suna"
              style={{
                height: '36px',
                width: 'auto',
                display: 'block',
                margin: '0 auto 8px',
                filter: isDark ? 'invert(1) brightness(0.9)' : 'invert(1)',
              }}
            />
            <div style={{ fontSize:'13px', color:c.muted }}>Door Report 2026</div>
          </div>
          <div style={{ marginBottom:'14px' }}>
            <label style={{ fontSize:'11px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'6px' }}>Email</label>
            <input style={s.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" onKeyDown={e=>e.key==='Enter'&&signIn()}/>
          </div>
          <div style={{ marginBottom:'20px' }}>
            <label style={{ fontSize:'11px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:'6px' }}>Password</label>
            <input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&signIn()}/>
          </div>
          {authError && <div style={{ fontSize:'12px', color:c.red, marginBottom:'14px', padding:'8px 12px', background:'rgba(192,57,43,0.08)', borderRadius:'6px' }}>{authError}</div>}
          <button style={{ ...s.btn('primary'), width:'100%', padding:'11px' }} onClick={signIn}>Sign in</button>
        </div>
      </div>
    )
  }

  const monthRevs = MONTHS.map(m => accounts.reduce((a, acc) => a + (revenue[acc.id]?.[m] || 0), 0))
  const maxRev = Math.max(...monthRevs, 1)
  const topAccounts = [...accounts].sort((a,b) => getTotal(b.id)-getTotal(a.id)).filter(a=>getTotal(a.id)>0).slice(0,10)

  // ── DRAWER CONTENT ────────────────────────────────────
  const DrawerContent = ({ acc }) => {
    const total = getTotal(acc.id)
    const [editingRev, setEditingRev] = useState({})
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
          <div>
            <div style={{ fontSize:'18px', fontWeight:'600', marginBottom:'8px' }}>{acc.company}</div>
            <div style={{ display:'flex', gap:'7px', flexWrap:'wrap', alignItems:'center' }}>
              <span style={s.pill(acc.type)}>{acc.type||'—'}</span>
              <span style={s.status(isActive(acc))}><span style={{ width:'4px',height:'4px',borderRadius:'50%',background:'currentColor' }}></span>{isActive(acc)?'Active':'Target'}</span>
              {acc.prov && <span style={{ fontSize:'12px', color:c.muted }}>{acc.prov}{acc.city&&acc.city!==acc.prov?' · '+acc.city:''}</span>}
            </div>
          </div>
          <button style={{ background:c.surface2, border:`1px solid ${c.border}`, color:c.muted, cursor:'pointer', width:'32px', height:'32px', borderRadius:'8px', fontSize:'15px' }} onClick={()=>setSelectedAccount(null)}>✕</button>
        </div>

        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          <button style={{ ...s.btn('secondary'), fontSize:'12px', padding:'6px 12px' }} onClick={()=>setEditingAccount(acc)}>✏ Edit details</button>
          <button style={{ ...s.btn('danger'), fontSize:'12px', padding:'6px 12px' }} onClick={()=>setShowDeleteConfirm(acc)}>🗑 Delete</button>
        </div>

        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${c.border}` }}>Contact</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {[['Rep',acc.spoc],['Manager',acc.manager],['City',acc.city],['Province',acc.prov],['Email',acc.email],['Commission',acc.commission]].map(([label,val])=>val?(<div key={label}><div style={{ fontSize:'10px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'2px' }}>{label}</div><div style={{ fontSize:'13px' }}>{val}</div></div>):null)}
          </div>
          {acc.address && <div style={{ marginTop:'10px' }}><div style={{ fontSize:'10px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'2px' }}>Address</div><div style={{ fontSize:'12px' }}>{acc.address}</div></div>}
        </div>

        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${c.border}` }}>2026 Revenue — click any month to edit</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'6px' }}>
            {MONTHS.map(m => {
              const val = revenue[acc.id]?.[m] || 0
              return (
                <div key={m} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color:c.muted, textTransform:'uppercase', marginBottom:'3px' }}>{m}</div>
                  {editingRev[m] !== undefined ? (
                    <input style={{ width:'100%', padding:'3px 4px', borderRadius:'4px', border:`1px solid ${c.gold}`, background:c.surface2, color:c.text, fontSize:'11px', textAlign:'center', boxSizing:'border-box' }} value={editingRev[m]} onChange={e=>setEditingRev(p=>({...p,[m]:e.target.value}))} onBlur={async ()=>{ await updateRevenue(acc.id,m,editingRev[m]); setEditingRev(p=>{const n={...p};delete n[m];return n}) }} onKeyDown={e=>{ if(e.key==='Enter') e.target.blur() }} autoFocus/>
                  ) : (
                    <div onClick={()=>setEditingRev(p=>({...p,[m]:val||''}))} style={{ fontSize:'11px', color:val?c.gold:c.muted2, padding:'3px 4px', borderRadius:'4px', cursor:'pointer', border:`1px solid transparent`, fontFamily:'monospace' }}>{val?fmtS(val):'—'}</div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:'10px', fontSize:'13px', fontWeight:'600', color:c.gold, textAlign:'right' }}>Total: {fmt(total)}</div>
        </div>

        <div>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${c.border}` }}>Activity Log {saving && <span style={{ color:c.muted, fontWeight:'400' }}>— saving...</span>}</div>
          <div style={{ display:'grid', gridTemplateColumns:'50px repeat(4,1fr)', gap:'6px', marginBottom:'8px' }}>
            <div></div>
            {[['✉','Email',c.blue],['🚶','Visit',c.green],['📦','Order',c.gold],['📞','Call','#a78bfa']].map(([icon,label,color])=>(<div key={label} style={{ fontSize:'10px', color, fontWeight:'600', textAlign:'center' }}>{icon} {label}</div>))}
          </div>
          {ACT_MONTHS.map(m => {
            const a = activity[acc.id]?.[m] || {}
            const hasAny = a.email_sent||a.visit_done||a.call_done||(a.order_placed||0)>0
            return (
              <div key={m} style={{ display:'grid', gridTemplateColumns:'50px repeat(4,1fr)', gap:'6px', alignItems:'center', padding:'6px 0', borderBottom:`1px solid ${c.border}`, opacity:hasAny?1:0.5 }}>
                <div style={{ fontSize:'11px', color:c.muted, fontWeight:'500' }}>{m}</div>
                {[['email_sent',c.blue],['visit_done',c.green],['call_done','#a78bfa']].map(([field,color])=>(
                  <div key={field} style={{ display:'flex', justifyContent:'center' }}>
                    <div style={s.checkbox(a[field],color)} onClick={()=>toggleActivity(acc.id,m,field)}>
                      {a[field] && <span style={{ color:'#fff', fontSize:'11px', fontWeight:'700' }}>✓</span>}
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'center' }}>
                  <div style={{ fontSize:'11px', color:(a.order_placed||0)>0?c.gold:c.muted2, fontFamily:'monospace' }}>{(a.order_placed||0)>0?fmtS(a.order_placed):'—'}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={s.app}>
      <header style={s.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ position:'relative', cursor:'pointer' }} onClick={()=>setShowLogoUpload(true)} title="Click to change logo">
            {/* FIX 4 (topbar): Show user-uploaded logo if present, otherwise fall back to
                the embedded Suna PNG with invert filter to render on the surface bg. */}
            {logoUrl ? (
              <img src={logoUrl} style={{ height:'32px', width:'auto', maxWidth:'140px', objectFit:'contain', display:'block' }} alt="Logo"/>
            ) : (
              <img
                src={SUNA_LOGO_B64}
                alt="Suna"
                style={{
                  height: '28px',
                  width: 'auto',
                  display: 'block',
                  filter: isDark ? 'invert(1) brightness(0.85)' : 'invert(1)',
                }}
              />
            )}
          </div>
          <div style={{ width:'1px', height:'20px', background:c.border2 }}></div>
          <span style={{ fontSize:'12px', color:c.muted }}>Door Report 2026</span>
        </div>
        <div style={{ flex:1, maxWidth:'360px', marginLeft:'16px' }}>
          <input style={s.input} placeholder="Search accounts, cities, contacts…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'10px' }}>
          {saving && <span style={{ fontSize:'12px', color:c.muted }}>Saving…</span>}
          <button style={{ ...s.btn('secondary'), padding:'6px 12px', fontSize:'12px' }} onClick={()=>setShowAddAccount(true)}>+ Add account</button>
          <button style={{ ...s.btn('secondary'), padding:'6px 12px', fontSize:'12px' }} onClick={()=>setShowAddRep(true)}>+ Add rep</button>
          <span style={{ fontSize:'12px', color:c.muted }}>{accounts.length} accounts</span>
          <span style={{ background:c.gold, color:'#fff', fontSize:'10px', fontWeight:'600', padding:'3px 8px', borderRadius:'4px' }}>2026</span>
          <button style={{ ...s.btn('secondary'), padding:'6px 12px', fontSize:'12px' }} onClick={()=>setIsDark(!isDark)}>{isDark?'☀ Light':'☾ Dark'}</button>
          <button style={{ ...s.btn('secondary'), padding:'6px 12px', fontSize:'12px' }} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav style={s.sidebar}>
        <div style={s.navLabel}>Views</div>
        {[['dashboard','Dashboard'],['accounts','Accounts'],['activity','Activity'],['analytics','Analytics']].map(([id,label])=>(<div key={id} style={s.navItem(view===id)} onClick={()=>setView(id)}><span>{label}</span></div>))}
        <div style={s.navLabel}>By Rep</div>
        {/* FIX 3: Show account count badge next to each rep name */}
        <div style={s.navItem(spocFilter==='')} onClick={()=>{setSpocFilter('');setPage(1)}}>
          <span>All reps</span>
          <span style={{
            fontSize:'10px', fontWeight:'600', minWidth:'18px', height:'18px',
            borderRadius:'9px', background: spocFilter==='' ? 'rgba(255,255,255,0.25)' : c.surface2,
            color: spocFilter==='' ? '#fff' : c.muted,
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            padding:'0 5px', lineHeight:1,
          }}>{accounts.length}</span>
        </div>
        {reps.map(rep => (
          <div key={rep} style={s.navItem(spocFilter===rep)} onClick={()=>{setSpocFilter(rep);setPage(1)}}>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {rep.length > 13 ? rep.slice(0,13)+'…' : rep}
            </span>
            <span style={{
              fontSize:'10px', fontWeight:'600', minWidth:'18px', height:'18px',
              borderRadius:'9px', background: spocFilter===rep ? 'rgba(255,255,255,0.25)' : c.surface2,
              color: spocFilter===rep ? '#fff' : c.muted,
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              padding:'0 5px', lineHeight:1, flexShrink:0,
            }}>{repCounts[rep] || 0}</span>
          </div>
        ))}
      </nav>

      <main style={s.main}>
        {view==='dashboard' && (
          <div>
            <div style={{ marginBottom:'24px' }}><div style={{ fontSize:'17px', fontWeight:'600' }}>Overview</div><div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>2026 year-to-date performance</div></div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' }}>
              {[[c.gold,'Revenue YTD','$'+Math.round(totalRevenue).toLocaleString(),`${pct}% of $255k target`],[c.green,'Active Accounts',activeCount,`of ${accounts.length} total`],[c.blue,'Avg per Active','$'+(activeCount?Math.round(totalRevenue/activeCount).toLocaleString():'0'),'YTD ÷ active accounts'],[c.muted2,'Conversion',Math.round(activeCount/Math.max(accounts.length,1)*100)+'%','Accounts with revenue']].map(([color,label,val,sub])=>(
                <div key={label} style={s.statCard(color)}>
                  <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', color:c.muted, textTransform:'uppercase', marginBottom:'8px' }}>{label}</div>
                  <div style={{ fontSize:'26px', fontWeight:'600', fontFamily:'monospace', marginBottom:'6px' }}>{val}</div>
                  <div style={{ fontSize:'11px', color:c.muted }}>{sub}</div>
                  {label==='Revenue YTD' && <div style={{ marginTop:'10px', height:'3px', background:c.border, borderRadius:'2px' }}><div style={{ height:'100%', width:Math.min(pct,100)+'%', background:c.gold, borderRadius:'2px' }}></div></div>}
                </div>
              ))}
            </div>
            <div style={{ ...s.card, marginBottom:'24px' }}>
              <div style={{ fontSize:'12px', fontWeight:'600', letterSpacing:'0.04em', color:c.muted, textTransform:'uppercase', marginBottom:'16px' }}>Monthly revenue — 2026</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'100px' }}>
                {monthRevs.map((v,i)=>(<div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', height:'100%' }}><div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', width:'100%' }}><div style={{ fontSize:'9px', color:c.muted, textAlign:'center', marginBottom:'2px' }}>{v>0?fmtS(v):''}</div><div style={{ width:'100%', background:c.green, borderRadius:'3px 3px 0 0', height:Math.max(v/maxRev*100,v>0?4:2)+'%', minHeight:'2px' }}></div></div><div style={{ fontSize:'8px', color:c.muted2, textTransform:'uppercase' }}>{MONTHS[i]}</div></div>))}
              </div>
            </div>
            <div style={{ fontSize:'15px', fontWeight:'600', marginBottom:'16px' }}>Top accounts</div>
            <div style={{ ...s.card, overflow:'hidden', padding:'0' }}>
              <table style={s.table}>
                <thead><tr>{['Account','Rep','Type',...MONTHS.slice(0,7),'YTD'].map(h=><th key={h} style={{...s.th,textAlign:h==='YTD'?'right':'left'}}>{h}</th>)}</tr></thead>
                <tbody>{topAccounts.map(acc=>(<tr key={acc.id} style={{ cursor:'pointer' }} onClick={()=>setSelectedAccount(acc)}><td style={s.td}><strong>{acc.company}</strong></td><td style={{ ...s.td, color:c.muted, fontSize:'12px' }}>{acc.spoc}</td><td style={s.td}><span style={s.pill(acc.type)}>{acc.type||'—'}</span></td>{MONTHS.slice(0,7).map(m=>{const v=revenue[acc.id]?.[m]||0;return <td key={m} style={{ ...s.td, fontFamily:'monospace', fontSize:'12px', color:v?c.gold:c.muted2, textAlign:'right' }}>{v?fmtS(v):'—'}</td>})}<td style={{ ...s.td, fontFamily:'monospace', fontSize:'12px', color:c.gold, fontWeight:'600', textAlign:'right' }}>{fmt(getTotal(acc.id))}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        )}

        {view==='accounts' && (
          <div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px' }}>
              <div><div style={{ fontSize:'17px', fontWeight:'600' }}>All Accounts</div><div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Click any row to view details, log activity and edit revenue</div></div>
              <button style={{ ...s.btn('primary'), fontSize:'13px' }} onClick={()=>setShowAddAccount(true)}>+ Add account</button>
            </div>
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:'12px', color:c.muted }}>Status:</span>
              {['all','active','inactive'].map(v=>(<button key={v} style={{ padding:'5px 12px', borderRadius:'6px', border:`1px solid ${statusFilter===v?c.gold:c.border}`, background:statusFilter===v?c.goldLight:'transparent', color:statusFilter===v?c.gold:c.muted, cursor:'pointer', fontSize:'12px' }} onClick={()=>{setStatusFilter(v);setPage(1)}}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>))}
              <span style={{ fontSize:'12px', color:c.muted }}>Type:</span>
              <select style={s.select} value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1)}}><option value="">All types</option>{types.map(t=><option key={t}>{t}</option>)}</select>
              <span style={{ marginLeft:'auto', fontSize:'11px', color:c.muted, fontFamily:'monospace' }}>{filtered.length} accounts</span>
            </div>
            <div style={{ ...s.card, padding:'0', overflow:'hidden' }}>
              <table style={s.table}>
                <thead><tr>{['Account','Type','Rep','Prov','Status','Doors','YTD'].map(h=><th key={h} style={{...s.th,textAlign:h==='YTD'?'right':'left'}}>{h}</th>)}</tr></thead>
                <tbody>{paged.map(acc=>{const total=getTotal(acc.id);const active=isActive(acc);return(<tr key={acc.id} style={{ cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background=c.surface2} onMouseLeave={e=>e.currentTarget.style.background=''} onClick={()=>setSelectedAccount(acc)}><td style={s.td}><div style={{ fontWeight:'500' }}>{acc.company}</div>{acc.city&&<div style={{ fontSize:'11px', color:c.muted }}>{acc.city}{acc.prov&&acc.city!==acc.prov?', '+acc.prov:''}</div>}</td><td style={s.td}><span style={s.pill(acc.type)}>{acc.type||'—'}</span></td><td style={{ ...s.td, color:c.muted, fontSize:'12px' }}>{acc.spoc}</td><td style={{ ...s.td, color:c.muted, fontSize:'12px' }}>{acc.prov||'—'}</td><td style={s.td}><span style={s.status(active)}><span style={{ width:'4px',height:'4px',borderRadius:'50%',background:'currentColor' }}></span>{active?'Active':'Target'}</span></td><td style={{ ...s.td, fontFamily:'monospace', fontSize:'12px' }}>{acc.actual_doors||0}/{acc.target_doors||1}</td><td style={{ ...s.td, fontFamily:'monospace', fontSize:'12px', color:total?c.gold:c.muted2, textAlign:'right' }}>{total?fmt(total):'—'}</td></tr>)})}</tbody>
              </table>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderTop:`1px solid ${c.border}`, background:c.surface2 }}>
                <button style={{ ...s.btn('secondary'), padding:'5px 14px', fontSize:'12px' }} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                <span style={{ fontSize:'11px', color:c.muted, fontFamily:'monospace' }}>Page {page} of {totalPages} · {filtered.length} accounts</span>
                <button style={{ ...s.btn('secondary'), padding:'5px 14px', fontSize:'12px' }} disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
              </div>
            </div>
          </div>
        )}

        {view==='activity' && (
          <div>
            <div style={{ marginBottom:'20px' }}><div style={{ fontSize:'17px', fontWeight:'600' }}>Activity Log</div><div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Click any account to check off visits, emails, calls and orders</div></div>
            <div style={{ display:'flex', gap:'14px', marginBottom:'16px', flexWrap:'wrap' }}>
              {[[c.blue,'Email'],[c.green,'Visit'],[c.gold,'Order'],['#a78bfa','Call']].map(([color,label])=>(<div key={label} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:c.muted }}><div style={{ width:'8px', height:'8px', borderRadius:'2px', background:color }}></div>{label}</div>))}
            </div>
            <div style={{ display:'grid', gap:'8px' }}>
              {filtered.slice(0,60).map(acc=>{const total=getTotal(acc.id);return(<div key={acc.id} style={{ ...s.card, padding:'14px 18px', display:'grid', gridTemplateColumns:'1fr auto', gap:'12px', alignItems:'center', cursor:'pointer' }} onClick={()=>setSelectedAccount(acc)}><div><div style={{ fontWeight:'500', fontSize:'14px' }}>{acc.company}</div><div style={{ fontSize:'11px', color:c.muted, marginTop:'2px' }}>{acc.spoc} · {acc.type||'—'} · {acc.prov||'—'}{total?' · '+fmt(total)+' YTD':''}</div></div><div style={{ display:'flex', gap:'5px' }}>{ACT_MONTHS.slice(0,7).map(m=>{const a=activity[acc.id]?.[m]||{};return(<div key={m} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}><div style={{ fontSize:'8px', color:c.muted2, textTransform:'uppercase' }}>{m}</div><div style={{ display:'flex', gap:'1px' }}>{[[a.email_sent,c.blue],[a.visit_done,c.green],[(a.order_placed||0)>0,c.gold],[a.call_done,'#a78bfa']].map(([on,color],i)=>(<div key={i} style={{ width:'7px', height:'7px', borderRadius:'1px', background:on?color:c.border }}></div>))}</div></div>)})}</div></div>)})}
            </div>
          </div>
        )}

        {view==='analytics' && (
          <div>
            <div style={{ marginBottom:'24px' }}><div style={{ fontSize:'17px', fontWeight:'600' }}>Analytics</div><div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Revenue breakdown across the portfolio</div></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>
              {/* FIX 2: Use CHART_COLORS array (index 0 = '#c9943a', a visible amber)
                  instead of the old hardcoded color array that started with #413124 (same as font). */}
              {[['Revenue by rep',reps.map(sp=>({label:sp,val:accounts.filter(a=>a.spoc===sp).reduce((s,a)=>s+getTotal(a.id),0)})).sort((a,b)=>b.val-a.val)],['Revenue by type',[...new Set(accounts.map(a=>a.type).filter(Boolean))].map(t=>({label:t,val:accounts.filter(a=>a.type===t).reduce((s,a)=>s+getTotal(a.id),0)})).sort((a,b)=>b.val-a.val).slice(0,8)],['Top 10 accounts',[...accounts].sort((a,b)=>getTotal(b.id)-getTotal(a.id)).filter(a=>getTotal(a.id)>0).slice(0,10).map(a=>({label:a.company.length>22?a.company.slice(0,22)+'…':a.company,val:getTotal(a.id)}))],['Active by type',[...new Set(accounts.map(a=>a.type).filter(Boolean))].map(t=>({label:t,val:accounts.filter(a=>a.type===t&&isActive(a)).length})).sort((a,b)=>b.val-a.val).slice(0,8)]].map(([title,data],ci)=>{const isCount=ci===3;const max=Math.max(...data.map(d=>d.val),1);return(<div key={title} style={s.card}><div style={{ fontSize:'12px', fontWeight:'600', letterSpacing:'0.04em', color:c.muted, textTransform:'uppercase', marginBottom:'18px' }}>{title}</div><div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>{data.filter(d=>d.val>0).map((d,i)=>(<div key={d.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}><div style={{ width:'100px', fontSize:'12px', color:c.muted, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{d.label}</div><div style={{ flex:1, height:'22px', background:c.surface2, borderRadius:'4px', overflow:'hidden', position:'relative' }}><div style={{ height:'100%', width:d.val/max*100+'%', background:CHART_COLORS[i%CHART_COLORS.length], borderRadius:'4px' }}></div><div style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', fontSize:'11px', fontFamily:'monospace', fontWeight:'600', color:c.text, mixBlendMode: isDark ? 'screen' : 'multiply' }}>{isCount?d.val:fmtS(d.val)}</div></div></div>))}</div></div>)})}
            </div>
          </div>
        )}
      </main>

      {/* Account drawer */}
      {selectedAccount && (
        <>
          <div style={{ position:'fixed', inset:'0', background:'rgba(0,0,0,0.4)', zIndex:'100', backdropFilter:'blur(2px)' }} onClick={()=>setSelectedAccount(null)}/>
          <div style={{ position:'fixed', right:'0', top:'0', bottom:'0', width:'500px', background:c.surface, borderLeft:`1px solid ${c.border}`, zIndex:'101', overflowY:'auto', padding:'28px' }}>
            <DrawerContent acc={selectedAccount}/>
          </div>
        </>
      )}

      {/* Add account modal */}
      {showAddAccount && (
        <Modal onClose={()=>setShowAddAccount(false)}>
          <AccountForm title="Add New Account" onSave={addAccount} onCancel={()=>setShowAddAccount(false)}/>
        </Modal>
      )}

      {/* Edit account modal */}
      {editingAccount && (
        <Modal onClose={()=>setEditingAccount(null)}>
          <AccountForm title="Edit Account" initial={editingAccount} onSave={saveAccountEdit} onCancel={()=>setEditingAccount(null)}/>
        </Modal>
      )}

      {/* Add rep modal */}
      {showAddRep && (
        <Modal onClose={()=>setShowAddRep(false)} width="420px">
          <AddRepForm onClose={()=>setShowAddRep(false)}/>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <Modal onClose={()=>setShowDeleteConfirm(null)} width="420px">
          <DeleteConfirm acc={showDeleteConfirm} onClose={()=>setShowDeleteConfirm(null)}/>
        </Modal>
      )}

      {/* Logo upload modal */}
      {showLogoUpload && (
        <Modal onClose={()=>setShowLogoUpload(false)} width="420px">
          <div style={s.modalBox}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'16px', fontWeight:'600' }}>Change Logo</div>
              <button style={{ background:'none', border:'none', color:c.muted, cursor:'pointer', fontSize:'18px' }} onClick={()=>setShowLogoUpload(false)}>✕</button>
            </div>
            {logoUrl && (
              <div style={{ marginBottom:'16px', padding:'16px', background:c.surface2, borderRadius:'8px', textAlign:'center' }}>
                <img src={logoUrl} style={{ height:'40px', width:'auto', maxWidth:'200px', objectFit:'contain' }} alt="Current logo"/>
                <div style={{ fontSize:'11px', color:c.muted, marginTop:'8px' }}>Current logo</div>
              </div>
            )}
            <div style={{ marginBottom:'16px' }}>
              <label style={s.label}>Upload new logo</label>
              <input type="file" accept="image/*" style={{ ...s.input, padding:'6px' }} onChange={e => { if(e.target.files[0]) uploadLogo(e.target.files[0]) }}/>
              <div style={{ fontSize:'11px', color:c.muted, marginTop:'6px' }}>PNG, JPG, SVG — recommended height 40–60px</div>
            </div>
            {logoUploading && <div style={{ fontSize:'13px', color:c.muted, marginBottom:'12px' }}>Uploading…</div>}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'16px', borderTop:`1px solid ${c.border}` }}>
              {logoUrl ? (
                <button style={{ ...s.btn('danger'), fontSize:'12px', padding:'6px 12px' }} onClick={removeLogo}>Remove logo</button>
              ) : <div/>}
              <button style={s.btn('secondary')} onClick={()=>setShowLogoUpload(false)}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
