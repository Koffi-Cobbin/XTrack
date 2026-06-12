import { useState } from 'react'
import { useExpense, deleteExpense } from '../hooks/useExpenses.js'
import { getCategoryById, getCurrencyByCode } from '../lib/categories.js'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ExpenseDetail({ expenseId, onBack, onEdit, onDeleted }) {
  const expense = useExpense(expenseId)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!expense) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  const cat = getCategoryById(expense.category)
  const curr = getCurrencyByCode(expense.currency)

  async function handleDelete() {
    setLoading(true)
    await deleteExpense(expenseId)
    onDeleted()
  }

  return (
    <div style={{ padding: '16px 20px 40px' }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          color: 'var(--text-secondary)',
          fontSize: 14,
          marginBottom: 20,
        }}
      >
        ← Back
      </button>

      {/* Gradient header */}
      <div style={{
        background: `linear-gradient(135deg, ${cat.color}22, ${cat.color}11)`,
        border: `1px solid ${cat.color}44`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px 20px',
        marginBottom: 20,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{cat.emoji}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 6 }}>
          {curr.symbol}{parseFloat(expense.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>{expense.description}</div>
      </div>

      {/* Detail rows */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {[
          { label: 'Category', value: `${cat.emoji} ${cat.label}` },
          { label: 'Date', value: formatDate(expense.date) },
          { label: 'Currency', value: `${expense.currency} (${curr.symbol})` },
          { label: 'Added', value: formatDateTime(expense.createdAt) },
          ...(expense.updatedAt !== expense.createdAt ? [{ label: 'Updated', value: formatDateTime(expense.updatedAt) }] : []),
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{row.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {expense.notes && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Notes</div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{expense.notes}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => onEdit(expenseId)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Edit expense
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--danger)',
              fontWeight: 600,
              fontSize: 14,
              border: '1px solid var(--danger)44',
            }}
          >
            Delete expense
          </button>
        ) : (
          <div style={{ background: 'var(--danger)11', border: '1px solid var(--danger)44', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>
              Delete this expense? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 13 }}
              >
                Yes, delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
