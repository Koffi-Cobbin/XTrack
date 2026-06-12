import { getCategoryById, getCurrencyByCode } from './categories.js'

export function exportToCSV(expenses, filename) {
  const BOM = '\uFEFF'
  const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Notes']
  const rows = expenses.map(e => {
    const cat = getCategoryById(e.category)
    return [
      e.date,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      cat.label,
      e.amount,
      e.currency,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ].join(',')
  })
  const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  rows.push(['', 'TOTAL', '', total.toFixed(2), '', ''].join(','))

  const csv = BOM + [headers.join(','), ...rows].join('\n')
  downloadBlob(csv, filename || `xtrack-${new Date().toISOString().slice(0,7)}.csv`, 'text/csv;charset=utf-8')
}

export function exportToXLS(expenses, filename) {
  const cat = (id) => getCategoryById(id).label
  const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Notes']
  const rows = expenses.map(e => [e.date, e.description, cat(e.category), e.amount, e.currency, e.notes || ''])
  const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  rows.push(['', 'TOTAL', '', total.toFixed(2), '', ''])

  const xmlRows = [headers, ...rows].map(row =>
    '<Row>' + row.map(cell =>
      `<Cell><Data ss:Type="${typeof cell === 'number' ? 'Number' : 'String'}">${String(cell).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`
    ).join('') + '</Row>'
  ).join('\n')

  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Expenses">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`

  downloadBlob(xml, filename || `xtrack-${new Date().toISOString().slice(0,7)}.xls`, 'application/vnd.ms-excel')
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
