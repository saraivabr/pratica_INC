// @ts-nocheck
import WebSocket, { WebSocketServer } from 'ws'
import type { IncomingMessage } from 'http'
import type { Server } from 'http'
import { authenticateWebSocket } from './auth-middleware'
import { GeminiSession } from './gemini-session'
import config from './config'
import type { ClientMessage, ServerMessage, VoiceAgentSession, VoiceAgentStatus } from '../lib/voice-agent/types'
import crypto from 'crypto'

interface SessionData {
  ws: WebSocket
  gemini: GeminiSession
  session: VoiceAgentSession
  status: VoiceAgentStatus
}

export class VoiceAgentHandler {
  private wss: WebSocketServer | null = null
  private sessions: Map<string, SessionData> = new Map()
  private server: Server
  private path: string

  constructor(server: Server, path: string = '/ws/voice-agent') {
    this.server = server
    this.path = path
  }

  init(): void {
    this.wss = new WebSocketServer({
      server: this.server,
      path: this.path
    })

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req)
    })
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    try {
      // Check if voice agent is available
      if (!config.GEMINI_API_KEY) {
        this.sendError(ws, 'Voice agent is not configured')
        ws.close(1008, 'Voice agent is not configured')
        return
      }

      const authResult = await authenticateWebSocket(req)

      if ('error' in authResult) {
        this.sendError(ws, authResult.error)
        ws.close(1008, authResult.error)
        return
      }

      const sessionId = crypto.randomUUID()
      const gemini = new GeminiSession(sessionId, authResult.tenantId, authResult.nome)

      const session: VoiceAgentSession = {
        sessionId,
        userId: authResult.userId,
        role: authResult.role as 'admin' | 'gerente',
        tenantId: authResult.tenantId,
        connectedAt: new Date(),
        lastActivity: new Date()
      }

      // Set up Gemini callbacks to forward to client
      gemini.onAudioResponse = (audioData: string, isFinal: boolean) => {
        this.sendToClient(ws, {
          type: 'audio_response',
          data: { audio: audioData, isFinal },
          timestamp: Date.now()
        })
      }

      gemini.onTranscript = (text: string, speaker: 'user' | 'assistant', isFinal: boolean) => {
        this.sendToClient(ws, {
          type: 'transcript',
          data: { text, speaker, isFinal },
          timestamp: Date.now()
        })
      }

      gemini.onError = (error: string) => {
        this.sendError(ws, error)
      }

      gemini.onToolCall = (toolName: string, args: any) => {
        this.sendToClient(ws, {
          type: 'tool_call',
          data: { toolName, args },
          timestamp: Date.now()
        })
      }

      gemini.onToolResult = (toolName: string, result: any) => {
        this.sendToClient(ws, {
          type: 'tool_result',
          data: { toolName, result },
          timestamp: Date.now()
        })
      }

      this.sessions.set(sessionId, { ws, gemini, session, status: 'idle' })

      this.sendToClient(ws, {
        type: 'connection_ready',
        data: { sessionId },
        timestamp: Date.now()
      })

      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString()) as ClientMessage
          this.handleClientMessage(sessionId, message)
        } catch (error) {
          this.sendError(ws, 'Invalid message format')
        }
      })

      ws.on('close', () => {
        this.cleanupSession(sessionId)
      })

      ws.on('error', (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error)
        this.cleanupSession(sessionId)
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      this.sendError(ws, errorMessage)
      ws.close(1008, errorMessage)
    }
  }

  private async handleClientMessage(sessionId: string, message: ClientMessage): Promise<void> {
    const sessionData = this.sessions.get(sessionId)
    if (!sessionData) {
      return
    }

    const { ws, gemini, session } = sessionData

    // Update last activity
    session.lastActivity = new Date()

    switch (message.type) {
      case 'start_session':
        try {
          sessionData.status = 'connecting'
          await gemini.connect()
          sessionData.status = 'ready'
          this.sendToClient(ws, {
            type: 'session_started',
            timestamp: Date.now()
          })
        } catch (error) {
          sessionData.status = 'error'
          const errorMessage = error instanceof Error ? error.message : 'Failed to start session'
          this.sendError(ws, errorMessage)
        }
        break

      case 'audio_chunk':
        if (sessionData.status === 'ready' && message.data) {
          gemini.sendAudio(message.data)
        }
        break

      case 'interrupt':
        // Future: interrupt Gemini response
        break

      case 'end_session':
        sessionData.status = 'idle'
        gemini.disconnect()
        this.sendToClient(ws, {
          type: 'session_ended',
          timestamp: Date.now()
        })
        break

      default:
        this.sendError(ws, `Unknown message type: ${(message as any).type}`)
    }
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: WebSocket, errorMessage: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { code: 'ERROR', message: errorMessage },
        timestamp: Date.now()
      }))
    }
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId)
    if (sessionData) {
      try {
        sessionData.gemini.disconnect()
      } catch (error) {
        console.error(`Error disconnecting Gemini for session ${sessionId}:`, error)
      }
      this.sessions.delete(sessionId)
    }
  }

  getStats(): { activeSessions: number } {
    return {
      activeSessions: this.sessions.size
    }
  }
}
