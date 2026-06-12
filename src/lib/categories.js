export const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍽️', color: '#FF6B6B' },
  { id: 'transport', label: 'Transport', emoji: '🚗', color: '#4ECDC4' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#45B7D1' },
  { id: 'health', label: 'Health', emoji: '💊', color: '#96CEB4' },
  { id: 'housing', label: 'Housing', emoji: '🏠', color: '#FFEAA7' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#DDA0DD' },
  { id: 'utilities', label: 'Utilities', emoji: '⚡', color: '#98D8C8' },
  { id: 'other', label: 'Other', emoji: '📦', color: '#B0B0B0' },
]

export const CURRENCIES = [
  { code: 'GHS', symbol: '₵', name: 'Ghana Cedi' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
]

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
}

export function getCurrencyByCode(code) {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0]
}
