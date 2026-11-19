// Local dev server. On Vercel, api/index.ts is used instead.
import http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'
import { router } from './app/router.ts'

let port = Number(process.env.PORT ?? 3000)
http.createServer(createRequestListener((request) => router.fetch(request))).listen(port, () => {
  console.log(`http://localhost:${port}`)
})
