import http from 'http'
import { randomUUID } from 'crypto'

interface MockSession {
  status: string
  channelId?: string
  qr?: string
  pairedPhone?: string
  deviceName?: string
}

export class MockWorkerServer {
  private server: http.Server | null = null
  private sessions: Map<string, MockSession> = new Map()
  private port: number

  constructor(port: number = 3005) {
    this.port = port
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res)
      })

      this.server.listen(this.port, () => {
        resolve()
      })

      this.server.on('error', reject)
    })
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url!, `http://localhost:${this.port}`)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Expected format: /api/whatsapp/{tenantId}/{userId}/{action}
    if (pathParts[0] !== 'api' || pathParts[1] !== 'whatsapp') {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    const tenantId = pathParts[2]
    const userId = pathParts[3]
    const action = pathParts[4]
    const sessionKey = `${tenantId}:${userId}`

    switch (action) {
      case 'start':
        this.handleStart(sessionKey, res)
        break
      case 'status':
        this.handleStatus(sessionKey, res)
        break
      case 'send':
        this.handleSend(req, sessionKey, res)
        break
      case 'logout':
        this.handleLogout(sessionKey, res)
        break
      case 'stream':
        this.handleStream(sessionKey, res)
        break
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unknown action' }))
    }
  }

  private handleStart(sessionKey: string, res: http.ServerResponse): void {
    const channelId = randomUUID()
    const session: MockSession = {
      status: 'connecting',
      channelId
    }
    this.sessions.set(sessionKey, session)

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(session))
  }

  private handleStatus(sessionKey: string, res: http.ServerResponse): void {
    const session = this.sessions.get(sessionKey)
    if (!session) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'disconnected' }))
      return
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(session))
  }

  private handleSend(req: http.IncomingMessage, sessionKey: string, res: http.ServerResponse): void {
    const session = this.sessions.get(sessionKey)
    if (!session || session.status !== 'ready') {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Session not ready' }))
      return
    }

    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      const { to, message } = JSON.parse(body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        ok: true,
        messageId: randomUUID(),
        to,
        message
      }))
    })
  }

  private handleLogout(sessionKey: string, res: http.ServerResponse): void {
    const session = this.sessions.get(sessionKey)
    if (session) {
      session.status = 'disconnected'
      delete session.pairedPhone
      delete session.deviceName
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  }

  private handleStream(sessionKey: string, res: http.ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    // Send initial status
    const session = this.sessions.get(sessionKey)
    if (session) {
      res.write(`data: ${JSON.stringify(session)}\n\n`)
    }

    // Keep connection open for testing
    const keepAlive = setInterval(() => {
      res.write(':keepalive\n\n')
    }, 15000)

    req.on('close', () => {
      clearInterval(keepAlive)
      res.end()
    })
  }

  // Test helpers

  setSessionStatus(tenantId: string, userId: string, status: string, data?: Partial<MockSession>): void {
    const sessionKey = `${tenantId}:${userId}`
    const session = this.sessions.get(sessionKey) || { status: 'disconnected' }
    Object.assign(session, { status, ...data })
    this.sessions.set(sessionKey, session)
  }

  simulateQR(tenantId: string, userId: string, qr: string): void {
    this.setSessionStatus(tenantId, userId, 'qr', { qr })
  }

  simulateConnected(tenantId: string, userId: string, phone: string, deviceName: string = 'Test Device'): void {
    this.setSessionStatus(tenantId, userId, 'ready', {
      pairedPhone: phone,
      deviceName
    })
  }

  clearSessions(): void {
    this.sessions.clear()
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve()
        return
      }

      this.server.close((err) => {
        if (err) reject(err)
        else {
          this.server = null
          this.sessions.clear()
          resolve()
        }
      })
    })
  }

  async restart(): Promise<void> {
    await this.stop()
    this.sessions.clear()
    await this.start()
  }
}

export async function startMockWorker(port: number = 3005): Promise<MockWorkerServer> {
  const server = new MockWorkerServer(port)
  await server.start()
  return server
}
