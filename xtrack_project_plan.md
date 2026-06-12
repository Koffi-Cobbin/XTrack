# xTrack — Expense Tracker PWA: Full Project Plan

> A lightweight, offline-first Progressive Web App for personal and small-business expense tracking, built for speed and minimal friction.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Goals and principles](#2-goals-and-principles)
3. [Target users](#3-target-users)
4. [Feature set](#4-feature-set)
5. [UX principles](#5-ux-principles)
6. [Technical architecture](#6-technical-architecture)
7. [Build phases](#7-build-phases)
8. [Screen-by-screen specification](#8-screen-by-screen-specification)
9. [Data model](#9-data-model)
10. [Offline strategy](#10-offline-strategy)
11. [Receipt capture and OCR flow](#11-receipt-capture-and-ocr-flow)
12. [Google Drive integration](#12-google-drive-integration)
13. [Export capabilities](#13-export-capabilities)
14. [Notifications and alerts](#14-notifications-and-alerts)
15. [Security and privacy](#15-security-and-privacy)
16. [Testing strategy](#16-testing-strategy)
17. [Deployment](#17-deployment)
18. [Future roadmap](#18-future-roadmap)

---

## 1. Project overview

**xTrack** is a Progressive Web App (PWA) that lets individuals and small teams capture, categorise, and analyse expenses with the fewest taps possible. It works fully offline, syncs automatically to Google Drive, can extract expense data from receipt photos using on-device OCR, and exports clean Excel/CSV reports.

The app is designed to be installable on Android and iOS home screens, giving it a native-app feel without requiring app store distribution. All core functionality is available without an internet connection.

---

## 2. Goals and principles

### Primary goals

- **Minimum clicks to log an expense** — a new expense entry should require no more than 3 taps in the common case.
- **Works offline, always** — the app must be fully usable with no network connection and sync silently when connectivity returns.
- **Data portability** — users own their data; export to Excel or CSV at any time with one tap.
- **Receipt digitisation** — point camera at a paper receipt and have the app pre-fill the amount, merchant, and date automatically.
- **Cloud backup** — automatic backup to Google Drive so data is never lost when switching devices.

### Design principles

- Flat, clean interface with generous whitespace — no clutter, no onboarding friction.
- Smart defaults everywhere — today's date, last-used category, last-used currency are always pre-selected.
- Errors must be actionable — every validation message tells the user exactly what to fix.
- Offline-first, not offline-capable — the offline state is the default, not a fallback.
- No account required to start — local-only use must be fully functional without sign-in.

---

## 3. Target users

| Persona | Description | Primary use case |
|---|---|---|
| **Individual tracker** | Salaried employee tracking personal spending | Daily expense logging, monthly budget review |
| **Freelancer** | Self-employed professional tracking billable costs | Client-tagged expenses, Excel export for invoicing |
| **Small business owner** | Running a micro-business or side hustle | Category-based reporting, Drive backup for accountant |
| **Traveller** | Frequent travel across currencies | Multi-currency logging, receipt photo capture |
| **Student** | Budget-conscious, mobile-first | Quick daily logging, monthly summary |

**Primary platform:** Android and iOS mobile browsers, installed as a PWA. Desktop browser is supported but not the primary target.

**Primary region:** West Africa (Ghana-first), with multi-currency support for USD, EUR, GBP, NGN, and GHS.

---

## 4. Feature set

### 4.1 Core features (Phase 1)

| Feature | Description | Technology |
|---|---|---|
| Expense CRUD | Add, view, edit, delete expenses | React state + IndexedDB |
| Category tagging | 8 built-in categories with icons | Local config |
| Multi-currency | Log in GHS, USD, EUR, GBP, NGN | Currency picker |
| Offline support | Full functionality with no network | Service Worker + IndexedDB via Dexie.js |
| Search and filter | Full-text search, filter by category and month | In-memory filtering |
| Sort and group | Month-grouped list, newest/oldest toggle | In-memory sort |
| Export to Excel | Download .xls file of filtered or all expenses | XML SpreadsheetML |
| Export to CSV | Download .csv for any spreadsheet tool | Blob + anchor |
| Stats dashboard | Category breakdown bars, month-on-month comparison | Computed from local data |
| Install prompt | PWA installable to home screen | Web App Manifest |

### 4.2 Phase 2 features

| Feature | Description | Technology |
|---|---|---|
| Receipt capture | Camera access to photograph receipts | MediaDevices Camera API |
| OCR extraction | Auto-extract amount, merchant, date from receipt photo | Tesseract.js (on-device) |
| Google Drive backup | Auto-sync data JSON and receipt images to Drive | Google Drive API v3 |
| Device restore | Restore full data from Drive backup on new device | Google Drive API v3 |
| Budget alerts | Push notification when category spend hits 80% or 100% of budget | Web Push API |
| Auto-categorisation | Merchant name mapped to category automatically; user corrections remembered | Local rules engine |

### 4.3 Phase 3 features

| Feature | Description | Technology |
|---|---|---|
| Voice entry | Speak "Coffee 4.50 GHS today" to log an expense | Web Speech API |
| Recurring expenses | Mark subscriptions as recurring; auto-log monthly | Scheduled sync |
| Expense splitting | Tag expense as shared; track who owes what | Ledger logic |
| Multi-currency conversion | Convert all amounts to home currency for totals | Exchange rate API |
| Trend analytics | 6-month spending trend line, anomaly alerts | Recharts or D3 |
| Notes and tags | Free-text notes and custom hashtag tags per expense | Full-text index |

---

## 5. UX principles

### Minimum-click flows

**Add an expense (target: 3 taps)**

1. Tap the floating + button
2. Type description and amount (description field auto-focused)
3. Tap "Add expense"

Smart defaults handle date (today), category (last used), and currency (last used). The user only intervenes when something differs from the default.

**Capture a receipt (target: 2 taps)**

1. Tap the camera icon on the add screen
2. Snap the photo — OCR fills in amount, merchant, date automatically
3. Confirm (or adjust any field that OCR got wrong) and save

### Global UX rules

- The floating action button (+) is always visible on list and stats screens.
- Recent merchants appear first in the description field as autocomplete suggestions.
- Swipe left on any expense row to reveal a delete action.
- Swipe right on any expense row to duplicate the expense with today's date.
- The category picker uses a 4-column emoji grid, not a dropdown — faster to tap.
- Date defaults to today; tapping the date field opens the native date picker.
- The keyboard is dismissed by tapping outside any input, or by pulling down on the form sheet.
- Empty states are never blank — they tell the user exactly what to do next.
- Every destructive action (delete) requires a single confirmation modal with a clear cancel path.
- Toast notifications confirm every successful action and every error in 3 seconds.

---

## 6. Technical architecture

### Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 (functional components, hooks) | Component model fits the CRUD views; large ecosystem |
| Styling | Inline styles + CSS variables | No build-step dependency; works in artifact sandbox |
| Local database | IndexedDB via Dexie.js | Structured, async, works offline; far more robust than localStorage |
| Service worker | Workbox (GenerateSW strategy) | Handles caching, background sync, and push with minimal boilerplate |
| OCR | Tesseract.js (WASM, on-device) | No server required; receipt text stays on device |
| Excel export | SheetJS (xlsx) | Generates proper .xlsx binary; widely supported |
| Drive sync | Google Drive REST API v3 | File upload/download; OAuth 2.0 via Google Identity Services |
| Push notifications | Web Push API + VAPID | Standard PWA push; works on Android Chrome |
| Charts | Recharts | Lightweight, React-native, declarative |
| Build tool | Vite | Fast dev server; PWA plugin for manifest + service worker generation |
| Hosting | Vercel or Netlify | Zero-config static deploy; HTTPS required for PWA and camera access |

### Directory structure

```
xtrack/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── icons/                 # App icons (192x192, 512x512, maskable)
│   └── sw.js                  # Service worker (generated by Workbox)
├── src/
│   ├── components/
│   │   ├── ExpenseList.jsx
│   │   ├── ExpenseForm.jsx
│   │   ├── ExpenseDetail.jsx
│   │   ├── StatsView.jsx
│   │   ├── ReceiptCapture.jsx
│   │   ├── BudgetAlert.jsx
│   │   └── SplitView.jsx
│   ├── hooks/
│   │   ├── useExpenses.js     # CRUD operations against IndexedDB
│   │   ├── useSync.js         # Google Drive sync logic
│   │   ├── useOCR.js          # Tesseract.js wrapper
│   │   └── useOffline.js      # Online/offline event listener
│   ├── lib/
│   │   ├── db.js              # Dexie schema and migrations
│   │   ├── export.js          # Excel and CSV export helpers
│   │   ├── drive.js           # Drive API calls
│   │   ├── ocr.js             # Receipt OCR parsing
│   │   └── categories.js      # Category config and rules engine
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js
└── package.json
```

### Data flow

```
User action
    │
    ▼
React component (optimistic UI update)
    │
    ▼
useExpenses hook
    │
    ├──▶ IndexedDB (Dexie) — always written first
    │
    └──▶ Sync queue (if online) ──▶ Google Drive API
                                         │
                                    (on reconnect, flush queue)
```

All writes go to IndexedDB first. The app never waits for a network call to update the UI. A background sync queue flushes to Google Drive when connectivity is available.

---

## 7. Build phases

### Phase 1 — Foundation (weeks 1–3)

**Goal:** A fully usable offline expense tracker with local storage, category filtering, and export.

- [ ] PWA shell with manifest and service worker
- [ ] Add / edit / delete / view expenses
- [ ] 8 built-in categories with emoji icons
- [ ] Multi-currency support (GHS, USD, EUR, GBP, NGN)
- [ ] IndexedDB persistence via Dexie.js
- [ ] Full-text search and category filter
- [ ] Month-grouped list with subtotals
- [ ] Export to Excel (.xls) and CSV
- [ ] Stats tab: category breakdown bars, month-on-month comparison
- [ ] Online/offline status indicator with toast feedback
- [ ] Install to home screen prompt

**Deliverable:** Working app at `https://xtrack.app` or equivalent, installable on Android and iOS.

---

### Phase 2 — Capture and sync (weeks 4–6)

**Goal:** Add receipt camera capture, OCR auto-fill, Drive backup, and budget alerts.

- [ ] Camera access via `getUserMedia` on the add expense form
- [ ] Tesseract.js integration for on-device OCR
- [ ] OCR result parser — extract amount (regex for currency patterns), merchant (first line heuristic), date (date pattern matching)
- [ ] OCR confidence display — show which fields were auto-filled and allow easy correction
- [ ] Receipt image stored in IndexedDB as base64 blob, linked to expense record
- [ ] Google OAuth 2.0 sign-in (optional — app works without it)
- [ ] Drive sync — full data JSON backed up to `xtrack-backup.json` in Drive root
- [ ] Receipt images synced to `xtrack-receipts/` folder in Drive
- [ ] Restore from backup flow — detect existing backup on first sign-in, offer restore
- [ ] Per-category monthly budgets (user-configurable in Settings)
- [ ] Budget alert push notifications at 80% and 100% thresholds
- [ ] Auto-categorisation rules engine — merchant name → category mapping, editable

**Deliverable:** Receipt-to-expense in 2 taps; Drive backup visible in user's Google Drive.

---

### Phase 3 — Power features (weeks 7–9)

**Goal:** Add voice entry, recurring expenses, splitting, multi-currency conversion, and deep analytics.

- [ ] Voice entry via Web Speech API — parse "Coffee 4.50 GHS today" into structured expense
- [ ] Voice feedback — spoken confirmation of logged expense
- [ ] Recurring expense template — mark any expense as recurring (weekly / monthly / yearly)
- [ ] Recurring auto-log — on app open, check if any recurring expenses are due and log them
- [ ] Change detection — flag if a recurring expense amount has changed since last period
- [ ] Expense splitting — tag expense as shared, add participant names, enter split ratios
- [ ] Split ledger — track outstanding balances per person, export split summary
- [ ] Live exchange rates via a public forex API (e.g. Frankfurter.app — free, no key required)
- [ ] Home currency setting — all totals converted and displayed in selected home currency
- [ ] 6-month trend line chart (Recharts LineChart)
- [ ] Anomaly detection — flag months where spend in a category exceeds 150% of the 3-month average
- [ ] Free-text notes per expense (Phase 1 already includes notes field)
- [ ] Custom hashtag tags — `#client` `#reimbursable` `#personal` — filterable in list view
- [ ] Duplicate expense detection — warn if a very similar expense was logged within 24 hours

**Deliverable:** Feature-complete v1.0 ready for broader release.

---

## 8. Screen-by-screen specification

### 8.1 Expense list (home screen)

**Elements:**
- Header: app name + online/offline dot + tab navigation (Expenses | Stats)
- Summary card (gradient): total of filtered expenses, count, date range, Export Excel + CSV buttons
- Search bar + sort toggle (newest/oldest)
- Category filter chips (horizontal scroll): All, Food, Transport, Shopping, Health, Housing, Entertainment, Utilities, Other
- Month filter (native date input, month type)
- Month-grouped expense rows, each showing: category emoji pill, description, date + category label, amount
- Floating action button (+) — fixed bottom-right

**Interactions:**
- Tap expense row → Expense detail screen
- Tap + → Add expense form
- Tap Export → download file immediately
- Swipe left on row → delete shortcut (Phase 2)
- Swipe right on row → duplicate with today's date (Phase 2)

---

### 8.2 Add / edit expense form

**Elements:**
- Back button
- Page title ("New expense" or "Edit expense")
- Description field (auto-focused on open; autocomplete from recent merchants)
- Amount row: currency picker + amount field (numeric keyboard)
- Date field (defaults to today)
- Category grid (4 columns, emoji + label, selected state highlighted)
- Notes textarea (optional, collapsed by default)
- Camera icon button (Phase 2) — opens receipt capture
- "Add expense" / "Save changes" primary button
- "Cancel" secondary button
- "Delete this expense" danger button (edit mode only)

**Validation:**
- Description: required, max 120 characters
- Amount: required, numeric, greater than 0
- Date: required, cannot be more than 365 days in the future
- Category: required, defaults to last-used category

---

### 8.3 Expense detail screen

**Elements:**
- Back button
- Gradient header: category emoji, amount (large), description
- Detail rows: Category, Date, Currency, Added timestamp
- Notes section (if present)
- Receipt image thumbnail (Phase 2, if captured)
- "Edit expense" primary button
- "Delete expense" danger button

---

### 8.4 Stats screen

**Elements:**
- Two metric cards: "This month" (amount + % change vs last month), "All time" (amount + count)
- Category breakdown: bar chart per category, sorted by total descending
- Export section: Export Excel + Export CSV buttons

**Phase 3 additions:**
- 6-month trend line chart
- Top merchant list
- Anomaly flags

---

### 8.5 Settings screen (Phase 2)

**Elements:**
- Home currency selector
- Per-category monthly budget inputs
- Google account sign-in / sign-out
- Last synced timestamp
- Manual sync button
- Manage recurring expenses (Phase 3)
- Clear all data (with confirmation)

---

### 8.6 Receipt capture screen (Phase 2)

**Elements:**
- Camera viewfinder (full screen)
- Shutter button
- Gallery picker (choose existing photo)
- Cancel button
- After capture: OCR loading spinner, then pre-filled expense form with confidence indicators on auto-filled fields

---

## 9. Data model

### Expense record

```json
{
  "id": "1718123456789",
  "description": "Lunch at KFC",
  "amount": 45.00,
  "currency": "GHS",
  "category": "food",
  "date": "2025-06-12",
  "notes": "Team lunch, 3 people",
  "tags": ["#reimbursable"],
  "receiptImageId": "receipt_1718123456789",
  "isRecurring": false,
  "recurringPeriod": null,
  "splitWith": [],
  "createdAt": "2025-06-12T12:34:56.789Z",
  "updatedAt": "2025-06-12T12:34:56.789Z",
  "syncedAt": null
}
```

### Budget record

```json
{
  "id": "budget_food",
  "categoryId": "food",
  "monthlyLimit": 500.00,
  "currency": "GHS",
  "alertAt": [80, 100]
}
```

### Sync queue record

```json
{
  "id": "sync_1718123456789",
  "operation": "upsert",
  "entityType": "expense",
  "entityId": "1718123456789",
  "timestamp": "2025-06-12T12:34:56.789Z",
  "retries": 0
}
```

### IndexedDB schema (Dexie)

```javascript
db.version(1).stores({
  expenses: '++id, date, category, currency, createdAt',
  budgets: '++id, categoryId',
  syncQueue: '++id, timestamp, operation',
  receiptImages: '++id, expenseId',
  settings: 'key',
});
```

---

## 10. Offline strategy

### Service worker caching

The app uses Workbox with a **cache-first** strategy for the app shell (HTML, CSS, JS, icons) and a **network-first with fallback** strategy for any API calls.

```
App shell assets → Cache first (stale-while-revalidate)
Google Drive API → Network first → queue on failure
Exchange rate API → Network first → use last cached rate
Receipt OCR (Tesseract WASM) → Cache first (large file, cache on first load)
```

### Background sync

All write operations (add, edit, delete) are committed to IndexedDB synchronously. A `syncQueue` table records every change that has not yet been pushed to Google Drive. When the browser fires a `sync` event (on reconnect), the service worker flushes the queue in order.

### Conflict resolution

Last-write-wins, using `updatedAt` timestamp. If a Drive record has a newer `updatedAt` than the local record, the Drive version wins on next sync. Users are notified of any conflict resolution via a toast.

### Offline indicators

- Coloured dot in the header (green = online, amber = offline)
- Toast on transition: "Offline — changes saved locally" / "Back online — data synced"
- Settings screen shows last sync timestamp
- Any pending unsynced records are marked with a small indicator dot in the list

---

## 11. Receipt capture and OCR flow

### Step-by-step flow

1. User taps the camera icon on the Add Expense form.
2. `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` opens the rear camera.
3. User frames the receipt and taps the shutter button.
4. The image is captured to a `<canvas>` element and compressed to JPEG at 85% quality, max 1200px on the longest side.
5. Tesseract.js processes the image on-device (no data leaves the device at this step).
6. The OCR engine returns a text string. The parser runs three extraction passes:

   - **Amount:** regex scan for currency patterns — `GHS\s?\d+[\.,]\d{2}`, `\d+[\.,]\d{2}\s?GHS`, and plain number patterns near the bottom of the receipt.
   - **Merchant:** first non-empty line of text that is not a date or address fragment.
   - **Date:** regex for common date formats — `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, month-name variants.

7. Pre-filled fields are highlighted with a blue border to indicate they were auto-filled.
8. A confidence percentage is shown per field (Tesseract returns a word-level confidence; the parser averages across the extracted tokens).
9. User reviews, corrects any fields, and taps "Add expense".
10. The receipt image (compressed JPEG) is stored in IndexedDB as a base64 blob, linked to the expense `id`.
11. On next Drive sync, the image is uploaded to `xtrack-receipts/{expenseId}.jpg`.

### OCR accuracy expectations

| Condition | Expected accuracy |
|---|---|
| Printed thermal receipt, good lighting | 90–95% |
| Printed receipt, shadows or glare | 70–85% |
| Handwritten amounts | 50–70% |
| Crumpled or partially torn receipt | 40–65% |

Users should always be presented with editable fields even when OCR confidence is high. The UI must make it easy to correct auto-filled values.

---

## 12. Google Drive integration

### Authentication

- Google Identity Services (GIS) library for OAuth 2.0 sign-in.
- Requested scopes: `https://www.googleapis.com/auth/drive.appdata` (app-specific folder, not visible to user's main Drive) or `https://www.googleapis.com/auth/drive.file` (files created by the app, visible in Drive).
- Token stored in IndexedDB; refreshed silently using the refresh token.
- Sign-in is optional — the app works fully without it.

### Backup structure in Drive

```
Google Drive/
└── xTrack/
    ├── xtrack-backup.json        ← full expense data, settings, budgets
    └── receipts/
        ├── {expenseId}.jpg
        └── {expenseId}.jpg
```

### Sync operations

| Operation | Trigger | Drive action |
|---|---|---|
| Initial backup | First sign-in | Create folder, upload full JSON |
| Incremental sync | Any write to IndexedDB (when online) | Patch `xtrack-backup.json` |
| Receipt upload | New expense with receipt image saved | Upload JPEG to `receipts/` folder |
| Restore | User signs in on new device and backup detected | Download JSON, import to IndexedDB |
| Manual sync | User taps "Sync now" in Settings | Full JSON upload, any pending receipts |

### Error handling

- If Drive upload fails, the record is added to `syncQueue` and retried on next sync attempt (max 3 retries with exponential backoff).
- If the Drive quota is exceeded, the user is notified in Settings with a prompt to free space.
- If authentication expires mid-session, the app attempts a silent token refresh before showing a sign-in prompt.

---

## 13. Export capabilities

### Excel export (.xls / .xlsx)

- Format: XML SpreadsheetML for broad compatibility (Phase 1); SheetJS binary .xlsx (Phase 2 onwards).
- Columns: Date, Description, Category, Amount, Currency, Notes, Tags.
- Row for each expense, sorted by date descending.
- A totals row at the bottom summing the Amount column.
- The filename includes the date range: `xtrack-2025-01-to-2025-06.xlsx`.
- If a category or month filter is active, only filtered records are exported.

### CSV export

- Standard comma-separated, UTF-8 with BOM (for Excel compatibility).
- Same columns as Excel export.
- Filename: `xtrack-2025-06.csv`.

### Future export formats (Phase 3)

- PDF statement — formatted receipt-style summary per month.
- Google Sheets — direct push to a new Sheet in the user's Drive.
- Accounting format — QuickBooks and Xero compatible CSV variants.

---

## 14. Notifications and alerts

### Budget alerts

- User sets a monthly budget per category in Settings (e.g. Food: GHS 500/month).
- When cumulative spending in a category reaches 80% of the budget, a push notification is sent: "You've used 80% of your Food budget this month (GHS 400 of GHS 500)."
- When 100% is reached: "Food budget reached — GHS 500 spent this month."
- Notifications require explicit permission from the user (standard browser prompt).
- Notification tapping opens the app directly to the Stats screen filtered to that category.

### Recurring expense reminders (Phase 3)

- If a recurring expense has not been logged by its due date + 2 days, a reminder notification is sent.
- Tapping the notification opens the Add Expense form pre-filled with the recurring template.

### Sync status notifications

- Silent success: no notification.
- Sync failure after 3 retries: "xTrack couldn't sync. Tap to retry." — in-app banner only, not a push notification.

---

## 15. Security and privacy

### Data storage

- All expense data is stored locally in the user's browser IndexedDB. No data is sent to any server unless the user explicitly enables Google Drive sync.
- Receipt images are stored as compressed blobs in IndexedDB and only uploaded to the user's own Google Drive account.
- No analytics, no tracking, no third-party data sharing.

### Google Drive permissions

- The app requests the narrowest possible Drive scope. `drive.appdata` (preferred) restricts the app to a hidden app-specific folder in the user's Drive, not visible to other apps.
- The app never reads any Drive files it did not create.
- OAuth tokens are stored in IndexedDB, not in localStorage or cookies.

### Receipt images

- Receipt images are processed entirely on-device by Tesseract.js. The raw image bytes never leave the device unless Drive sync is enabled, in which case they are uploaded directly from the browser to Google Drive using the user's own OAuth credentials.
- Images are compressed before storage (max 1200px, JPEG 85%) to minimise storage use.

### Input sanitisation

- All user inputs are escaped before display to prevent XSS.
- Amount fields accept only numeric input.
- Description and notes fields are capped at 120 and 500 characters respectively.

---

## 16. Testing strategy

### Unit tests (Jest + React Testing Library)

- All CRUD operations in `useExpenses` hook
- OCR parser regex — amount, merchant, date extraction against a fixture set of receipt text strings
- Export helpers — verify CSV and Excel output structure
- Category rules engine — merchant-to-category mapping
- Sync queue — enqueue, flush, retry logic

### Integration tests (Playwright)

- Add expense → appears in list → correct totals in Stats
- Edit expense → changes reflected in list and Stats
- Delete expense → removed from list, totals updated
- Export → file downloaded with correct content
- Offline mode → add expense while offline → reconnect → appears in sync queue

### Manual device testing

- Install as PWA on Android Chrome (primary)
- Install as PWA on iOS Safari
- Camera access and OCR on a real printed receipt
- Offline use with airplane mode, then reconnect
- Google Drive sign-in, backup, and restore flow on a second device

### Performance targets

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s on 4G |
| Time to Interactive | < 3.0s on 4G |
| Offline load time | < 0.5s (cached shell) |
| OCR processing time | < 8s for a standard receipt |
| Excel export (1000 rows) | < 2s |

---

## 17. Deployment

### Hosting

- **Platform:** Vercel (recommended) or Netlify — both support zero-config static deployment with HTTPS, required for service workers, camera access, and push notifications.
- **Domain:** Custom domain (e.g. `xtrack.app`) with automatic SSL.
- **CDN:** Vercel Edge Network / Netlify CDN — assets served from edge nodes globally.

### PWA manifest (`manifest.json`)

```json
{
  "name": "xTrack — Expense Tracker",
  "short_name": "xTrack",
  "description": "Fast, offline-first expense tracking",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#6366F1",
  "background_color": "#F8F9FB",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### CI/CD pipeline

1. Developer pushes to `main` branch on GitHub.
2. Vercel automatically builds with `vite build`.
3. Workbox generates the service worker during build.
4. Preview deployment created for every pull request.
5. Production deployment on merge to `main`.
6. Lighthouse CI runs on every PR — must score ≥ 90 on Performance, Accessibility, and PWA categories.

### Environment variables

```
VITE_GOOGLE_CLIENT_ID=        # Google OAuth client ID
VITE_GOOGLE_API_KEY=          # Google API key (for Drive)
VITE_VAPID_PUBLIC_KEY=        # Web Push VAPID public key
VITE_FOREX_API_URL=           # Exchange rate API endpoint
```

---

## 18. Future roadmap

### v1.1 — Collaboration (post Phase 3)

- Shared expense groups — invite household members or teammates via a join code.
- Shared budget — one budget visible to all group members, contributions tracked per person.
- Group Drive sync — shared backup folder accessible to all members.

### v1.2 — Accounting integrations

- Export in QuickBooks IIF format.
- Export in Xero CSV import format.
- Direct push to Google Sheets (one-click "Send to Sheets" button).

### v1.3 — AI expense assistant

- Natural language query: "How much did I spend on food last quarter?"
- AI-generated monthly summary: "You spent 23% more on transport in May, likely due to 4 taxi receipts totalling GHS 340."
- Smart budget suggestions based on 3-month spending history.

### v2.0 — Business tier

- Multiple users under one organisation account.
- Approval workflow — employees submit expenses, manager approves.
- Per-project expense tagging and reporting.
- Reimbursement tracking — mark expenses as submitted / approved / reimbursed.
- Audit log — every change to an expense record tracked with timestamp and user.

---

## Appendix A — Category definitions

| ID | Label | Icon | Typical merchants |
|---|---|---|---|
| `food` | Food & drink | 🍽️ | Restaurants, cafes, groceries, delivery |
| `transport` | Transport | 🚌 | Fuel, taxis, Uber, bus fare, parking |
| `shopping` | Shopping | 🛍️ | Clothing, electronics, general retail |
| `health` | Health | 💊 | Pharmacy, clinic, gym, medical supplies |
| `housing` | Housing | 🏠 | Rent, maintenance, furniture, cleaning |
| `entertainment` | Entertainment | 🎬 | Cinema, streaming, events, sports |
| `utilities` | Utilities | ⚡ | Electricity, water, internet, mobile data |
| `other` | Other | 📦 | Anything that doesn't fit above |

---

## Appendix B — Supported currencies

| Code | Name | Symbol |
|---|---|---|
| GHS | Ghanaian Cedi | ₵ |
| USD | US Dollar | $ |
| EUR | Euro | € |
| GBP | British Pound | £ |
| NGN | Nigerian Naira | ₦ |

Additional currencies can be added to the config without any code changes beyond updating the currency list.

---

## Appendix C — Glossary

| Term | Definition |
|---|---|
| PWA | Progressive Web App — a web app that can be installed on a device's home screen and works offline |
| IndexedDB | A browser-native structured database for storing large amounts of data client-side |
| Service Worker | A script that runs in the background, intercepts network requests, and enables offline caching |
| OCR | Optical Character Recognition — extracting text from an image |
| VAPID | Voluntary Application Server Identification — a standard for authenticating web push notifications |
| Sync queue | A local list of write operations that have not yet been pushed to Google Drive |
| Drive appdata | A hidden, app-specific folder in Google Drive not visible to the user or other apps |

---

*Document version 1.0 — June 2025*
*xTrack project — confidential*
