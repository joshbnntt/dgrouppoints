import { router } from '../app/router.ts'

// Vercel Functions accept a web-standard fetch handler.
export default {
  fetch(request: Request) {
    return router.fetch(request)
  },
}
