import { createServer } from 'http'
import next from 'next'
import { parse } from 'url'
import config from './config'
import { VoiceAgentHandler } from './ws-handler'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = config.PORT

async function main() {
  const app = next({ dev, hostname, port })
  const handle = app.getRequestHandler()

  try {
    await app.prepare()

    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url || '', true)
      handle(req, res, parsedUrl)
    })

    const voiceAgentHandler = new VoiceAgentHandler(server, '/ws/voice-agent')
    voiceAgentHandler.init()

    server.on('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })

    server.listen(port, () => {
      console.log(`> Server ready on http://${hostname}:${port}`)
      console.log(`> WebSocket ready on ws://${hostname}:${port}/ws/voice-agent`)
      console.log(`> Environment: ${dev ? 'development' : 'production'}`)
    })
  } catch (err) {
    console.error('Error preparing Next.js app:', err)
    process.exit(1)
  }
}

main()
