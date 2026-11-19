import { createRouter, type Middleware } from 'remix/router'
import { session } from 'remix/middleware/session'
import { formData } from 'remix/middleware/form-data'
import { auth, Auth, createSessionAuthScheme } from 'remix/middleware/auth'
import { completeAuth, createGoogleAuthProvider, finishExternalAuth, startExternalAuth } from 'remix/auth'
import { createCookie } from 'remix/cookie'
import { createCookieSessionStorage } from 'remix/session-storage/cookie'
import { Session } from 'remix/session'
import { redirect } from 'remix/response/redirect'
import { CATEGORIES } from './config.ts'
import { routes } from './routes.ts'
import { addPoints, getPeople } from './sheets.ts'
import { adminPage, scoreboardPage } from './views.ts'
import { iconResponse, manifestResponse, serviceWorkerResponse } from './pwa.ts'

let env = process.env
let origin =
  env.APP_ORIGIN ??
  (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
// ADMIN_EMAIL may hold several addresses separated by commas, e.g. "a@gmail.com, b@gmail.com"
let adminEmails = new Set(
  (env.ADMIN_EMAIL ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
)
let isAdminEmail = (email?: string | null) => !!email && adminEmails.has(email.toLowerCase())

let sessionCookie = createCookie('__session', {
  secrets: [env.SESSION_SECRET ?? 'dev-only-secret'],
  httpOnly: true,
  secure: origin.startsWith('https'),
  sameSite: 'lax', // also blocks cross-site form posts from carrying the cookie
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
})

let googleProvider = createGoogleAuthProvider({
  clientId: env.GOOGLE_CLIENT_ID!,
  clientSecret: env.GOOGLE_CLIENT_SECRET!,
  redirectUri: new URL(routes.callback.href(), origin),
})

// Rejects anyone who isn't the signed-in admin.
function requireAdmin(): Middleware {
  return (context, next) => {
    if (!context.get(Auth)?.ok) {
      return context.request.method === 'GET'
        ? redirect(routes.login.href())
        : new Response('Unauthorized', { status: 401 })
    }
    return next()
  }
}

export let router = createRouter({
  middleware: [
    session(sessionCookie, createCookieSessionStorage()),
    formData(),
    auth({
      schemes: [
        createSessionAuthScheme({
          read: (s) => s.get('auth') as { email: string } | null,
          verify: (value) => (isAdminEmail(value.email) ? { email: value.email } : null),
          invalidate: (s) => s.unset('auth'),
        }),
      ],
    }),
  ],
})

router.get(routes.manifest, () => manifestResponse())
router.get(routes.sw, () => serviceWorkerResponse())
router.get(routes.icon, ({ params }) => iconResponse(params.name))

router.get(routes.home, async (context) => {
  return scoreboardPage(await getPeople(), !!context.get(Auth)?.ok)
})

router.get(routes.login, (context) =>
  startExternalAuth(googleProvider, context, { returnTo: routes.admin.index.href() }),
)

router.get(routes.callback, async (context) => {
  let { result } = await finishExternalAuth(googleProvider, context)
  let profile = result.profile
  if (!profile.email_verified || !isAdminEmail(profile.email)) {
    return new Response("This Google account isn't allowed to edit points.", { status: 403 })
  }
  completeAuth(context).set('auth', { email: profile.email })
  return redirect(routes.admin.index.href())
})

router.post(routes.logout, (context) => {
  let s = context.get(Session)
  s.unset('auth')
  s.regenerateId(true)
  return redirect(routes.home.href())
})

router.map(routes.admin, {
  middleware: [requireAdmin()],
  actions: {
    async index() {
      return adminPage(await getPeople())
    },
    async score(context) {
      let f = context.get(FormData)
      let row = Number(f.get('row')), cat = Number(f.get('cat')), delta = Number(f.get('delta'))
      if (!Number.isInteger(row) || row < 2 || !CATEGORIES[cat] || !Number.isFinite(delta)) {
        return new Response('Bad request', { status: 400 })
      }
      return Response.json({ value: await addPoints(row, cat, delta) })
    },
  },
})
