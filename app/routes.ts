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
    roster: { method: 'GET', pattern: '/admin/roster' },
    addPerson: { method: 'POST', pattern: '/admin/roster' },
    updatePerson: { method: 'POST', pattern: '/admin/roster/:row' },
    removePerson: { method: 'POST', pattern: '/admin/roster/:row/remove' },
    categories: { method: 'GET', pattern: '/admin/categories' },
    saveCategories: { method: 'POST', pattern: '/admin/categories' },
  },
})
