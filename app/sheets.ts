import { createSign } from 'node:crypto'
import { CATEGORIES, type Person } from './config.ts'

let TAB = () => process.env.SHEET_TAB || 'Roster'
let SHEET = () => process.env.SHEET_ID!
let col = (i: number) => String.fromCharCode(67 + i) // C = first category
let b64 = (s: string) => Buffer.from(s).toString('base64url')

let cached: { value: string; exp: number } | null = null

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.value
  let now = Math.floor(Date.now() / 1000)
  let unsigned =
    b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64(JSON.stringify({
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }))
  let key = (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  let sig = createSign('RSA-SHA256').update(unsigned).sign(key).toString('base64url')
  let res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${sig}`,
    }),
  })
  let json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Service account auth failed')
  cached = { value: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 }
  return cached.value
}

async function sheets(path: string, init: RequestInit = {}) {
  let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET()}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<{ values?: string[][] }>
}

export async function getPeople(): Promise<Person[]> {
  let range = encodeURIComponent(`${TAB()}!A2:${col(CATEGORIES.length - 1)}`)
  let data = await sheets(`values/${range}`)
  return (data.values ?? [])
    .map((r, i) => ({
      row: i + 2,
      name: String(r[0] ?? '').trim(),
      team: String(r[1] ?? '').trim(),
      pts: CATEGORIES.map((_, c) => Number(r[2 + c]) || 0),
    }))
    .filter((p) => p.name)
}

export async function addPoints(row: number, cat: number, delta: number): Promise<number> {
  let range = encodeURIComponent(`${TAB()}!${col(cat)}${row}`)
  let cur = await sheets(`values/${range}`)
  let next = Math.max(0, (Number(cur.values?.[0]?.[0]) || 0) + delta)
  await sheets(`values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[next]] }),
  })
  return next
}
