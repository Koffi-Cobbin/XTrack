import { useState, useEffect, useRef } from 'react'
import { useExpense, addExpense, updateExpense, deleteExpense } from '../hooks/useExpenses.js'
import { CATEGORIES, CURRENCIES, getCategoryById } from '../lib/categories.js'
import { db, getSetting, setSetting } from '../lib/db.js'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpenseForm({ editingId, onBack, onSaved, showToast }) {
  const existing = useExpense(editingId)
  const isEdit = !!editingId

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GHS')
  const [date, setDate] = useState(today())
  const [category, setCategory] = useState('food')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [recentMerchants, setRecentMerchants] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const descRef = useRef(null)

  useEffect(() => {
    if (existing) {
      setDescription(existing.description || '')
      setAmount(String(existing.amount || ''))
      setCurrency(existing.currency || 'GHS')
      setDate(existing.date || today())
      setCategory(existing.category || 'food')
      setNotes(existing.notes || '')
    }
  }, [existing])

  useEffect(() => {
    if (!isEdit) {
      getSetting('lastCurrency', 'GHS').then(setCurrency)
      getSetting('lastCategory', 'food').then(setCategory)
      setTimeout(() => descRef.current?.focus(), 100)
    }
    loadRecentMerchants()
  }, [isEdit])

  async function loadRecentMerchants() {
    const all = await db.expenses.orderBy('createdAt').reverse().limit(50).toArray()
    const seen = new Set()
    const merchants = []
    for (const e of all) {
      if (e.description && !seen.has(e.description)) {
        seen.add(e.description)
        merchants.push(e.description)
      }
      if (merchants.length >= 10) break
    }
    setRecentMerchants(merchants)
  }

  const filteredSuggestions = description.length > 0
    ? recentMerchants.filter(m => m.toLowerCase().includes(description.toLowerCase()) && m !== description).slice(0, 5)
    : []

  function validate() {
    const errs = {}
    if (!description.trim()) errs.description = 'Description is required'
    else if (description.length > 120) errs.description = 'Max 120 characters'
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) errs.amount = 'Enter a valid amount greater than 0'
    if (!date) errs.date = 'Date is required'
    else {
      const d = new Date(date)
      const maxFuture = new Date()
      maxFuture.setDate(maxFuture.getDate() + 365)
      if (d > maxFuture) errs.date = 'Date cannot be more than 365 days in the future'
    }
    if (!category) errs.category = 'Select a category'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const data = {
        description: description.trim(),
        amount: parseFloat(amount),
        currency,
        date,
        category,
        notes: notes.trim(),
        tags: [],
        isRecurring: false,
        recurringPeriod: null,
        splitWith: [],
      }
      if (isEdit) {
        await updateExpense(editingId, data)
        onSaved('Expense updated')
      } else {
        await addExpense(data)
        await setSetting('lastCurrency', currency)
        await setSetting('lastCategory', category)
        onSaved('Expense added')
      }
    } catch (err) {
      showToast('Failed to save expense', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteExpense(editingId)
      onSaved('Expense deleted')
    } catch {
      showToast('Failed to delete', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '16px 20px 40px' }}>
      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 14 }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {isEdit ? 'Edit expense' : 'New expense'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Description */}
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>Description</label>
          <input
            ref={descRef}
            type="text"
            value={description}
            onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: null })) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="e.g. Lunch at KFC"
            maxLength={120}
            style={inputStyle(errors.description)}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 50,
              overflow: 'hidden',
            }}>
              {filteredSuggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setDescription(s); setShowSuggestions(false) }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'left',
                    background: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {errors.description && <div style={errorStyle}>{errors.description}</div>}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{description.length}/120</div>
        </div>

        {/* Amount + Currency */}
        <div>
          <label style={labelStyle}>Amount</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
                colorScheme: 'dark',
              }}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: null })) }}
              placeholder="0.00"
              style={{ ...inputStyle(errors.amount), flex: 1 }}
            />
          </div>
          {errors.amount && <div style={errorStyle}>{errors.amount}</div>}
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setErrors(p => ({ ...p, date: null })) }}
            style={{ ...inputStyle(errors.date), colorScheme: 'dark' }}
          />
          {errors.date && <div style={errorStyle}>{errors.date}</div>}
        </div>

        {/* Category grid */}
        <div>
          <label style={labelStyle}>Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setCategory(cat.id); setErrors(p => ({ ...p, category: null })) }}
                style={{
                  padding: '12px 4px',
                  borderRadius: 'var(--radius-md)',
                  background: category === cat.id ? cat.color + '33' : 'var(--bg-card)',
                  border: category === cat.id ? `2px solid ${cat.color}` : '2px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: category === cat.id ? cat.color : 'var(--text-muted)' }}>{cat.label}</span>
              </button>
            ))}
          </div>
          {errors.category && <div style={errorStyle}>{errors.category}</div>}
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes..."
            rows={2}
            style={{
              ...inputStyle(),
              resize: 'none',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Actions */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            boxShadow: '0 4px 16px rgba(108,99,255,0.3)',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </button>

        <button
          type="button"
          onClick={onBack}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 14,
            border: '1px solid var(--border)',
          }}
        >
          Cancel
        </button>

        {isEdit && !showDeleteConfirm && (
          <button
            type="button"
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
            Delete this expense
          </button>
        )}

        {showDeleteConfirm && (
          <div style={{ background: 'var(--danger)11', border: '1px solid var(--danger)44', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>
              Delete this expense? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 13 }}
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 8,
}

const inputStyle = (error) => ({
  width: '100%',
  background: 'var(--bg-card)',
  border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
  borderRadius: 'var(--radius-md)',
  padding: '12px 14px',
  color: 'var(--text-primary)',
  fontSize: 14,
  transition: 'border-color 0.15s',
})

const errorStyle = {
  fontSize: 12,
  color: 'var(--danger)',
  marginTop: 6,
  fontWeight: 500,
}
