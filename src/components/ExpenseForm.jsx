import { useState, useEffect, useRef } from 'react'
import { useExpense, addExpense, updateExpense, deleteExpense } from '../hooks/useExpenses.js'
import { CATEGORIES, CURRENCIES } from '../lib/categories.js'
import { db, getSetting, setSetting } from '../lib/db.js'
import { guessWithCustomRules } from '../lib/autocat.js'
import { checkBudgetAlerts } from '../lib/budgets.js'
import ReceiptCapture from './ReceiptCapture.jsx'

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
  const [receiptImage, setReceiptImage] = useState(null)
  const [showCapture, setShowCapture] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [recentMerchants, setRecentMerchants] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [categoryManuallySet, setCategoryManuallySet] = useState(false)

  const descRef = useRef(null)

  useEffect(() => {
    if (existing) {
      setDescription(existing.description || '')
      setAmount(String(existing.amount || ''))
      setCurrency(existing.currency || 'GHS')
      setDate(existing.date || today())
      setCategory(existing.category || 'food')
      setNotes(existing.notes || '')
      setCategoryManuallySet(true)
      if (existing.receiptImageId) {
        db.receiptImages.where('expenseId').equals(existing.receiptImageId).first()
          .then(r => { if (r) setReceiptImage(r.image) })
      }
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

  useEffect(() => {
    if (!categoryManuallySet && description.length >= 3) {
      guessWithCustomRules(db, description).then(guess => {
        if (guess) setCategory(guess)
      })
    }
  }, [description, categoryManuallySet])

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
      const maxFuture = new Date(); maxFuture.setDate(maxFuture.getDate() + 365)
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
      const receiptImageId = receiptImage ? `receipt_${Date.now()}` : (existing?.receiptImageId || null)
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
        receiptImageId,
      }
      if (isEdit) {
        await updateExpense(editingId, data)
        if (receiptImage && receiptImageId) {
          const exists = await db.receiptImages.where('expenseId').equals(receiptImageId).first()
          if (!exists) await db.receiptImages.add({ expenseId: receiptImageId, image: receiptImage, createdAt: new Date().toISOString() })
          else await db.receiptImages.where('expenseId').equals(receiptImageId).modify({ image: receiptImage })
        }
        onSaved('Expense updated')
      } else {
        await addExpense(data)
        await setSetting('lastCurrency', currency)
        await setSetting('lastCategory', category)
        if (receiptImage && receiptImageId) {
          await db.receiptImages.add({ expenseId: receiptImageId, image: receiptImage, createdAt: new Date().toISOString() })
        }
        checkBudgetAlerts(showToast)
        onSaved('Expense added')
      }
    } catch {
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={backBtnSt}>← Back</button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
          {isEdit ? 'Edit expense' : 'New expense'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Description */}
        <div style={{ position: 'relative' }}>
          <label style={labelSt}>Description</label>
          <input
            ref={descRef}
            type="text"
            value={description}
            onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: null })) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="e.g. Lunch at KFC"
            maxLength={120}
            style={inputSt(errors.description)}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 50, overflow: 'hidden',
            }}>
              {filteredSuggestions.map(s => (
                <button key={s} type="button" onClick={() => { setDescription(s); setShowSuggestions(false) }}
                  style={{ width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', color: 'var(--text-primary)', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {errors.description && <div style={errorSt}>{errors.description}</div>}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{description.length}/120</div>
        </div>

        {/* Amount + Currency */}
        <div>
          <label style={labelSt}>Amount</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={selectSt}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
            </select>
            <input
              type="number" inputMode="decimal" step="0.01" min="0.01"
              value={amount}
              onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: null })) }}
              placeholder="0.00"
              style={{ ...inputSt(errors.amount), flex: 1 }}
            />
          </div>
          {errors.amount && <div style={errorSt}>{errors.amount}</div>}
        </div>

        {/* Date */}
        <div>
          <label style={labelSt}>Date</label>
          <input
            type="date" value={date}
            onChange={e => { setDate(e.target.value); setErrors(p => ({ ...p, date: null })) }}
            style={{ ...inputSt(errors.date), colorScheme: 'dark' }}
          />
          {errors.date && <div style={errorSt}>{errors.date}</div>}
        </div>

        {/* Category grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...labelSt, marginBottom: 0 }}>Category</label>
            {!categoryManuallySet && (
              <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 500 }}>🤖 auto</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} type="button"
                onClick={() => { setCategory(cat.id); setCategoryManuallySet(true); setErrors(p => ({ ...p, category: null })) }}
                style={{
                  padding: '12px 4px', borderRadius: 'var(--radius-md)',
                  background: category === cat.id ? cat.color + '33' : 'var(--bg-card)',
                  border: category === cat.id ? `2px solid ${cat.color}` : '2px solid var(--border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: category === cat.id ? cat.color : 'var(--text-muted)' }}>{cat.label}</span>
              </button>
            ))}
          </div>
          {errors.category && <div style={errorSt}>{errors.category}</div>}
        </div>

        {/* Notes */}
        <div>
          <label style={labelSt}>Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes..."
            rows={2}
            style={{ ...inputSt(), resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Receipt photo */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...labelSt, marginBottom: 0 }}>Receipt photo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          </div>

          {receiptImage ? (
            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
              <img
                src={receiptImage}
                alt="Receipt"
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)', display: 'block' }}
              />
              <button
                type="button"
                onClick={() => setReceiptImage(null)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  borderRadius: '50%', width: 28, height: 28,
                  fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => setShowCapture(true)}
                style={{
                  position: 'absolute', bottom: 8, right: 8,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  borderRadius: 8, padding: '5px 10px',
                  fontSize: 12, fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCapture(true)}
              style={{
                width: '100%', padding: '16px',
                borderRadius: 12, border: '1.5px dashed var(--border)',
                background: 'var(--bg-card)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Add receipt photo</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Camera or gallery</span>
            </button>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
          color: '#fff', fontWeight: 700, fontSize: 15,
          boxShadow: '0 4px 16px rgba(245,166,35,0.3)',
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </button>

        <button type="button" onClick={onBack} style={{
          width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
          background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14,
          border: '1px solid var(--border)',
        }}>
          Cancel
        </button>

        {isEdit && !showDeleteConfirm && (
          <button type="button" onClick={() => setShowDeleteConfirm(true)} style={{
            width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
            background: 'transparent', color: 'var(--danger)', fontWeight: 600, fontSize: 14,
            border: '1px solid var(--danger)44',
          }}>
            Delete this expense
          </button>
        )}

        {showDeleteConfirm && (
          <div style={{ background: 'var(--danger)11', border: '1px solid var(--danger)44', borderRadius: 'var(--radius-md)', padding: 16 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, fontSize: 14 }}>
              Delete this expense? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={handleDelete} disabled={loading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                Yes, delete
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>

      {showCapture && (
        <ReceiptCapture
          onResult={img => { setReceiptImage(img); setShowCapture(false) }}
          onCancel={() => setShowCapture(false)}
        />
      )}
    </div>
  )
}

const backBtnSt = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 14 }
const labelSt = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }
const inputSt = (error) => ({ width: '100%', background: 'var(--bg-card)', border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: '12px 14px', color: 'var(--text-primary)', fontSize: 14, transition: 'border-color 0.15s' })
const selectSt = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, flexShrink: 0, colorScheme: 'dark' }
const errorSt = { fontSize: 12, color: 'var(--danger)', marginTop: 6, fontWeight: 500 }
