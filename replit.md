# xTrack — Expense Tracker PWA

A lightweight, offline-first Progressive Web App for personal and small-business expense tracking.

## Tech Stack

- **Framework:** React 18 with functional components and hooks
- **Build Tool:** Vite 5 with vite-plugin-pwa
- **Database:** IndexedDB via Dexie.js (offline-first)
- **Charts:** Recharts
- **Export:** Native XML SpreadsheetML (XLS) and CSV
- **Styling:** CSS variables + inline styles

## Features (Phase 1)

- Add, edit, delete, view expenses
- 8 built-in categories with emoji icons
- Multi-currency support: GHS, NGN, USD, EUR, GBP
- IndexedDB persistence (works fully offline)
- Full-text search + category filter + month filter
- Month-grouped list with subtotals
- Export to Excel (.xls) and CSV
- Stats tab: category breakdown bars + month-on-month comparison
- Online/offline status indicator with toast notifications
- PWA installable to home screen

## Development

```bash
npm run dev    # Start dev server on port 5000
npm run build  # Production build
```

## User Preferences

- Target: mobile-first PWA, primary market is West Africa (Ghana/Nigeria)
- Default currency: GHS (Ghana Cedi)
- Dark UI theme with purple accent color
