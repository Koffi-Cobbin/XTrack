import { db } from './db.js'

export async function getBudgets() {
  return await db.budgets.toArray()
}

export async function setBudget(categoryId, monthlyLimit, currency = 'GHS') {
  const existing = await db.budgets.where('categoryId').equals(categoryId).first()
  if (existing) {
    await db.budgets.update(existing.id, { monthlyLimit: parseFloat(monthlyLimit), currency })
  } else {
    await db.budgets.add({ categoryId, monthlyLimit: parseFloat(monthlyLimit), currency, alertAt: [80, 100] })
  }
}

export async function deleteBudget(categoryId) {
  const existing = await db.budgets.where('categoryId').equals(categoryId).first()
  if (existing) await db.budgets.delete(existing.id)
}

export async function checkBudgetAlerts(showToast) {
  const budgets = await getBudgets()
  if (!budgets.length) return

  const month = new Date().toISOString().slice(0, 7)
  const expenses = await db.expenses.where('date').startsWith(month).toArray()

  for (const budget of budgets) {
    const spent = expenses
      .filter(e => e.category === budget.categoryId)
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

    const pct = (spent / budget.monthlyLimit) * 100

    const alertKey = `budgetAlert_${budget.categoryId}_${month}`
    const alerted = await db.settings.get(alertKey)
    const alreadyAlerted = alerted?.value || 0

    if (pct >= 100 && alreadyAlerted < 100) {
      showToast(`⚠️ Budget exceeded for ${budget.categoryId}! Spent ${spent.toFixed(2)} of ${budget.monthlyLimit} limit`, 'warning')
      await db.settings.put({ key: alertKey, value: 100 })
    } else if (pct >= 80 && alreadyAlerted < 80) {
      showToast(`⚠️ 80% of ${budget.categoryId} budget used (${spent.toFixed(2)} / ${budget.monthlyLimit})`, 'warning')
      await db.settings.put({ key: alertKey, value: 80 })
    }
  }
}

export async function getMonthSpendByCategory(categoryId) {
  const month = new Date().toISOString().slice(0, 7)
  const expenses = await db.expenses.where('date').startsWith(month).toArray()
  return expenses
    .filter(e => e.category === categoryId)
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
}
