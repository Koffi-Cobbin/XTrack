import Dexie from 'dexie'

export const db = new Dexie('xtrack')

db.version(1).stores({
  expenses: '++id, date, category, currency, createdAt',
  budgets: '++id, categoryId',
  syncQueue: '++id, timestamp, operation',
  receiptImages: '++id, expenseId',
  settings: 'key',
})

export async function getSetting(key, defaultValue = null) {
  const record = await db.settings.get(key)
  return record ? record.value : defaultValue
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}
