import { useState, useCallback, useEffect } from 'react'
import ExpenseList from './components/ExpenseList.jsx'
import ExpenseForm from './components/ExpenseForm.jsx'
import ExpenseDetail from './components/ExpenseDetail.jsx'
import StatsView from './components/StatsView.jsx'
import SettingsView from './components/SettingsView.jsx'
import Toast from './components/Toast.jsx'
import { useOffline } from './hooks/useOffline.js'
import { initDrive } from './lib/drive.js'

export default function App() {
  const [view, setView] = useState('list') // list | stats | settings | form | detail
  const [activeTab, setActiveTab] = useState('list')
  const [editingId, setEditingId] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [toasts, setToasts] = useState([])
  const isOffline = useOffline()

  useEffect(() => {
    initDrive().catch(() => {})
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const openAdd = useCallback(() => {
    setEditingId(null)
    setView('form')
  }, [])

  const openEdit = useCallback((id) => {
    setEditingId(id)
    setView('form')
  }, [])

  const openDetail = useCallback((id) => {
    setDetailId(id)
    setView('detail')
  }, [])

  const goBack = useCallback(() => {
    setView(activeTab)
    setEditingId(null)
    setDetailId(null)
  }, [activeTab])

  const switchTab = useCallback((tab) => {
    setActiveTab(tab)
    setView(tab)
  }, [])

  const onSaved = useCallback((msg) => {
    showToast(msg || 'Expense saved')
    goBack()
  }, [showToast, goBack])

  const onDeleted = useCallback(() => {
    showToast('Expense deleted')
    goBack()
  }, [showToast, goBack])

  const showOverlay = view === 'form' || view === 'detail'
  const isTabView = !showOverlay

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <img src="/logo.png" alt="xTrack" style={{ height: 44, width: 'auto', display: 'block' }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--bg-card)', borderRadius: 20, padding: '4px 10px', border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isOffline ? '#fdcb6e' : '#00b894',
            boxShadow: `0 0 6px ${isOffline ? '#fdcb6e' : '#00b894'}`,
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {isOffline ? 'Offline' : 'Online'}
          </span>
        </div>
      </header>

      {/* Tab navigation */}
      <nav style={{ padding: '12px 20px 0', display: 'flex', gap: 4, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { id: 'list', label: 'Expenses' },
          { id: 'stats', label: 'Stats' },
          { id: 'settings', label: '⚙️ Settings' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              flexShrink: 0,
              padding: '8px 18px',
              borderRadius: 20,
              fontWeight: 600,
              fontSize: 13,
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'list' && isTabView && (
          <ExpenseList onOpenDetail={openDetail} onOpenAdd={openAdd} showToast={showToast} />
        )}
        {activeTab === 'stats' && isTabView && (
          <StatsView showToast={showToast} />
        )}
        {activeTab === 'settings' && isTabView && (
          <SettingsView showToast={showToast} />
        )}

        {/* Form overlay */}
        {view === 'form' && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', zIndex: 10, overflowY: 'auto', animation: 'slideUp 0.25s ease' }}>
            <ExpenseForm
              editingId={editingId}
              onBack={goBack}
              onSaved={onSaved}
              showToast={showToast}
            />
          </div>
        )}

        {/* Detail overlay */}
        {view === 'detail' && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', zIndex: 10, overflowY: 'auto', animation: 'slideUp 0.25s ease' }}>
            <ExpenseDetail
              expenseId={detailId}
              onBack={goBack}
              onEdit={openEdit}
              onDeleted={onDeleted}
              showToast={showToast}
            />
          </div>
        )}
      </main>

      {/* FAB */}
      {!showOverlay && (
        <button
          onClick={openAdd}
          style={{
            position: 'fixed', bottom: 28, right: 20,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            color: '#fff', fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245,166,35,0.45)',
            zIndex: 100, transition: 'transform 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          +
        </button>
      )}

      <Toast toasts={toasts} />
    </div>
  )
}
