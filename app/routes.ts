import { route } from 'remix/routes'

export let routes = route({
  home: '/',
  manifest: '/manifest.webmanifest',
  sw: '/sw.js',
  icon: '/icons/:name.png',
  login: '/login',
  callback: '/auth/google/callback',
  logout: { method: 'POST', pattern: '/logout' },
  admin: {
    index: { method: 'GET', pattern: '/admin' },
    score: { method: 'POST', pattern: '/admin/score' },
    categories: { method: 'GET', pattern: '/admin/categories' },
    saveCategories: { method: 'POST', pattern: '/admin/categories' },
  },
})
