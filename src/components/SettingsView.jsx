import { useState, useEffect } from 'react'
import { CATEGORIES } from '../lib/categories.js'
import { getBudgets, setBudget, deleteBudget } from '../lib/budgets.js'
import { initDrive, signIn, signOut, isSignedIn, backupToDrive, restoreFromDrive, getClientId, setClientId } from '../lib/drive.js'
import { getSetting } from '../lib/db.js'
import { db } from '../lib/db.js'
import { guessWithCustomRules, getCustomRules, saveCustomRules } from '../lib/autocat.js'

export default function SettingsView({ showToast }) {
  const [budgets, setBudgetsState] = useState([])
  const [editingBudget, setEditingBudget] = useState({})
  const [clientId, setClientIdState] = useState('')
  const [clientIdInput, setClientIdInput] = useState('')
  const [driveSignedIn, setDriveSignedIn] = useState(false)
  const [driveLoading, setDriveLoading] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [customRules, setCustomRules] = useState([])
  const [newKeyword, setNewKeyword] = useState('')
  const [newRuleCat, setNewRuleCat] = useState('food')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const b = await getBudgets()
    setBudgetsState(b)
    const initial = {}
    for (const cat of CATEGORIES) {
      const found = b.find(x => x.categoryId === cat.id)
      initial[cat.id] = found ? String(found.monthlyLimit) : ''
    }
    setEditingBudget(initial)

    const cid = await getClientId()
    setClientIdState(cid)
    setClientIdInput(cid)
    setDriveSignedIn(isSignedIn())
    const ls = await getSetting('lastSynced', null)
    setLastSynced(ls)

    const rules = await getCustomRules(db)
    setCustomRules(rules)
  }

  async function saveBudget(catId) {
    const val = editingBudget[catId]
    if (!val || isNaN(parseFloat(val)) || parseFloat(val) <= 0) {
      await deleteBudget(catId)
      showToast(`Budget cleared for ${catId}`)
    } else {
      await setBudget(catId, val)
      showToast(`Budget saved for ${catId}`)
    }
    const b = await getBudgets()
    setBudgetsState(b)
  }

  async function handleSaveClientId() {
    await setClientId(clientIdInput.trim())
    setClientIdState(clientIdInput.trim())
    showToast('Google Client ID saved')
  }

  async function handleDriveSignIn() {
    setDriveLoading(true)
    try {
      const inited = await initDrive()
      if (!inited) { showToast('Configure Google Client ID first', 'warning'); return }
      await signIn()
      setDriveSignedIn(true)
      showToast('Signed in to Google Drive')
    } catch (err) {
      showToast(err.message || 'Sign-in failed', 'error')
    } finally {
      setDriveLoading(false)
    }
  }

  async function handleDriveSignOut() {
    await signOut()
    setDriveSignedIn(false)
    showToast('Signed out of Google Drive')
  }

  async function handleBackup() {
    setDriveLoading(true)
    try {
      await backupToDrive()
      const ls = new Date().toISOString()
      setLastSynced(ls)
      showToast('Backup saved to Google Drive ✓')
    } catch (err) {
      showToast(err.message || 'Backup failed', 'error')
    } finally {
      setDriveLoading(false)
    }
  }

  async function handleRestore() {
    setDriveLoading(true)
    try {
      const result = await restoreFromDrive()
      showToast(`Restored ${result.expenseCount} expenses from Drive ✓`)
    } catch (err) {
      showToast(err.message || 'Restore failed', 'error')
    } finally {
      setDriveLoading(false)
    }
  }

  async function handleClearAll() {
    await db.expenses.clear()
    await db.budgets.clear()
    setShowClearConfirm(false)
    showToast('All data cleared')
    loadAll()
  }

  async function addCustomRule() {
    if (!newKeyword.trim()) return
    const updated = [...customRules, { keyword: newKeyword.trim(), category: newRuleCat }]
    await saveCustomRules(db, updated)
    setCustomRules(updated)
    setNewKeyword('')
    showToast('Auto-categorisation rule added')
  }

  async function removeRule(i) {
    const updated = customRules.filter((_, idx) => idx !== i)
    await saveCustomRules(db, updated)
    setCustomRules(updated)
  }

  function formatSynced(iso) {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 20px 100px' }}>

      {/* ── Monthly budgets ── */}
      <Section title="Monthly Budgets" icon="💰">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          Set spending limits per category. You'll be alerted at 80% and 100%.
        </div>
        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{cat.emoji}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, flex: 1 }}>{cat.label}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="No limit"
              value={editingBudget[cat.id] || ''}
              onChange={e => setEditingBudget(p => ({ ...p, [cat.id]: e.target.value }))}
              onBlur={() => saveBudget(cat.id)}
              style={{
                width: 100,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
                color: 'var(--text-primary)',
                fontSize: 13,
                textAlign: 'right',
              }}
            />
          </div>
        ))}
      </Section>

      {/* ── Google Drive ── */}
      <Section title="Google Drive Backup" icon="☁️">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          Back up your expenses to Google Drive. Sign-in is optional — the app works fully offline without it.
        </div>

        {!clientId ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 10, lineHeight: 1.5 }}>
              To use Drive backup, enter your Google OAuth Client ID. Create one free at{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener" style={{ color: 'var(--accent-light)' }}>
                console.cloud.google.com
              </a>.
            </div>
            <input
              type="text"
              placeholder="Google OAuth Client ID"
              value={clientIdInput}
              onChange={e => setClientIdInput(e.target.value)}
              style={{ ...inputSt, marginBottom: 8 }}
            />
            <button onClick={handleSaveClientId} style={saveBtnSt}>Save Client ID</button>
          </>
        ) : !driveSignedIn ? (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Client ID configured. Sign in with Google to enable backup.
            </div>
            <button onClick={handleDriveSignIn} disabled={driveLoading} style={primarySmallBtn}>
              {driveLoading ? 'Signing in…' : '🔑 Sign in with Google'}
            </button>
            <button
              onClick={() => { setClientId(''); setClientIdState(''); setClientIdInput('') }}
              style={{ ...ghostBtn, marginTop: 8, fontSize: 11 }}
            >
              Change Client ID
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>Signed in to Google Drive</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Last synced: {formatSynced(lastSynced)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button onClick={handleBackup} disabled={driveLoading} style={{ ...primarySmallBtn, flex: 1 }}>
                {driveLoading ? '…' : '⬆️ Backup Now'}
              </button>
              <button onClick={handleRestore} disabled={driveLoading} style={{ ...secondarySmallBtn, flex: 1 }}>
                {driveLoading ? '…' : '⬇️ Restore'}
              </button>
            </div>
            <button onClick={handleDriveSignOut} style={ghostBtn}>Sign out</button>
          </>
        )}
      </Section>

      {/* ── Auto-categorisation rules ── */}
      <Section title="Auto-Categorisation Rules" icon="🤖">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          When you type a description, xTrack guesses the category. Add your own keyword rules here.
        </div>

        {customRules.length > 0 && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customRules.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, fontWeight: 500 }}>
                  "{r.keyword}" → {CATEGORIES.find(c => c.id === r.category)?.emoji} {r.category}
                </span>
                <button onClick={() => removeRule(i)} style={{ background: 'none', color: 'var(--danger)', fontSize: 16, lineHeight: 1, padding: 4 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            type="text"
            placeholder='Keyword (e.g. "Shoprite")'
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomRule()}
            style={{ ...inputSt, flex: 1 }}
          />
          <select
            value={newRuleCat}
            onChange={e => setNewRuleCat(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13, colorScheme: 'dark' }}
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
        <button onClick={addCustomRule} style={saveBtnSt}>Add Rule</button>
      </Section>

      {/* ── Danger zone ── */}
      <Section title="Danger Zone" icon="⚠️">
        {!showClearConfirm ? (
          <button onClick={() => setShowClearConfirm(true)} style={{
            width: '100%', padding: '12px', borderRadius: 8,
            background: 'transparent', color: 'var(--danger)', fontWeight: 600, fontSize: 14,
            border: '1px solid var(--danger)44',
          }}>
            Clear all data
          </button>
        ) : (
          <div style={{ background: 'var(--danger)11', border: '1px solid var(--danger)44', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>
              This will permanently delete all expenses and budgets. Are you sure?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleClearAll} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                Yes, clear everything
              </button>
              <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h2>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px' }}>
        {children}
      </div>
    </div>
  )
}

const inputSt = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  color: 'var(--text-primary)',
  fontSize: 13,
  width: '100%',
}

const saveBtnSt = {
  width: '100%', padding: '10px', borderRadius: 8,
  background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13,
}

const primarySmallBtn = {
  width: '100%', padding: '11px', borderRadius: 8,
  background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
  color: '#fff', fontWeight: 700, fontSize: 13, border: 'none',
}

const secondarySmallBtn = {
  width: '100%', padding: '11px', borderRadius: 8,
  background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
  border: '1px solid var(--border)',
}

const ghostBtn = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  fontSize: 12, fontWeight: 600, padding: '4px 0', width: '100%', textAlign: 'left',
}
