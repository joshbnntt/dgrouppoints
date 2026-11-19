import { ICONS } from './icons.ts'

const THEME = '#0b1a3a'

export function manifestResponse() {
  return Response.json(
    {
      name: 'D-Group Points',
      short_name: 'DG Points',
      description: 'Teen D-Group scoreboard and points entry',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: THEME,
      theme_color: THEME,
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } },
  )
}

export function iconResponse(name: string) {
  let data = ICONS[name]
  if (!data) return new Response('Not found', { status: 404 })
  return new Response(Buffer.from(data, 'base64'), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800, immutable' },
  })
}

// Network-first for pages so scores are always fresh; falls back to the last
// cached scoreboard (or an offline note) when there's no connection.
// Never touches POSTs, login, or admin routes.
const SW = `
const CACHE = 'dg-v1';
const OFFLINE = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;font-family:system-ui;background:${THEME};color:#fff;display:grid;place-items:center;height:100vh;text-align:center"><div><h1>You\\'re offline</h1><p>Reconnect to see the latest scores.</p></div>';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/^\\/(admin|login|logout|auth)/.test(url.pathname)) return;
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }
  if (req.mode === 'navigate' && url.pathname === '/') {
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); } return res; })
        .catch(() => caches.match('/').then((r) => r || new Response(OFFLINE, { headers: { 'Content-Type': 'text/html' } })))
    );
  }
});
`

export function serviceWorkerResponse() {
  return new Response(SW, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  })
}
