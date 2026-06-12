import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'

export function useExpenses(filters = {}) {
  const { category, month, search } = filters

  return useLiveQuery(async () => {
    let query = db.expenses.orderBy('date').reverse()
    let results = await query.toArray()

    if (category && category !== 'all') {
      results = results.filter(e => e.category === category)
    }
    if (month) {
      results = results.filter(e => e.date && e.date.startsWith(month))
    }
    if (search) {
      const term = search.toLowerCase()
      results = results.filter(e =>
        (e.description || '').toLowerCase().includes(term) ||
        (e.notes || '').toLowerCase().includes(term)
      )
    }

    return results
  }, [category, month, search])
}

export function useExpense(id) {
  return useLiveQuery(() => id ? db.expenses.get(Number(id)) : null, [id])
}

export async function addExpense(data) {
  const now = new Date().toISOString()
  return await db.expenses.add({
    ...data,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
  })
}

export async function updateExpense(id, data) {
  const now = new Date().toISOString()
  return await db.expenses.update(Number(id), { ...data, updatedAt: now })
}

export async function deleteExpense(id) {
  return await db.expenses.delete(Number(id))
}

export async function getAllExpenses() {
  return await db.expenses.orderBy('date').reverse().toArray()
}
