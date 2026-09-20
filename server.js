const http = require('http')
const next = require('next')
const { loadEnvConfig } = require('@next/env')

// Load .env (and .env.local / .env.production) before anything else so
// NODE_ENV, PORT, MONGODB_URI, etc. are available at server startup.
loadEnvConfig(process.cwd())

const dev = process.env.NODE_ENV !== 'production'
const port = Number(process.env.PORT) || 3000
const host = process.env.HOST || '0.0.0.0'

const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res))

  server.listen(port, host, (err) => {
    if (err) throw err
    console.log(
      `> FlexiViz ready on http://${host}:${port} as ${dev ? 'development' : 'production'}`
    )
  })

  // Graceful shutdown for PM2 / process managers
  const shutdown = (signal) => {
    console.log(`> ${signal} received, shutting down gracefully...`)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 15000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
})