import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ACT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug']

const PIPELINE_STAGES = ['contacted','sampled','ordered','shipped','reordered']
const STAGE_LABELS = { contacted:'Contacted', sampled:'Sampled', ordered:'Ordered', shipped:'Shipped', reordered:'Reordered' }
const STAGE_COLORS = { contacted:'#9c9183', sampled:'#80bacf', ordered:'#c9943a', shipped:'#2e3d37', reordered:'#2a6b6b' }
const STAGE_BG = { contacted:'rgba(156,145,131,0.12)', sampled:'rgba(128,186,207,0.12)', ordered:'rgba(201,148,58,0.12)', shipped:'rgba(46,61,55,0.12)', reordered:'rgba(42,107,107,0.12)' }

const light = {
  bg:'#f2f1ee', surface:'#FFFFFF', surface2:'#ebe9e4',
  border:'#dddad4', border2:'#cdc9c0', text:'#413124',
  muted:'#7a7168', muted2:'#b0a899', gold:'#413124',
  goldLight:'rgba(65,49,36,0.08)', green:'#2e3d37',
  blue:'#80bacf', red:'#b83232', tag:'#e4e1db',
  teal:'#2a6b6b', tealLight:'rgba(42,107,107,0.1)',
  amber:'#8B6914', amberLight:'rgba(139,105,20,0.1)',
}
const dark = {
  bg:'#413124', surface:'#2e2318', surface2:'#241a10',
  border:'#5a4535', border2:'#6e5642', text:'#f2f1ee',
  muted:'#b0a899', muted2:'#7a7168', gold:'#d4956a',
  goldLight:'rgba(212,149,106,0.12)', green:'#6dbf9e',
  blue:'#80bacf', red:'#e05757', tag:'#5a4535',
  teal:'#6dbf9e', tealLight:'rgba(109,191,158,0.12)',
  amber:'#d4956a', amberLight:'rgba(212,149,106,0.12)',
}

const CHART_COLORS = ['#c9943a','#80bacf','#4caf80','#a78bfa','#fb923c','#f472b6','#34d399','#fbbf24']
const ACCOUNT_TYPES = ['Major','Chain','Independent','Pharmacy','Franchise','eCommerce','Cafe','Hotel - Hospitality','Spa/Gym','Retail','Tourism - Cafe','Co-op','']
const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

const SUNA_LOGO_B64 = 'data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAoADwDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAEI/8QAHBABAQADAQADAAAAAAAAAAAAAAERIUExAmFx/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AMZAAC8QAAAAFnmimi0Fzi3UsS8/FuLPvqUC6pT5bpQN8L6XFucl90CAAAAAAAA//9k='

function fmt(n){ if(!n) return '—'; return '$'+Math.round(n).toLocaleString('en-CA') }
function fmtS(n){ if(!n) return ''; if(n>=10000) return '$'+(n/1000).toFixed(0)+'k'; if(n>=1000) return '$'+(n/1000).toFixed(1)+'k'; return '$'+Math.round(n) }
function currentMonth(){ return MONTHS[new Date().getMonth()] }

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

// ── STAGE BADGE ───────────────────────────────────────
function StageBadge({ stage }) {
  if (!stage) return null
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:'5px',
      fontSize:'10px', fontWeight:'600', padding:'3px 8px',
      borderRadius:'20px', textTransform:'uppercase', letterSpacing:'0.04em',
      whiteSpace:'nowrap',
      background: STAGE_BG[stage] || 'transparent',
      color: STAGE_COLORS[stage] || '#888',
    }}>
      <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'currentColor', flexShrink:0 }}></span>
      {STAGE_LABELS[stage] || stage}
    </span>
  )
}

