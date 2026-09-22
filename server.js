const http = require('http')
const fs = require('fs')
const path = require('path')
const next = require('next')
const { loadEnvConfig } = require('@next/env')

// Snapshot of the real environment (shell / PM2). These always win over files.
const realEnv = { ...process.env }

// Load the standard Next.js env files (.env, .env.local, ...). Variables
// already present in the environment (e.g. set on the PM2 process) always win.
loadEnvConfig(process.cwd())

// Minimal .env parser for environment overlay files.
function parseEnv(content) {
  const out = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (value.length >= 2) {
      const first = value[0]
      const last = value[value.length - 1]
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        value = value.slice(1, -1)
      }
    }
    out[key] = value
  }
  return out
}

// Environment-specific overlay, selected by APP_ENV. The pm2 container runs
// with APP_ENV=staging -> .env.staging (Docker service names like `mongodb`).
// Without APP_ENV only .env (localhost) is used.
function applyEnvFile(file) {
  const filePath = path.join(process.cwd(), file)
  if (!fs.existsSync(filePath)) return
  const parsed = parseEnv(fs.readFileSync(filePath, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in realEnv)) process.env[key] = value
  }
  console.log(`> Loaded environment overlay: ${file}`)
}

if (process.env.APP_ENV === 'staging') {
  applyEnvFile('.env.staging')
}

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
      `> FlexiViz ready on http://${host}:${port} (APP_ENV=${process.env.APP_ENV || 'default'}, ${dev ? 'development' : 'production'})`
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