export async function runOCR(imageDataUrl) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: () => {},
  })
  const { data } = await worker.recognize(imageDataUrl)
  await worker.terminate()
  return data
}

export function parseOCRResult(data) {
  const text = data.text || ''
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  return {
    amount: extractAmount(text),
    description: extractMerchant(lines),
    date: extractDate(text),
    rawText: text,
  }
}

function extractAmount(text) {
  const patterns = [
    /(?:GHS|₵|cedis?)\s*(\d+[.,]\d{2})/i,
    /(\d+[.,]\d{2})\s*(?:GHS|₵|cedis?)/i,
    /(?:NGN|₦|naira)\s*(\d+[.,]\d{2})/i,
    /(?:USD|\$)\s*(\d+[.,]\d{2})/i,
    /(?:EUR|€)\s*(\d+[.,]\d{2})/i,
    /(?:GBP|£)\s*(\d+[.,]\d{2})/i,
    /TOTAL[:\s]+(\d+[.,]\d{2})/i,
    /AMOUNT[:\s]+(\d+[.,]\d{2})/i,
    /(?:^|\s)(\d{1,6}[.,]\d{2})(?:\s|$)/m,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return parseFloat(m[1].replace(',', '.'))
  }
  return null
}

function extractMerchant(lines) {
  const skipPatterns = /^(\d|receipt|invoice|tax|vat|total|subtotal|amount|date|time|thank|welcome|tel:|tel |phone|address|street|road|avenue|ave\.|lane|http|www\.|@)/i
  for (const line of lines.slice(0, 5)) {
    if (line.length >= 3 && line.length <= 60 && !skipPatterns.test(line) && !/^\d+$/.test(line)) {
      return line.replace(/[^a-zA-Z0-9 '&.,\-]/g, '').trim()
    }
  }
  return null
}

function extractDate(text) {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
  ]
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }

  for (const p of patterns) {
    const m = text.match(p)
    if (!m) continue
    try {
      let year, month, day
      if (p === patterns[0]) {
        day = parseInt(m[1]); month = parseInt(m[2]); year = parseInt(m[3])
      } else if (p === patterns[1]) {
        year = parseInt(m[1]); month = parseInt(m[2]); day = parseInt(m[3])
      } else if (p === patterns[2]) {
        day = parseInt(m[1]); month = months[m[2].toLowerCase().slice(0,3)]; year = parseInt(m[3])
      } else {
        month = months[m[1].toLowerCase().slice(0,3)]; day = parseInt(m[2]); year = parseInt(m[3])
      }
      if (year >= 2000 && year <= 2099 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      }
    } catch {}
  }
  return null
}
