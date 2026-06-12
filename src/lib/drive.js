import { db, getSetting, setSetting } from './db.js'

const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const BACKUP_FILENAME = 'xtrack-backup.json'
const FOLDER_NAME = 'xTrack'

let tokenClient = null
let accessToken = null

export function isDriveConfigured() {
  return !!window.__XTRACK_GOOGLE_CLIENT_ID__
}

export async function getClientId() {
  return await getSetting('googleClientId', '')
}

export async function setClientId(id) {
  window.__XTRACK_GOOGLE_CLIENT_ID__ = id
  await setSetting('googleClientId', id)
}

export async function initDrive() {
  const clientId = await getClientId()
  if (!clientId) return false
  window.__XTRACK_GOOGLE_CLIENT_ID__ = clientId

  return new Promise((resolve) => {
    if (!window.google?.accounts?.oauth2) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => resolve(setupTokenClient(clientId))
      script.onerror = () => resolve(false)
      document.head.appendChild(script)
    } else {
      resolve(setupTokenClient(clientId))
    }
  })
}

function setupTokenClient(clientId) {
  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: () => {},
    })
    return true
  } catch {
    return false
  }
}

export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Drive not initialized')); return }
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error)); return }
      accessToken = resp.access_token
      setSetting('driveSignedIn', true)
      resolve(accessToken)
    }
    tokenClient.requestAccessToken()
  })
}

export async function signOut() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken)
  }
  accessToken = null
  await setSetting('driveSignedIn', false)
}

export function isSignedIn() {
  return !!accessToken
}

async function apiFetch(url, options = {}) {
  if (!accessToken) throw new Error('Not signed in to Google Drive')
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) { accessToken = null; throw new Error('Session expired. Please sign in again.') }
    throw new Error(`Drive API error: ${res.status}`)
  }
  return res
}

async function findOrCreateFolder() {
  const search = await apiFetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`
  )
  const data = await search.json()
  if (data.files?.length) return data.files[0].id

  const create = await apiFetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const folder = await create.json()
  return folder.id
}

async function findFile(name, folderId) {
  const res = await apiFetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${name}' and '${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime)`
  )
  const data = await res.json()
  return data.files?.[0] || null
}

export async function backupToDrive() {
  const folderId = await findOrCreateFolder()
  const expenses = await db.expenses.toArray()
  const budgets = await db.budgets.toArray()
  const settings = await db.settings.toArray()

  const payload = JSON.stringify({ expenses, budgets, settings, exportedAt: new Date().toISOString() }, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })

  const existing = await findFile(BACKUP_FILENAME, folderId)

  if (existing) {
    await apiFetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: blob,
    })
  } else {
    const meta = JSON.stringify({ name: BACKUP_FILENAME, parents: [folderId] })
    const form = new FormData()
    form.append('metadata', new Blob([meta], { type: 'application/json' }))
    form.append('file', blob)
    await apiFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      body: form,
    })
  }

  await setSetting('lastSynced', new Date().toISOString())
}

export async function restoreFromDrive() {
  const folderId = await findOrCreateFolder()
  const file = await findFile(BACKUP_FILENAME, folderId)
  if (!file) throw new Error('No backup found in Google Drive')

  const res = await apiFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`)
  const data = await res.json()

  if (data.expenses) {
    await db.expenses.clear()
    await db.expenses.bulkAdd(data.expenses)
  }
  if (data.budgets) {
    await db.budgets.clear()
    await db.budgets.bulkAdd(data.budgets)
  }

  await setSetting('lastSynced', new Date().toISOString())
  return { expenseCount: data.expenses?.length || 0 }
}
