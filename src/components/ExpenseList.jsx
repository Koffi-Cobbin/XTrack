import { useState, useMemo } from 'react'
import { useExpenses } from '../hooks/useExpenses.js'
import { CATEGORIES, getCategoryById, getCurrencyByCode } from '../lib/categories.js'
import { exportToCSV, exportToXLS } from '../lib/export.js'

function groupByMonth(expenses) {
  const groups = {}
  for (const e of expenses || []) {
    const month = (e.date || '').slice(0, 7)
    if (!groups[month]) groups[month] = []
    groups[month].push(e)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatMonth(monthStr) {
  if (!monthStr) return ''
  const d = new Date(monthStr + '-01T00:00:00')
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function ExpenseList({ onOpenDetail, onOpenAdd, showToast }) {
  const [category, setCategory] = useState('all')
  const [month, setMonth] = useState('')
  const [search, setSearch] = useState('')
  const [sortNewest, setSortNewest] = useState(true)

  const expenses = useExpenses({ category, month, search })
  const sorted = useMemo(() => {
    if (!expenses) return []
    return sortNewest ? [...expenses] : [...expenses].reverse()
  }, [expenses, sortNewest])

  const grouped = useMemo(() => groupByMonth(sorted), [sorted])
  const total = useMemo(() => sorted.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0), [sorted])

  function handleExportCSV() {
    if (!sorted.length) { showToast('No expenses to export', 'warning'); return }
    exportToCSV(sorted)
    showToast('CSV downloaded')
  }

  function handleExportXLS() {
    if (!sorted.length) { showToast('No expenses to export', 'warning'); return }
    exportToXLS(sorted)
    showToast('Excel file downloaded')
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 20px 100px' }}>
      {/* Summary card */}
      <div style={{
        background: 'linear-gradient(135deg, #6c63ff22, #4a44b522)',
        border: '1px solid #6c63ff44',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {sorted.length} expense{sorted.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleExportXLS} style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
            }}>XLS</button>
            <button onClick={handleExportCSV} style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 600,
            }}>CSV</button>
          </div>
        </div>
      </div>

      {/* Search + sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{
          flex: 1,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px 0', fontSize: 13, background: 'transparent', color: 'var(--text-primary)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
        <button
          onClick={() => setSortNewest(p => !p)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0 12px',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {sortNewest ? '↓ Newest' : '↑ Oldest'}
        </button>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }}>
        {[{ id: 'all', label: 'All', emoji: '✨' }, ...CATEGORIES].map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: category === cat.id ? 'var(--accent)' : 'var(--bg-card)',
              color: category === cat.id ? '#fff' : 'var(--text-secondary)',
              border: category === cat.id ? '1px solid var(--accent)' : '1px solid var(--border)',
              transition: 'all 0.15s',
            }}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Month filter */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: 13,
            color: month ? 'var(--text-primary)' : 'var(--text-muted)',
            width: '100%',
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Expense groups */}
      {!sorted.length ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💸</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-secondary)' }}>No expenses yet</div>
          <div style={{ fontSize: 13 }}>Tap the + button to log your first expense</div>
        </div>
      ) : (
        grouped.map(([monthKey, items]) => (
          <div key={monthKey} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {formatMonth(monthKey)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(expense => (
                <ExpenseRow key={expense.id} expense={expense} onClick={() => onOpenDetail(expense.id)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ExpenseRow({ expense, onClick }) {
  const cat = getCategoryById(expense.category)
  const curr = getCurrencyByCode(expense.currency)

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        textAlign: 'left',
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius-sm)',
        background: cat.color + '22',
        border: `1px solid ${cat.color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}>
        {cat.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {expense.description}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
          <span>{formatDate(expense.date)}</span>
          <span>·</span>
          <span>{cat.label}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
          {curr.symbol}{parseFloat(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{expense.currency}</div>
      </div>
    </button>
  )
}
