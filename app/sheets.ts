import { createSign } from 'node:crypto'
import { DEFAULT_CATEGORIES, type Category, type Data, type Person } from './config.ts'

let TAB = () => process.env.SHEET_TAB || 'Roster'
let SHEET = () => process.env.SHEET_ID!
const CAT_TAB = 'Categories'
// 0-based column index -> letter(s): 0=A, 25=Z, 26=AA
function colName(i: number): string {
  let s = ''
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s
  return s
}
let catCol = (cat: number) => colName(2 + cat) // first category is column C
let q = (range: string) => encodeURIComponent(range)
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
  let json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string }
  if (!json.access_token) {
    // Google's error text doesn't contain secrets; include it so failures are diagnosable.
    throw new Error(`Service account auth failed: ${json.error ?? res.status} ${json.error_description ?? ''}`.trim())
  }
  cached = { value: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 }
  return cached.value
}

type ValueRange = { values?: string[][] }

async function sheets<T = ValueRange>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

function parseCategories(rows: string[][] = []): Category[] {
  return rows
    .map((r) => ({
      label: String(r[0] ?? '').trim(),
      short: String(r[1] ?? '').trim(),
      pts: Number(r[2]) || 0,
      show: !/^(no|false|n|0|hide|hidden)$/i.test(String(r[3] ?? '').trim()),
    }))
    .filter((c) => c.label)
    .map((c) => ({ ...c, short: c.short || c.label }))
}

// Creates the Categories tab and fills it with the defaults (one-time migration).
async function seedCategories() {
  await sheets(':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: CAT_TAB } } }] }),
  }).catch((e) => {
    if (!String(e).includes('already exists')) throw e
  })
  await writeCategories(DEFAULT_CATEGORIES)
}

export async function getData(): Promise<Data> {
  let ranges = `ranges=${q(`${CAT_TAB}!A2:D`)}&ranges=${q(`${TAB()}!A2:ZZ`)}`
  let res: { valueRanges: ValueRange[] }
  try {
    res = await sheets(`/values:batchGet?${ranges}`)
  } catch (e) {
    if (!String(e).includes('Unable to parse range') || !String(e).includes(CAT_TAB)) throw e
    await seedCategories()
    res = await sheets(`/values:batchGet?${ranges}`)
  }
  let categories = parseCategories(res.valueRanges[0]?.values)
  let people = (res.valueRanges[1]?.values ?? [])
    .map((r, i) => ({
      row: i + 2,
      name: String(r[0] ?? '').trim(),
      team: String(r[1] ?? '').trim(),
      pts: categories.map((_, c) => Number(r[2 + c]) || 0),
    }))
    .filter((p) => p.name)
  return { categories, people }
}

export async function getCategories(): Promise<Category[]> {
  return (await getData()).categories
}

// Writes the Categories tab and keeps the Roster header row (C1 onward) in sync.
export async function writeCategories(cats: Category[]) {
  let rows = cats.map((c) => [c.label, c.short, c.pts, c.show ? 'Yes' : 'No'])
  await sheets(`/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        { range: `${CAT_TAB}!A1:D1`, values: [['Label', 'Short', 'Points', 'Show']] },
        { range: `${CAT_TAB}!A2:D${cats.length + 1}`, values: rows },
        { range: `${TAB()}!C1:${catCol(cats.length - 1)}1`, values: [cats.map((c) => c.label)] },
      ],
    }),
  })
}

export async function addPoints(row: number, cat: number, delta: number): Promise<number> {
  let range = q(`${TAB()}!${catCol(cat)}${row}`)
  let cur = await sheets(`/values/${range}`)
  let next = Math.max(0, (Number(cur.values?.[0]?.[0]) || 0) + delta)
  await sheets(`/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[next]] }),
  })
  return next
}
