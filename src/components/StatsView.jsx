import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { CATEGORIES } from '../lib/categories.js'
import { exportToCSV, exportToXLS } from '../lib/export.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function thisMonth() { return new Date().toISOString().slice(0, 7) }
function lastMonth() {
  const d = new Date(); d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

export default function StatsView({ showToast }) {
  const allExpenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [])
  const budgets = useLiveQuery(() => db.budgets.toArray(), [])

  const stats = useMemo(() => {
    if (!allExpenses) return null
    const cm = thisMonth(), lm = lastMonth()
    const thisMonthExp = allExpenses.filter(e => e.date?.startsWith(cm))
    const lastMonthExp = allExpenses.filter(e => e.date?.startsWith(lm))
    const thisMonthTotal = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const lastMonthTotal = lastMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const allTotal = allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const pctChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : null

    const byCategory = CATEGORIES.map(cat => {
      const total = allExpenses.filter(e => e.category === cat.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      const thisMonth = thisMonthExp.filter(e => e.category === cat.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      return { ...cat, total, thisMonth }
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

    return { thisMonthTotal, lastMonthTotal, allTotal, pctChange, byCategory }
  }, [allExpenses])

  const budgetMap = useMemo(() => {
    if (!budgets) return {}
    return Object.fromEntries(budgets.map(b => [b.categoryId, b]))
  }, [budgets])

  function handleExportCSV() {
    if (!allExpenses?.length) { showToast('No expenses to export', 'warning'); return }
    exportToCSV(allExpenses); showToast('CSV downloaded')
  }

  function handleExportXLS() {
    if (!allExpenses?.length) { showToast('No expenses to export', 'warning'); return }
    exportToXLS(allExpenses); showToast('Excel file downloaded')
  }

  if (!stats) return <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading…</div>

  const maxCatTotal = stats.byCategory[0]?.total || 1

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 20px 100px' }}>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={cardSt}>
          <div style={labelSt}>This month</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            {stats.thisMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {stats.pctChange !== null ? (
            <div style={{ fontSize: 12, fontWeight: 600, color: stats.pctChange > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {stats.pctChange > 0 ? '▲' : '▼'} {Math.abs(stats.pctChange).toFixed(1)}% vs last month
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No prior month data</div>
          )}
        </div>
        <div style={cardSt}>
          <div style={labelSt}>All time</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            {stats.allTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {allExpenses?.length || 0} total expense{allExpenses?.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Budget overview — only shown when budgets exist */}
      {budgets && budgets.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={sectionHeading}>This month's budgets</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {budgets.map(budget => {
              const cat = CATEGORIES.find(c => c.id === budget.categoryId)
              if (!cat) return null
              const spent = stats.byCategory.find(c => c.id === budget.categoryId)?.thisMonth || 0
              const pct = Math.min((spent / budget.monthlyLimit) * 100, 100)
              const over = spent > budget.monthlyLimit
              const color = over ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)'
              return (
                <div key={budget.categoryId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{cat.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>
                      {spent.toFixed(2)} / {budget.monthlyLimit.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                  {over && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, fontWeight: 600 }}>
                      ⚠️ Over budget by {(spent - budget.monthlyLimit).toFixed(2)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {stats.byCategory.length > 0 ? (
        <div>
          <h2 style={sectionHeading}>By category — all time</h2>
          <div style={{ marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.byCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="emoji" tick={{ fill: 'var(--text-secondary)', fontSize: 16 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                  formatter={(value, name, props) => [value.toLocaleString('en-US', { minimumFractionDigits: 2 }), props.payload?.label]}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {stats.byCategory.map(cat => <Cell key={cat.id} fill={cat.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {stats.byCategory.map(cat => {
              const budget = budgetMap[cat.id]
              const thisMoPct = budget ? Math.min((cat.thisMonth / budget.monthlyLimit) * 100, 100) : null
              return (
                <div key={cat.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>{cat.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {cat.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(cat.total / maxCatTotal) * 100}%`, background: cat.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {((cat.total / stats.allTotal) * 100).toFixed(1)}% of total
                    </span>
                    {budget && thisMoPct !== null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: thisMoPct >= 100 ? 'var(--danger)' : thisMoPct >= 80 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {thisMoPct.toFixed(0)}% of budget this month
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8 }}>No data yet</div>
          <div style={{ fontSize: 13 }}>Add some expenses to see your stats</div>
        </div>
      )}

      {/* Export */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px' }}>
        <div style={{ ...labelSt, marginBottom: 12 }}>Export all data</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportXLS} style={exportBtnSt}>📊 Export Excel</button>
          <button onClick={handleExportCSV} style={exportBtnSt}>📄 Export CSV</button>
        </div>
      </div>
    </div>
  )
}

const cardSt = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }
const labelSt = { fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }
const sectionHeading = { fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }
const exportBtnSt = { flex: 1, padding: '12px 8px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }
