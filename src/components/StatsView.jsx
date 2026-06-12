import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db.js'
import { getCategoryById, CATEGORIES } from '../lib/categories.js'
import { exportToCSV, exportToXLS } from '../lib/export.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function thisMonth() {
  return new Date().toISOString().slice(0, 7)
}
function lastMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

export default function StatsView({ showToast }) {
  const allExpenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray(), [])

  const stats = useMemo(() => {
    if (!allExpenses) return null
    const cm = thisMonth()
    const lm = lastMonth()

    const thisMonthExp = allExpenses.filter(e => e.date?.startsWith(cm))
    const lastMonthExp = allExpenses.filter(e => e.date?.startsWith(lm))

    const thisMonthTotal = thisMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const lastMonthTotal = lastMonthExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const allTotal = allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

    const pctChange = lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : null

    const byCategory = CATEGORIES.map(cat => {
      const total = allExpenses.filter(e => e.category === cat.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      return { ...cat, total }
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

    return { thisMonthTotal, lastMonthTotal, allTotal, pctChange, byCategory }
  }, [allExpenses])

  function handleExportCSV() {
    if (!allExpenses?.length) { showToast('No expenses to export', 'warning'); return }
    exportToCSV(allExpenses)
    showToast('CSV downloaded')
  }

  function handleExportXLS() {
    if (!allExpenses?.length) { showToast('No expenses to export', 'warning'); return }
    exportToXLS(allExpenses)
    showToast('Excel file downloaded')
  }

  if (!stats) return <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading…</div>

  const maxCatTotal = stats.byCategory[0]?.total || 1

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px 20px 100px' }}>
      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            This month
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            {stats.thisMonthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {stats.pctChange !== null && (
            <div style={{ fontSize: 12, fontWeight: 600, color: stats.pctChange > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {stats.pctChange > 0 ? '▲' : '▼'} {Math.abs(stats.pctChange).toFixed(1)}% vs last month
            </div>
          )}
          {stats.pctChange === null && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No prior month data</div>
          )}
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            All time
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            {stats.allTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {allExpenses?.length || 0} total expense{allExpenses?.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {stats.byCategory.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            By category
          </h2>

          {/* Bar chart */}
          <div style={{ marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.byCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="emoji"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 16 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                  }}
                  formatter={(value, name, props) => [
                    value.toLocaleString('en-US', { minimumFractionDigits: 2 }),
                    props.payload?.label
                  ]}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {stats.byCategory.map(cat => (
                    <Cell key={cat.id} fill={cat.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {stats.byCategory.map(cat => (
              <div key={cat.id} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>{cat.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {cat.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-primary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(cat.total / maxCatTotal) * 100}%`,
                    background: cat.color,
                    borderRadius: 4,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {((cat.total / stats.allTotal) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
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
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Export all data</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportXLS} style={exportBtnStyle}>
            📊 Export Excel
          </button>
          <button onClick={handleExportCSV} style={exportBtnStyle}>
            📄 Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px',
}

const exportBtnStyle = {
  flex: 1,
  padding: '12px 8px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: 13,
}