// ── STAGE PROGRESS TRACK ──────────────────────────────
function StageTrack({ stage, c }) {
  const idx = PIPELINE_STAGES.indexOf(stage)
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', marginBottom:'10px' }}>
        {PIPELINE_STAGES.map((s, i) => (
          <div key={s} style={{ flex:1, display:'flex', alignItems:'center' }}>
            {i > 0 && <div style={{ flex:1, height:'3px', background: idx >= i ? STAGE_COLORS[s] : c.border }}></div>}
            <div style={{
              width:'10px', height:'10px', borderRadius:'50%', flexShrink:0,
              background: idx >= i ? STAGE_COLORS[s] : c.border,
              boxShadow: s === stage ? `0 0 0 3px ${STAGE_BG[s]}` : 'none',
              transition:'all 0.2s',
            }}></div>
            {i < PIPELINE_STAGES.length - 1 && <div style={{ flex:1, height:'3px', background: idx > i ? STAGE_COLORS[PIPELINE_STAGES[i+1]] : c.border }}></div>}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        {PIPELINE_STAGES.map(s => (
          <div key={s} style={{
            fontSize:'9px', textAlign:'center', textTransform:'uppercase',
            fontWeight: s === stage ? '600' : '400',
            color: s === stage ? STAGE_COLORS[s] : c.muted2,
            flex:1,
          }}>{STAGE_LABELS[s]}</div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [isDark, setIsDark] = useState(false)
  const c = isDark ? dark : light
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('thismonth')
  const [accounts, setAccounts] = useState([])
  const [revenue, setRevenue] = useState({})
  const [activity, setActivity] = useState({})
  const [targets, setTargets] = useState({})
  const [spocFilter, setSpocFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [activeMonth, setActiveMonth] = useState(currentMonth())

  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showAddRep, setShowAddRep] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showLogoUpload, setShowLogoUpload] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  const PAGE_SIZE = 30
  const reps = [...new Set(accounts.map(a => a.spoc).filter(Boolean))].sort()
  const repCounts = reps.reduce((acc, rep) => {
    acc[rep] = accounts.filter(a => a.spoc === rep).length
    return acc
  }, {})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) loadData() }, [session])

  async function loadData() {
    const [{ data: acc }, { data: rev }, { data: act }, { data: tgt }] = await Promise.all([
      supabase.from('accounts').select('*').order('company'),
      supabase.from('monthly_revenue').select('*'),
      supabase.from('activity_log').select('*'),
      supabase.from('monthly_targets').select('*'),
    ])
    setAccounts(acc || [])
    const revMap = {}
    ;(rev || []).forEach(r => { if (!revMap[r.account_id]) revMap[r.account_id] = {}; revMap[r.account_id][r.month] = r.amount })
    setRevenue(revMap)
    const actMap = {}
    ;(act || []).forEach(a => { if (!actMap[a.account_id]) actMap[a.account_id] = {}; actMap[a.account_id][a.month] = a })
    setActivity(actMap)
    const tgtMap = {}
    ;(tgt || []).forEach(t => { tgtMap[t.month] = t })
    setTargets(tgtMap)

    const { data: logoFiles } = await supabase.storage.from('logos').list('')
    if (logoFiles && logoFiles.length > 0) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(logoFiles[0].name)
      setLogoUrl(publicUrl)
    }
  }

  async function uploadLogo(file) {
    setLogoUploading(true)
    const { data: existing } = await supabase.storage.from('logos').list('')
    if (existing && existing.length > 0) await supabase.storage.from('logos').remove(existing.map(f => f.name))
    const ext = file.name.split('.').pop()
    const { error } = await supabase.storage.from('logos').upload(`logo.${ext}`, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(`logo.${ext}`)
      setLogoUrl(publicUrl + '?t=' + Date.now())
    }
    setLogoUploading(false); setShowLogoUpload(false)
  }

  async function removeLogo() {
    const { data: existing } = await supabase.storage.from('logos').list('')
    if (existing && existing.length > 0) await supabase.storage.from('logos').remove(existing.map(f => f.name))
    setLogoUrl(null); setShowLogoUpload(false)
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
    const upsertData = {
      account_id: accountId, month,
      email_sent: current.email_sent || false,
      visit_done: current.visit_done || false,
      order_placed: current.order_placed || 0,
      call_done: current.call_done || false,
      shipped: current.shipped || false,
      reordered: current.reordered || false,
      [field]: newVal,
    }
    const { error } = await supabase.from('activity_log').upsert(upsertData, { onConflict: 'account_id,month' })
    if (!error) setActivity(prev => ({ ...prev, [accountId]: { ...prev[accountId], [month]: { ...current, [field]: newVal } } }))
    setSaving(false)
  }

  async function updateRevenue(accountId, month, amount) {
    const num = parseFloat(amount) || 0
    await supabase.from('monthly_revenue').upsert({ account_id: accountId, month, amount: num }, { onConflict: 'account_id,month' })
    setRevenue(prev => ({ ...prev, [accountId]: { ...prev[accountId], [month]: num } }))
  }

  async function updateStage(accountId, stage) {
    setSaving(true)
    const { error } = await supabase.from('accounts').update({ pipeline_stage: stage }).eq('id', accountId)
    if (!error) {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, pipeline_stage: stage } : a))
      if (selectedAccount?.id === accountId) setSelectedAccount(prev => ({ ...prev, pipeline_stage: stage }))
    }
    setSaving(false)
  }

  async function saveMonthlyTarget(month, amount) {
    const num = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0
    const { error } = await supabase.from('monthly_targets').upsert({ month, target: num }, { onConflict: 'month' })
    if (!error) setTargets(prev => ({ ...prev, [month]: { ...prev[month], month, target: num } }))
    setEditingTarget(false)
  }

  async function addAccount(formData) {
    setSaving(true)
    const { data, error } = await supabase.from('accounts').insert([{
      company: formData.company, spoc: formData.spoc, type: formData.type || null,
      city: formData.city || null, prov: formData.prov || null, address: formData.address || null,
      email: formData.email || null, manager: formData.manager || null,
      commission: formData.commission || null, status: false,
      actual_doors: parseInt(formData.actual_doors) || 0,
      target_doors: parseInt(formData.target_doors) || 1,
      pipeline_stage: formData.pipeline_stage || 'contacted',
    }]).select()
    if (!error && data) {
      setAccounts(prev => [...prev, ...data].sort((a,b) => a.company.localeCompare(b.company)))
      setShowAddAccount(false)
    }
    setSaving(false); return error
  }

  async function saveAccountEdit(formData) {
    setSaving(true)
    const { data, error } = await supabase.from('accounts').update({
      company: formData.company, spoc: formData.spoc, type: formData.type || null,
      city: formData.city || null, prov: formData.prov || null, address: formData.address || null,
      email: formData.email || null, manager: formData.manager || null,
      commission: formData.commission || null,
      status: formData.status === 'true' || formData.status === true,
      actual_doors: parseInt(formData.actual_doors) || 0,
      target_doors: parseInt(formData.target_doors) || 1,
      pipeline_stage: formData.pipeline_stage || 'contacted',
    }).eq('id', formData.id).select()
    if (!error && data) {
      setAccounts(prev => prev.map(a => a.id === formData.id ? data[0] : a))
      if (selectedAccount?.id === formData.id) setSelectedAccount(data[0])
      setEditingAccount(null)
    }
    setSaving(false); return error
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
    setShowDeleteConfirm(null); setSaving(false)
  }

  function getTotal(id) { return MONTHS.reduce((a, m) => a + (revenue[id]?.[m] || 0), 0) }
  function getMonthRev(id, month) { return revenue[id]?.[month] || 0 }
  function isActive(acc) { return acc.status || getTotal(acc.id) > 0 }

  // This month helpers
  const monthTarget = targets[activeMonth]?.target || 0
  const monthActual = accounts.reduce((s, a) => s + getMonthRev(a.id, activeMonth), 0)
  const monthPct = monthTarget > 0 ? Math.min(Math.round(monthActual / monthTarget * 100), 100) : 0
  const monthGap = Math.max(monthTarget - monthActual, 0)

  // Flagged accounts — ordered last month but no reorder yet this month
  const prevMonth = MONTHS[MONTHS.indexOf(activeMonth) - 1] || null
  const needsReorder = prevMonth ? accounts.filter(a => {
    const hadOrder = (getMonthRev(a.id, prevMonth) > 0) || activity[a.id]?.[prevMonth]?.order_placed > 0
    const reorderedThisMonth = activity[a.id]?.[activeMonth]?.reordered
    return hadOrder && !reorderedThisMonth
  }) : []

  const orderedThisMonth = accounts.filter(a =>
    getMonthRev(a.id, activeMonth) > 0 || activity[a.id]?.[activeMonth]?.order_placed > 0
  )

  const stalledAccounts = accounts.filter(a => {
    const stage = a.pipeline_stage
    return stage === 'sampled' || stage === 'contacted'
  })

  const filtered = accounts.filter(a => {
    if (spocFilter && a.spoc !== spocFilter) return false
    if (statusFilter === 'active' && !isActive(a)) return false
    if (statusFilter === 'inactive' && isActive(a)) return false
    if (typeFilter && a.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!((a.company||'').toLowerCase().includes(q)||(a.city||'').toLowerCase().includes(q)||(a.spoc||'').toLowerCase().includes(q)||(a.manager||'').toLowerCase().includes(q))) return false
    }
    return true
  })

  const totalRevenue = accounts.reduce((s, a) => s + getTotal(a.id), 0)
  const activeCount = accounts.filter(isActive).length
  const TARGET = 255000
  const pct = Math.round(totalRevenue / TARGET * 100)
  const types = [...new Set(accounts.map(a => a.type).filter(Boolean))].sort()
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const topAccounts = [...accounts].sort((a,b) => getTotal(b.id)-getTotal(a.id)).filter(a=>getTotal(a.id)>0).slice(0,10)
  const monthRevs = MONTHS.map(m => accounts.reduce((a, acc) => a + (revenue[acc.id]?.[m] || 0), 0))
  const maxRev = Math.max(...monthRevs, 1)

  // Stage counts for pipeline view
  const stageCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s] = accounts.filter(a => a.pipeline_stage === s).length
    return acc
  }, {})
  const stageTotal = Object.values(stageCounts).reduce((a, b) => a + b, 0) || 1

  const s = {
    app: { display:'grid', gridTemplateColumns:'220px 1fr', gridTemplateRows:'58px 1fr', height:'100vh', overflow:'hidden', background:c.bg, color:c.text, fontFamily:'"DM Sans",sans-serif', fontSize:'14px' },
    topbar: { gridColumn:'1/-1', display:'flex', alignItems:'center', gap:'16px', padding:'0 24px', borderBottom:`1px solid ${c.border}`, background:c.surface },
    sidebar: { borderRight:`1px solid ${c.border}`, background:c.surface, padding:'12px 10px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'2px' },
    main: { overflowY:'auto', padding:'28px 32px', background:c.bg },
    navItem: (active) => ({ display:'flex', alignItems:'center', gap:'9px', padding:'8px 10px', borderRadius:'7px', cursor:'pointer', color: active ? '#fff' : c.muted, background: active ? c.gold : 'transparent', fontSize:'13px', userSelect:'none', justifyContent:'space-between' }),
    navLabel: { fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted2, textTransform:'uppercase', padding:'10px 10px 4px', marginTop:'6px' },
    card: { background:c.surface, border:`1px solid ${c.border}`, borderRadius:'12px', padding:'20px 22px' },
    statCard: (color) => ({ background:c.surface, border:`1px solid ${c.border}`, borderRadius:'12px', padding:'20px 22px', borderTop:`3px solid ${color}` }),
    btn: (variant='primary') => ({ padding:'8px 18px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'500', background: variant==='primary' ? c.gold : variant==='danger' ? c.red : c.surface2, color: variant==='primary' ? '#fff' : variant==='danger' ? '#fff' : c.text, fontFamily:'inherit' }),
    input: { padding:'8px 12px', borderRadius:'7px', border:`1px solid ${c.border}`, background:c.surface2, color:c.text, fontSize:'13px', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' },
    select: { padding:'6px 10px', borderRadius:'6px', border:`1px solid ${c.border}`, background:c.surface, color:c.text, fontSize:'12px', fontFamily:'inherit', cursor:'pointer', outline:'none' },
    table: { width:'100%', borderCollapse:'collapse' },
    th: { padding:'10px 14px', textAlign:'left', fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', color:c.muted, textTransform:'uppercase', borderBottom:`1px solid ${c.border2}`, background:c.surface2 },
    td: { padding:'10px 14px', fontSize:'13px', borderBottom:`1px solid ${c.border}` },
    pill: (type) => {
      const col = isDark
        ? { Major:{bg:'rgba(232,181,106,0.12)',color:'#e8b56a'}, Chain:{bg:'rgba(126,200,200,0.08)',color:'#7ec8c8'}, Independent:{bg:'rgba(167,139,250,0.08)',color:'#a78bfa'}, Pharmacy:{bg:'rgba(244,114,182,0.08)',color:'#f472b6'}, Franchise:{bg:'rgba(251,146,60,0.08)',color:'#fb923c'}, eCommerce:{bg:'rgba(52,211,153,0.08)',color:'#34d399'}, Cafe:{bg:'rgba(251,191,36,0.08)',color:'#fbbf24'} }
        : { Major:{bg:'rgba(184,149,90,0.15)',color:'#8B6914'}, Chain:{bg:'rgba(74,175,175,0.1)',color:'#2A6B6B'}, Independent:{bg:'rgba(139,107,212,0.1)',color:'#5B3B9E'}, Pharmacy:{bg:'rgba(200,80,150,0.1)',color:'#8B2B6B'}, Franchise:{bg:'rgba(210,110,50,0.1)',color:'#8B4A15'}, eCommerce:{bg:'rgba(52,175,120,0.1)',color:'#1A7A52'}, Cafe:{bg:'rgba(210,170,50,0.1)',color:'#7A5A10'} }
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
    progressTrack: { height:'6px', background:c.border, borderRadius:'3px', overflow:'hidden', marginTop:'8px' },
    progressFill: (pct, color) => ({ height:'100%', width:`${Math.min(pct,100)}%`, background: color || c.teal, borderRadius:'3px', transition:'width 0.6s ease' }),
    flagCard: { background:c.surface, border:`1px solid ${c.border}`, borderRadius:'10px', padding:'13px 16px', display:'flex', alignItems:'center', gap:'10px', marginBottom:'7px', cursor:'pointer', transition:'all 0.15s' },
    overdueTag: { fontSize:'9px', fontWeight:'700', padding:'2px 6px', borderRadius:'3px', background:'rgba(184,50,50,0.1)', color:c.red, textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0 },
    stalledTag: { fontSize:'9px', fontWeight:'700', padding:'2px 6px', borderRadius:'3px', background:c.amberLight, color:c.amber, textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0 },
    newBadge: { fontSize:'9px', fontWeight:'700', background:c.teal, color:'#fff', padding:'2px 5px', borderRadius:'3px', letterSpacing:'0.04em' },
  }

  // ── ACCOUNT FORM ──────────────────────────────────────
  function AccountForm({ initial = {}, onSave, onCancel, title }) {
    const [form, setForm] = useState({
      company: initial.company || '', spoc: initial.spoc || '', type: initial.type || '',
      city: initial.city || '', prov: initial.prov || '', address: initial.address || '',
      email: initial.email || '', manager: initial.manager || '', commission: initial.commission || '',
      actual_doors: initial.actual_doors ?? 0, target_doors: initial.target_doors ?? 1,
      status: initial.status ?? false, pipeline_stage: initial.pipeline_stage || 'contacted',
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
            <label style={s.label}>Pipeline Stage</label>
            <select style={selectStyle} value={form.pipeline_stage} onChange={e=>set('pipeline_stage',e.target.value)}>
              {PIPELINE_STAGES.map(st => <option key={st} value={st}>{STAGE_LABELS[st]}</option>)}
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
          <button style={s.btn('primary')} onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : initial.id ? 'Save changes' : 'Add account'}</button>
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
        company: `[${repName.trim()} — placeholder]`, spoc: repName.trim(),
        status: false, actual_doors: 0, target_doors: 0, pipeline_stage: 'contacted',
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
            <div style={{ fontSize:'14px', color:c.green, marginBottom:'16px' }}>✓ Rep "{repName}" added.</div>
            <button style={s.btn('primary')} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <div style={{ fontSize:'12px', color:c.red, marginBottom:'14px', padding:'8px 12px', background:'rgba(192,57,43,0.08)', borderRadius:'6px' }}>{error}</div>}
            <div style={s.formRow}>
              <label style={s.label}>Rep Name</label>
              <input style={s.input} value={repName} onChange={e=>setRepName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAdd()} autoFocus/>
            </div>
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
          This will permanently delete <strong style={{ color:c.text }}>{acc.company}</strong> and all its data. This cannot be undone.
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px' }}>
          <button style={s.btn('secondary')} onClick={onClose}>Cancel</button>
          <button style={s.btn('danger')} onClick={()=>deleteAccount(acc.id)}>Delete permanently</button>
        </div>
      </div>
    )
  }

  // ── DRAWER ────────────────────────────────────────────
  const DrawerContent = ({ acc }) => {
    const total = getTotal(acc.id)
    const [editingRev, setEditingRev] = useState({})
    const monthContrib = getMonthRev(acc.id, activeMonth)
    const contribPct = monthTarget > 0 ? Math.round(monthContrib / monthTarget * 100) : 0

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

        {/* ── PIPELINE STAGE ── */}
        <div style={{ background:c.surface2, border:`1px solid ${c.border}`, borderRadius:'10px', padding:'16px 18px', marginBottom:'18px' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'14px' }}>Pipeline stage</div>
          <StageTrack stage={acc.pipeline_stage || 'contacted'} c={c}/>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginTop:'14px' }}>
            <span style={{ fontSize:'12px', color:c.muted }}>Update stage:</span>
            <select
              style={{ ...s.select, fontSize:'12px' }}
              value={acc.pipeline_stage || 'contacted'}
              onChange={e => updateStage(acc.id, e.target.value)}
            >
              {PIPELINE_STAGES.map(st => <option key={st} value={st}>{STAGE_LABELS[st]}</option>)}
            </select>
            {saving && <span style={{ fontSize:'11px', color:c.muted }}>Saving…</span>}
          </div>
        </div>

        {/* ── MONTHLY TARGET CONTRIBUTION ── */}
        <div style={{ background:c.surface2, border:`1px solid ${c.border}`, borderRadius:'10px', padding:'16px 18px', marginBottom:'18px' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'10px' }}>{activeMonth} contribution to target</div>
          {monthContrib > 0 ? (
            <>
              <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'8px' }}>
                <span style={{ fontFamily:'monospace', fontSize:'20px', fontWeight:'600', color:c.teal }}>{fmt(monthContrib)}</span>
                <span style={{ fontSize:'12px', color:c.muted }}>ordered this month</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ flex:1, ...s.progressTrack, marginTop:0 }}>
                  <div style={s.progressFill(contribPct, c.teal)}></div>
                </div>
                <span style={{ fontSize:'11px', color:c.muted, flexShrink:0 }}>{contribPct}% of {activeMonth} target</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize:'13px', color:c.muted2 }}>No revenue recorded for {activeMonth} yet.</div>
          )}
        </div>

        {/* CONTACT */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${c.border}` }}>Contact</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            {[['Rep',acc.spoc],['Manager',acc.manager],['City',acc.city],['Province',acc.prov],['Email',acc.email],['Commission',acc.commission]].map(([label,val])=>val?(<div key={label}><div style={{ fontSize:'10px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'2px' }}>{label}</div><div style={{ fontSize:'13px' }}>{val}</div></div>):null)}
          </div>
          {acc.address && <div style={{ marginTop:'10px' }}><div style={{ fontSize:'10px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'2px' }}>Address</div><div style={{ fontSize:'12px' }}>{acc.address}</div></div>}
        </div>

        {/* REVENUE */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${c.border}` }}>2026 Revenue — click any month to edit</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'6px' }}>
            {MONTHS.map(m => {
              const val = revenue[acc.id]?.[m] || 0
              return (
                <div key={m} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'9px', color: m === activeMonth ? c.teal : c.muted, textTransform:'uppercase', marginBottom:'3px', fontWeight: m === activeMonth ? '600' : '400' }}>{m}</div>
                  {editingRev[m] !== undefined ? (
                    <input style={{ width:'100%', padding:'3px 4px', borderRadius:'4px', border:`1px solid ${c.gold}`, background:c.surface2, color:c.text, fontSize:'11px', textAlign:'center', boxSizing:'border-box' }}
                      value={editingRev[m]} onChange={e=>setEditingRev(p=>({...p,[m]:e.target.value}))}
                      onBlur={async ()=>{ await updateRevenue(acc.id,m,editingRev[m]); setEditingRev(p=>{const n={...p};delete n[m];return n}) }}
                      onKeyDown={e=>{ if(e.key==='Enter') e.target.blur() }} autoFocus/>
                  ) : (
                    <div onClick={()=>setEditingRev(p=>({...p,[m]:val||''}))} style={{ fontSize:'11px', color:val?c.gold:c.muted2, padding:'3px 4px', borderRadius:'4px', cursor:'pointer', border:`1px solid transparent`, fontFamily:'monospace' }}>{val?fmtS(val):'—'}</div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:'10px', fontSize:'13px', fontWeight:'600', color:c.gold, textAlign:'right' }}>Total: {fmt(total)}</div>
        </div>

        {/* ACTIVITY */}
        <div>
          <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.1em', color:c.muted, textTransform:'uppercase', marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${c.border}` }}>
            Activity Log {saving && <span style={{ color:c.muted, fontWeight:'400' }}>— saving...</span>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'50px repeat(6,1fr)', gap:'6px', marginBottom:'8px' }}>
            <div></div>
            {[['✉','Email',c.blue],['🚶','Visit',c.green],['📦','Order',c.gold],['📞','Call','#a78bfa'],['📬','Shipped',c.teal],['🔁','Reorder',c.amber]].map(([icon,label,color])=>(
              <div key={label} style={{ fontSize:'10px', color, fontWeight:'600', textAlign:'center' }}>{icon} {label}</div>
            ))}
          </div>
          {ACT_MONTHS.map(m => {
            const a = activity[acc.id]?.[m] || {}
            const hasAny = a.email_sent||a.visit_done||a.call_done||(a.order_placed||0)>0||a.shipped||a.reordered
            return (
              <div key={m} style={{ display:'grid', gridTemplateColumns:'50px repeat(6,1fr)', gap:'6px', alignItems:'center', padding:'6px 0', borderBottom:`1px solid ${c.border}`, opacity:hasAny?1:0.5 }}>
                <div style={{ fontSize:'11px', color: m === activeMonth ? c.teal : c.muted, fontWeight: m === activeMonth ? '600' : '500' }}>{m}</div>
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
                {[['shipped',c.teal],['reordered',c.amber]].map(([field,color])=>(
                  <div key={field} style={{ display:'flex', justifyContent:'center' }}>
                    <div style={s.checkbox(a[field],color)} onClick={()=>toggleActivity(acc.id,m,field)}>
                      {a[field] && <span style={{ color:'#fff', fontSize:'11px', fontWeight:'700' }}>✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ minHeight:'100vh', background:dark.bg, display:'flex', alignItems:'center', justifyContent:'center', color:dark.muted, fontFamily:'"DM Sans",sans-serif' }}>Loading…</div>

  // ── LOGIN ─────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ minHeight:'100vh', background:c.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"DM Sans",sans-serif' }}>
        <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:'16px', padding:'40px', width:'380px', borderTop:`3px solid ${c.gold}` }}>
          <div style={{ marginBottom:'28px', textAlign:'center' }}>
            <img src={SUNA_LOGO_B64} alt="Suna" style={{ height:'36px', width:'auto', display:'block', margin:'0 auto 8px', filter: isDark ? 'invert(1) brightness(0.9)' : 'invert(1)' }}/>
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

  return (
    <div style={s.app}>
      {/* TOPBAR */}
      <header style={s.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ position:'relative', cursor:'pointer' }} onClick={()=>setShowLogoUpload(true)} title="Click to change logo">
            {logoUrl ? (
              <img src={logoUrl} style={{ height:'32px', width:'auto', maxWidth:'140px', objectFit:'contain', display:'block' }} alt="Logo"/>
            ) : (
              <img src={SUNA_LOGO_B64} alt="Suna" style={{ height:'28px', width:'auto', display:'block', filter: isDark ? 'invert(1) brightness(0.85)' : 'invert(1)' }}/>
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

      {/* SIDEBAR */}
      <nav style={s.sidebar}>
        <div style={s.navLabel}>Views</div>
        {[
          ['dashboard','Dashboard'],
          ['thismonth','This month'],
          ['accounts','Accounts'],
          ['pipeline','Pipeline'],
          ['activity','Activity'],
          ['analytics','Analytics'],
        ].map(([id,label])=>(
          <div key={id} style={s.navItem(view===id)} onClick={()=>setView(id)}>
            <span>{label}</span>
            {(id==='thismonth'||id==='pipeline') && view!==id && <span style={s.newBadge}>NEW</span>}
          </div>
        ))}
        <div style={s.navLabel}>By Rep</div>
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
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rep.length > 13 ? rep.slice(0,13)+'…' : rep}</span>
            <span style={{ fontSize:'10px', fontWeight:'600', minWidth:'18px', height:'18px', borderRadius:'9px', background: spocFilter===rep ? 'rgba(255,255,255,0.25)' : c.surface2, color: spocFilter===rep ? '#fff' : c.muted, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 5px', lineHeight:1, flexShrink:0 }}>{repCounts[rep] || 0}</span>
          </div>
        ))}
      </nav>

      {/* MAIN */}
      <main style={s.main}>

        {/* ══ THIS MONTH ══ */}
        {view === 'thismonth' && (
          <div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px' }}>
              <div>
                <div style={{ fontSize:'17px', fontWeight:'600' }}>{activeMonth} 2026</div>
                <div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Your month at a glance</div>
              </div>
              <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                {ACT_MONTHS.map(m => (
                  <button key={m} onClick={()=>setActiveMonth(m)} style={{
                    padding:'5px 12px', borderRadius:'6px', border:`1px solid ${m===activeMonth ? c.gold : c.border}`,
                    background: m===activeMonth ? c.gold : 'transparent',
                    color: m===activeMonth ? '#fff' : m===currentMonth() ? c.teal : c.muted,
                    cursor:'pointer', fontSize:'12px', fontFamily:'inherit', fontWeight: m===activeMonth ? '600' : '400',
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* TARGET HERO */}
            <div style={{ ...s.card, marginBottom:'20px', display:'grid', gridTemplateColumns:'1fr auto', gap:'24px', alignItems:'start' }}>
              <div>
                <div style={{ fontSize:'10px', fontWeight:'600', color:c.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'8px' }}>Monthly target — {activeMonth}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'32px', fontWeight:'600', fontFamily:'monospace' }}>{fmt(monthActual)}</span>
                  <span style={{ fontSize:'14px', color:c.muted }}>of</span>
                  <span style={{ fontSize:'20px', fontWeight:'500', fontFamily:'monospace', color:c.muted }}>{fmt(monthTarget) || 'no target set'}</span>
                </div>
                <div style={s.progressTrack}>
                  <div style={s.progressFill(monthPct, c.teal)}></div>
                </div>
                <div style={{ fontSize:'11px', color:c.muted, marginTop:'7px' }}>
                  {monthTarget > 0
                    ? monthGap > 0
                      ? <><span style={{ color:c.amber, fontWeight:'600' }}>{fmt(monthGap)}</span> more needed to hit your {activeMonth} target</>
                      : <span style={{ color:c.teal, fontWeight:'600' }}>✓ Target reached!</span>
                    : 'Set a target to track your progress'}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'11px', color:c.muted, marginBottom:'6px' }}>Set {activeMonth} target</div>
                {editingTarget ? (
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <input
                      style={{ ...s.input, width:'140px', fontFamily:'monospace' }}
                      value={targetInput}
                      onChange={e=>setTargetInput(e.target.value)}
                      placeholder="e.g. 28000"
                      onKeyDown={e=>{ if(e.key==='Enter') saveMonthlyTarget(activeMonth, targetInput) }}
                      autoFocus
                    />
                    <button style={{ ...s.btn('primary'), padding:'8px 14px', fontSize:'12px' }} onClick={()=>saveMonthlyTarget(activeMonth, targetInput)}>Save</button>
                    <button style={{ ...s.btn('secondary'), padding:'8px 10px', fontSize:'12px' }} onClick={()=>setEditingTarget(false)}>✕</button>
                  </div>
                ) : (
                  <button style={{ ...s.btn('secondary'), fontSize:'12px', padding:'8px 14px' }} onClick={()=>{ setTargetInput(monthTarget||''); setEditingTarget(true) }}>
                    {monthTarget ? `Edit $${monthTarget.toLocaleString()}` : '+ Set target'}
                  </button>
                )}
              </div>
            </div>

            {/* STAT ROW */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' }}>
              {[
                [c.teal, 'Confirmed orders', fmt(monthActual), `${orderedThisMonth.length} accounts`],
                [c.amber, 'Need reorder', needsReorder.length, `Ordered last month`],
                [c.red, 'Stalled', stalledAccounts.filter(a=>spocFilter?a.spoc===spocFilter:true).length, 'Contacted or sampled'],
                [c.muted2, 'Total pipeline', accounts.filter(a=>a.pipeline_stage!=='reordered'&&(spocFilter?a.spoc===spocFilter:true)).length, 'Not yet reordering'],
              ].map(([color,label,val,sub])=>(
                <div key={label} style={s.statCard(color)}>
                  <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', color:c.muted, textTransform:'uppercase', marginBottom:'8px' }}>{label}</div>
                  <div style={{ fontSize:'26px', fontWeight:'600', fontFamily:'monospace', marginBottom:'6px' }}>{val}</div>
                  <div style={{ fontSize:'11px', color:c.muted }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* FLAGS */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
              <div>
                <div style={{ fontSize:'12px', fontWeight:'600', color:c.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>🔴 Needs attention</div>
                {needsReorder.slice(0,8).map(acc => (
                  <div key={acc.id} style={s.flagCard} onClick={()=>setSelectedAccount(acc)}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=c.border2}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.red, flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'500' }}>{acc.company}</div>
                      <div style={{ fontSize:'11px', color:c.muted, marginTop:'1px' }}>Ordered {prevMonth} · no reorder yet</div>
                    </div>
                    <span style={s.overdueTag}>Overdue</span>
                  </div>
                ))}
                {stalledAccounts.filter(a=>spocFilter?a.spoc===spocFilter:true).slice(0,4).map(acc => (
                  <div key={acc.id} style={s.flagCard} onClick={()=>setSelectedAccount(acc)}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=c.border2}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.amber, flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'500' }}>{acc.company}</div>
                      <div style={{ fontSize:'11px', color:c.muted, marginTop:'1px' }}><StageBadge stage={acc.pipeline_stage}/></div>
                    </div>
                    <span style={s.stalledTag}>Follow up</span>
                  </div>
                ))}
                {needsReorder.length === 0 && stalledAccounts.length === 0 && (
                  <div style={{ fontSize:'13px', color:c.muted2, padding:'20px 0' }}>No accounts need attention right now.</div>
                )}
              </div>

              <div>
                <div style={{ fontSize:'12px', fontWeight:'600', color:c.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>✅ Active this month</div>
                {orderedThisMonth.slice(0,8).map(acc => (
                  <div key={acc.id} style={{ ...s.flagCard, cursor:'pointer' }} onClick={()=>setSelectedAccount(acc)}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=c.border2}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.teal, flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'500' }}>{acc.company}</div>
                      <div style={{ fontSize:'11px', color:c.muted, marginTop:'1px' }}>{fmt(getMonthRev(acc.id, activeMonth))} this month</div>
                    </div>
                    <StageBadge stage={acc.pipeline_stage}/>
                  </div>
                ))}
                {orderedThisMonth.length === 0 && (
                  <div style={{ fontSize:'13px', color:c.muted2, padding:'20px 0' }}>No orders recorded for {activeMonth} yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {view === 'dashboard' && (
          <div>
            <div style={{ marginBottom:'24px' }}>
              <div style={{ fontSize:'17px', fontWeight:'600' }}>Overview</div>
              <div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>2026 year-to-date performance</div>
            </div>

            {/* YTD + this month combined bar */}
            <div style={{ ...s.card, marginBottom:'20px', display:'grid', gridTemplateColumns:'1fr auto', gap:'24px', alignItems:'center' }}>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'6px' }}>
                  <span style={{ fontSize:'12px', fontWeight:'600', color:c.muted, textTransform:'uppercase', letterSpacing:'0.08em' }}>YTD vs Annual Target</span>
                  <span style={{ fontFamily:'monospace', fontSize:'13px', color:c.muted }}>{fmt(totalRevenue)} <span style={{ color:c.muted2 }}>/ {fmt(TARGET)}</span></span>
                </div>
                <div style={s.progressTrack}>
                  <div style={s.progressFill(pct, c.gold)}></div>
                </div>
                <div style={{ fontSize:'11px', color:c.muted, marginTop:'6px' }}>{pct}% of annual target</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:'10px', color:c.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'4px' }}>{currentMonth()} target</div>
                <div style={{ fontFamily:'monospace', fontSize:'16px', fontWeight:'600', color:c.teal }}>{monthPct}%</div>
                <div style={{ fontSize:'11px', color:c.muted }}>{fmt(monthActual)} / {fmt(monthTarget) || '—'}</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' }}>
              {[
                [c.gold, 'Revenue YTD', '$'+Math.round(totalRevenue).toLocaleString(), `${pct}% of $255k target`, true],
                [c.teal, 'Active Accounts', activeCount, `of ${accounts.length} total`, false],
                [c.blue, 'Avg per Active', '$'+(activeCount?Math.round(totalRevenue/activeCount).toLocaleString():'0'), 'YTD ÷ active accounts', false],
                [c.muted2, 'Overdue reorders', needsReorder.length, 'Ordered last month, no reorder', false],
              ].map(([color,label,val,sub,showBar])=>(
                <div key={label} style={s.statCard(color)}>
                  <div style={{ fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', color:c.muted, textTransform:'uppercase', marginBottom:'8px' }}>{label}</div>
                  <div style={{ fontSize:'26px', fontWeight:'600', fontFamily:'monospace', marginBottom:'6px' }}>{val}</div>
                  <div style={{ fontSize:'11px', color:c.muted }}>{sub}</div>
                  {showBar && <div style={s.progressTrack}><div style={s.progressFill(pct, color)}></div></div>}
                </div>
              ))}
            </div>

            <div style={{ ...s.card, marginBottom:'24px' }}>
              <div style={{ fontSize:'12px', fontWeight:'600', letterSpacing:'0.04em', color:c.muted, textTransform:'uppercase', marginBottom:'16px' }}>Monthly revenue — 2026</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:'6px', height:'100px' }}>
                {monthRevs.map((v,i)=>(
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', height:'100%' }}>
                    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', width:'100%' }}>
                      <div style={{ fontSize:'9px', color:c.muted, textAlign:'center', marginBottom:'2px' }}>{v>0?fmtS(v):''}</div>
                      <div style={{ width:'100%', background: MONTHS[i]===activeMonth ? c.teal : c.green, borderRadius:'3px 3px 0 0', height:Math.max(v/maxRev*100,v>0?4:2)+'%', minHeight:'2px', opacity: MONTHS[i]===activeMonth ? 1 : 0.7 }}></div>
                    </div>
                    <div style={{ fontSize:'8px', color: MONTHS[i]===activeMonth ? c.teal : c.muted2, textTransform:'uppercase', fontWeight: MONTHS[i]===activeMonth ? '600' : '400' }}>{MONTHS[i]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize:'15px', fontWeight:'600', marginBottom:'16px' }}>Top accounts</div>
            <div style={{ ...s.card, overflow:'hidden', padding:'0' }}>
              <table style={s.table}>
                <thead><tr>{['Account','Rep','Stage',...MONTHS.slice(0,7),'YTD'].map(h=><th key={h} style={{...s.th,textAlign:h==='YTD'?'right':'left'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {topAccounts.map(acc=>(
                    <tr key={acc.id} style={{ cursor:'pointer' }} onClick={()=>setSelectedAccount(acc)}>
                      <td style={s.td}><strong>{acc.company}</strong></td>
                      <td style={{ ...s.td, color:c.muted, fontSize:'12px' }}>{acc.spoc}</td>
                      <td style={s.td}><StageBadge stage={acc.pipeline_stage}/></td>
                      {MONTHS.slice(0,7).map(m=>{const v=revenue[acc.id]?.[m]||0;return <td key={m} style={{ ...s.td, fontFamily:'monospace', fontSize:'12px', color:v?c.gold:c.muted2, textAlign:'right' }}>{v?fmtS(v):'—'}</td>})}
                      <td style={{ ...s.td, fontFamily:'monospace', fontSize:'12px', color:c.gold, fontWeight:'600', textAlign:'right' }}>{fmt(getTotal(acc.id))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ PIPELINE VIEW ══ */}
        {view === 'pipeline' && (
          <div>
            <div style={{ marginBottom:'24px' }}>
              <div style={{ fontSize:'17px', fontWeight:'600' }}>Pipeline</div>
              <div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Where every account stands right now</div>
            </div>

            {/* Stage bar */}
            <div style={{ ...s.card, marginBottom:'24px' }}>
              <div style={{ fontSize:'12px', fontWeight:'600', color:c.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'12px' }}>Portfolio by stage</div>
              <div style={{ display:'flex', alignItems:'stretch', borderRadius:'8px', overflow:'hidden', height:'32px', marginBottom:'10px' }}>
                {PIPELINE_STAGES.map(stage => {
                  const count = stageCounts[stage] || 0
                  const pctW = Math.round(count / stageTotal * 100)
                  return pctW > 0 ? (
                    <div key={stage} style={{ flex:count, display:'flex', alignItems:'center', justifyContent:'center', background:STAGE_COLORS[stage], fontSize:'10px', fontWeight:'600', color:'#fff', whiteSpace:'nowrap', overflow:'hidden', cursor:'default', minWidth:'2px' }} title={`${STAGE_LABELS[stage]}: ${count}`}>
                      {pctW > 8 ? `${count}` : ''}
                    </div>
                  ) : null
                })}
              </div>
              <div style={{ display:'flex', gap:'14px', flexWrap:'wrap' }}>
                {PIPELINE_STAGES.map(stage => (
                  <div key={stage} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:c.muted }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:STAGE_COLORS[stage] }}></div>
                    {STAGE_LABELS[stage]} ({stageCounts[stage] || 0})
                  </div>
                ))}
              </div>
            </div>

            {/* Kanban columns */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px' }}>
              {PIPELINE_STAGES.map(stage => {
                const stageAccounts = (spocFilter ? accounts.filter(a=>a.spoc===spocFilter) : accounts).filter(a => a.pipeline_stage === stage)
                return (
                  <div key={stage}>
                    <div style={{ fontSize:'10px', fontWeight:'600', color:STAGE_COLORS[stage], textTransform:'uppercase', letterSpacing:'0.08em', padding:'6px 8px', background:STAGE_BG[stage], borderRadius:'6px', marginBottom:'8px', textAlign:'center' }}>
                      {STAGE_LABELS[stage]} · {stageAccounts.length}
                    </div>
                    {stageAccounts.map(acc => (
                      <div key={acc.id} style={{
                        background:c.surface, border:`1px solid ${c.border}`,
                        borderRadius:'8px', padding:'10px 12px', marginBottom:'6px',
                        cursor:'pointer', transition:'border-color 0.1s',
                        borderLeft: stage === 'reordered' ? `3px solid ${STAGE_COLORS[stage]}` : `1px solid ${c.border}`,
                      }}
                        onClick={()=>setSelectedAccount(acc)}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=STAGE_COLORS[stage]}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}
                      >
                        <div style={{ fontSize:'12px', fontWeight:'500', marginBottom:'2px' }}>{acc.company}</div>
                        <div style={{ fontSize:'10px', color:c.muted }}>{acc.type||'—'} · {acc.prov||'—'}</div>
                        {getTotal(acc.id) > 0 && <div style={{ fontSize:'10px', fontFamily:'monospace', color:c.gold, marginTop:'3px' }}>{fmt(getTotal(acc.id))} YTD</div>}
                      </div>
                    ))}
                    {stageAccounts.length === 0 && <div style={{ fontSize:'11px', color:c.muted2, textAlign:'center', padding:'16px 0' }}>None</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ ACCOUNTS ══ */}
        {view === 'accounts' && (
          <div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px' }}>
              <div><div style={{ fontSize:'17px', fontWeight:'600' }}>All Accounts</div><div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Click any row to view details, log activity and edit revenue</div></div>
              <button style={{ ...s.btn('primary'), fontSize:'13px' }} onClick={()=>setShowAddAccount(true)}>+ Add account</button>
            </div>
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:'12px', color:c.muted }}>Status:</span>
              {['all','active','inactive'].map(v=>(<button key={v} style={{ padding:'5px 12px', borderRadius:'6px', border:`1px solid ${statusFilter===v?c.gold:c.border}`, background:statusFilter===v?c.goldLight:'transparent', color:statusFilter===v?c.gold:c.muted, cursor:'pointer', fontSize:'12px', fontFamily:'inherit' }} onClick={()=>{setStatusFilter(v);setPage(1)}}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>))}
              <span style={{ fontSize:'12px', color:c.muted }}>Type:</span>
              <select style={s.select} value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1)}}><option value="">All types</option>{types.map(t=><option key={t}>{t}</option>)}</select>
              <span style={{ marginLeft:'auto', fontSize:'11px', color:c.muted, fontFamily:'monospace' }}>{filtered.length} accounts</span>
            </div>
            <div style={{ ...s.card, padding:'0', overflow:'hidden' }}>
              <table style={s.table}>
                <thead><tr>{['Account','Type','Rep','Prov','Stage','Status','Doors','YTD'].map(h=><th key={h} style={{...s.th,textAlign:h==='YTD'?'right':'left'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {paged.map(acc=>{
                    const total=getTotal(acc.id); const active=isActive(acc)
                    return (
                      <tr key={acc.id} style={{ cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background=c.surface2} onMouseLeave={e=>e.currentTarget.style.background=''} onClick={()=>setSelectedAccount(acc)}>
                        <td style={s.td}><div style={{ fontWeight:'500' }}>{acc.company}</div>{acc.city&&<div style={{ fontSize:'11px', color:c.muted }}>{acc.city}{acc.prov&&acc.city!==acc.prov?', '+acc.prov:''}</div>}</td>
                        <td style={s.td}><span style={s.pill(acc.type)}>{acc.type||'—'}</span></td>
                        <td style={{ ...s.td, color:c.muted, fontSize:'12px' }}>{acc.spoc}</td>
                        <td style={{ ...s.td, color:c.muted, fontSize:'12px' }}>{acc.prov||'—'}</td>
                        <td style={s.td}><StageBadge stage={acc.pipeline_stage || 'contacted'}/></td>
                        <td style={s.td}><span style={s.status(active)}><span style={{ width:'4px',height:'4px',borderRadius:'50%',background:'currentColor' }}></span>{active?'Active':'Target'}</span></td>
                        <td style={{ ...s.td, fontFamily:'monospace', fontSize:'12px' }}>{acc.actual_doors||0}/{acc.target_doors||1}</td>
                        <td style={{ ...s.td, fontFamily:'monospace', fontSize:'12px', color:total?c.gold:c.muted2, textAlign:'right' }}>{total?fmt(total):'—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderTop:`1px solid ${c.border}`, background:c.surface2 }}>
                <button style={{ ...s.btn('secondary'), padding:'5px 14px', fontSize:'12px' }} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                <span style={{ fontSize:'11px', color:c.muted, fontFamily:'monospace' }}>Page {page} of {totalPages} · {filtered.length} accounts</span>
                <button style={{ ...s.btn('secondary'), padding:'5px 14px', fontSize:'12px' }} disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ACTIVITY ══ */}
        {view === 'activity' && (
          <div>
            <div style={{ marginBottom:'20px' }}><div style={{ fontSize:'17px', fontWeight:'600' }}>Activity Log</div><div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Click any account to check off visits, emails, calls, orders, shipped and reorders</div></div>
            <div style={{ display:'flex', gap:'14px', marginBottom:'16px', flexWrap:'wrap' }}>
              {[[c.blue,'Email'],[c.green,'Visit'],[c.gold,'Order'],['#a78bfa','Call'],[c.teal,'Shipped'],[c.amber,'Reorder']].map(([color,label])=>(
                <div key={label} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:c.muted }}><div style={{ width:'8px', height:'8px', borderRadius:'2px', background:color }}></div>{label}</div>
              ))}
            </div>
            <div style={{ display:'grid', gap:'8px' }}>
              {filtered.slice(0,60).map(acc=>{const total=getTotal(acc.id);return(
                <div key={acc.id} style={{ ...s.card, padding:'14px 18px', display:'grid', gridTemplateColumns:'1fr auto', gap:'12px', alignItems:'center', cursor:'pointer' }} onClick={()=>setSelectedAccount(acc)}>
                  <div>
                    <div style={{ fontWeight:'500', fontSize:'14px' }}>{acc.company}</div>
                    <div style={{ fontSize:'11px', color:c.muted, marginTop:'2px', display:'flex', gap:'8px', alignItems:'center' }}>
                      <span>{acc.spoc} · {acc.type||'—'} · {acc.prov||'—'}{total?' · '+fmt(total)+' YTD':''}</span>
                      <StageBadge stage={acc.pipeline_stage}/>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'5px' }}>
                    {ACT_MONTHS.slice(0,7).map(m=>{const a=activity[acc.id]?.[m]||{};return(
                      <div key={m} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                        <div style={{ fontSize:'8px', color: m===activeMonth ? c.teal : c.muted2, textTransform:'uppercase', fontWeight: m===activeMonth ? '600':'400' }}>{m}</div>
                        <div style={{ display:'flex', gap:'1px' }}>
                          {[[a.email_sent,c.blue],[a.visit_done,c.green],[(a.order_placed||0)>0,c.gold],[a.call_done,'#a78bfa'],[a.shipped,c.teal],[a.reordered,c.amber]].map(([on,color],i)=>(
                            <div key={i} style={{ width:'6px', height:'6px', borderRadius:'1px', background:on?color:c.border }}></div>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* ══ ANALYTICS ══ */}
        {view === 'analytics' && (
          <div>
            <div style={{ marginBottom:'24px' }}><div style={{ fontSize:'17px', fontWeight:'600' }}>Analytics</div><div style={{ fontSize:'12px', color:c.muted, marginTop:'3px' }}>Revenue breakdown across the portfolio</div></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>
              {[
                ['Revenue by rep', reps.map(sp=>({label:sp,val:accounts.filter(a=>a.spoc===sp).reduce((s,a)=>s+getTotal(a.id),0)})).sort((a,b)=>b.val-a.val)],
                ['Revenue by type', [...new Set(accounts.map(a=>a.type).filter(Boolean))].map(t=>({label:t,val:accounts.filter(a=>a.type===t).reduce((s,a)=>s+getTotal(a.id),0)})).sort((a,b)=>b.val-a.val).slice(0,8)],
                ['Top 10 accounts', [...accounts].sort((a,b)=>getTotal(b.id)-getTotal(a.id)).filter(a=>getTotal(a.id)>0).slice(0,10).map(a=>({label:a.company.length>22?a.company.slice(0,22)+'…':a.company,val:getTotal(a.id)}))],
                ['By pipeline stage', PIPELINE_STAGES.map(st=>({label:STAGE_LABELS[st],val:accounts.filter(a=>a.pipeline_stage===st).length,color:STAGE_COLORS[st]}))],
              ].map(([title,data],ci)=>{
                const isCount = ci===3
                const max = Math.max(...data.map(d=>d.val),1)
                return (
                  <div key={title} style={s.card}>
                    <div style={{ fontSize:'12px', fontWeight:'600', letterSpacing:'0.04em', color:c.muted, textTransform:'uppercase', marginBottom:'18px' }}>{title}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
                      {data.filter(d=>d.val>0).map((d,i)=>(
                        <div key={d.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'100px', fontSize:'12px', color:c.muted, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{d.label}</div>
                          <div style={{ flex:1, height:'22px', background:c.surface2, borderRadius:'4px', overflow:'hidden', position:'relative' }}>
                            <div style={{ height:'100%', width:d.val/max*100+'%', background: d.color || CHART_COLORS[i%CHART_COLORS.length], borderRadius:'4px' }}></div>
                            <div style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', fontSize:'11px', fontFamily:'monospace', fontWeight:'600', color:c.text, mixBlendMode: isDark ? 'screen' : 'multiply' }}>{isCount?d.val:fmtS(d.val)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ACCOUNT DRAWER */}
      {selectedAccount && (
        <>
          <div style={{ position:'fixed', inset:'0', background:'rgba(0,0,0,0.4)', zIndex:'100', backdropFilter:'blur(2px)' }} onClick={()=>setSelectedAccount(null)}/>
          <div style={{ position:'fixed', right:'0', top:'0', bottom:'0', width:'500px', background:c.surface, borderLeft:`1px solid ${c.border}`, zIndex:'101', overflowY:'auto', padding:'28px' }}>
            <DrawerContent acc={selectedAccount}/>
          </div>
        </>
      )}

      {showAddAccount && <Modal onClose={()=>setShowAddAccount(false)}><AccountForm title="Add New Account" onSave={addAccount} onCancel={()=>setShowAddAccount(false)}/></Modal>}
      {editingAccount && <Modal onClose={()=>setEditingAccount(null)}><AccountForm title="Edit Account" initial={editingAccount} onSave={saveAccountEdit} onCancel={()=>setEditingAccount(null)}/></Modal>}
      {showAddRep && <Modal onClose={()=>setShowAddRep(false)} width="420px"><AddRepForm onClose={()=>setShowAddRep(false)}/></Modal>}
      {showDeleteConfirm && <Modal onClose={()=>setShowDeleteConfirm(null)} width="420px"><DeleteConfirm acc={showDeleteConfirm} onClose={()=>setShowDeleteConfirm(null)}/></Modal>}

      {showLogoUpload && (
        <Modal onClose={()=>setShowLogoUpload(false)} width="420px">
          <div style={s.modalBox}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'16px', fontWeight:'600' }}>Change Logo</div>
              <button style={{ background:'none', border:'none', color:c.muted, cursor:'pointer', fontSize:'18px' }} onClick={()=>setShowLogoUpload(false)}>✕</button>
            </div>
            {logoUrl && <div style={{ marginBottom:'16px', padding:'16px', background:c.surface2, borderRadius:'8px', textAlign:'center' }}><img src={logoUrl} style={{ height:'40px', width:'auto', maxWidth:'200px', objectFit:'contain' }} alt="Current logo"/></div>}
            <div style={{ marginBottom:'16px' }}>
              <label style={s.label}>Upload new logo</label>
              <input type="file" accept="image/*" style={{ ...s.input, padding:'6px' }} onChange={e => { if(e.target.files[0]) uploadLogo(e.target.files[0]) }}/>
            </div>
            {logoUploading && <div style={{ fontSize:'13px', color:c.muted, marginBottom:'12px' }}>Uploading…</div>}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'16px', borderTop:`1px solid ${c.border}` }}>
              {logoUrl ? <button style={{ ...s.btn('danger'), fontSize:'12px', padding:'6px 12px' }} onClick={removeLogo}>Remove logo</button> : <div/>}
              <button style={s.btn('secondary')} onClick={()=>setShowLogoUpload(false)}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
