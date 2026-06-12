const DEFAULT_RULES = [
  { keywords: ['kfc','mcdonald','pizza','burger','restaurant','cafe','coffee','food','lunch','dinner','breakfast','snack','eat','meal','chop bar','waakye','jollof','kenkey','fufu','banku','rice','chicken','bread','water','drink','bar','pub'], category: 'food' },
  { keywords: ['taxi','uber','bolt','bus','trotro','tro-tro','fare','fuel','petrol','diesel','transport','ride','car','park','parking','toll','train','metro','lyft','okada','keke'], category: 'transport' },
  { keywords: ['shop','market','mall','store','supermarket','shoprite','melcom','palace','clothes','fashion','shoe','dress','shirt','trousers','bag','accessories','buy','purchase','jumia','amazon'], category: 'shopping' },
  { keywords: ['hospital','pharmacy','clinic','doctor','medicine','drug','health','medical','dentist','optician','lab','test','scan','nurse','treatment','prescription'], category: 'health' },
  { keywords: ['rent','landlord','house','apartment','flat','room','accommodation','lease','mortgage','airbnb','hotel','lodge','hostel'], category: 'housing' },
  { keywords: ['movie','cinema','netflix','hulu','spotify','game','gaming','sport','gym','fitness','club','show','ticket','concert','event','entertainment','dstv','gotv'], category: 'entertainment' },
  { keywords: ['electricity','ecg','light bill','water','internet','wifi','data','mtn','airtel','vodafone','glo','telecel','phone bill','utility','broadband','cable'], category: 'utilities' },
]

export function guessCategory(description) {
  if (!description) return null
  const lower = description.toLowerCase()
  for (const rule of DEFAULT_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.category
    }
  }
  return null
}

export async function getCustomRules(db) {
  try {
    const stored = await db.settings.get('autoCatRules')
    return stored ? stored.value : []
  } catch {
    return []
  }
}

export async function saveCustomRules(db, rules) {
  await db.settings.put({ key: 'autoCatRules', value: rules })
}

export async function guessWithCustomRules(db, description) {
  if (!description) return null
  const custom = await getCustomRules(db)
  const lower = description.toLowerCase()
  for (const rule of custom) {
    if (lower.includes(rule.keyword.toLowerCase())) return rule.category
  }
  return guessCategory(description)
}
