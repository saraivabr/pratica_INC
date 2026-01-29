import WebSocket from 'ws'
import config from './config'
import type {
  GeminiLiveConfig,
  GeminiRealtimeMessage,
  GeminiServerMessage,
} from '../lib/voice-agent/types'
import { getToolsForGemini, getToolsForGeminiMinimal, executeTool } from '../lib/voice-agent/tools'
import { getSystemPrompt, GEMINI_VOICE_NAME } from '../lib/voice-agent/system-prompt'

export class GeminiSession {
  private ws: WebSocket | null = null
  private sessionId: string
  private tenantId: number
  private userName?: string
  private isSetupComplete: boolean = false
  private pendingToolCalls: Map<string, any> = new Map()

  public onAudioResponse: (audio: string, isFinal: boolean) => void = () => {}
  public onTranscript: (text: string, speaker: 'user' | 'assistant', isFinal: boolean) => void = () => {}
  public onError: (error: string) => void = () => {}
  public onToolCall: (name: string, args: any) => void = () => {}
  public onToolResult: (name: string, result: any) => void = () => {}

  constructor(sessionId: string, tenantId: number, userName?: string) {
    this.sessionId = sessionId
    this.tenantId = tenantId
    this.userName = userName
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${config.GEMINI_WS_URL}?key=${config.GEMINI_API_KEY}`

      this.ws = new WebSocket(wsUrl)

      this.ws.on('open', () => {
        console.log(`[GeminiSession ${this.sessionId}] WebSocket connected`)
        this.sendSetup()
      })

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data)
        if (this.isSetupComplete) {
          resolve()
        }
      })

      this.ws.on('error', (error) => {
        console.error(`[GeminiSession ${this.sessionId}] WebSocket error:`, error)
        this.onError(error.message)
        reject(error)
      })

      this.ws.on('close', (code, reason) => {
        console.log(`[GeminiSession ${this.sessionId}] WebSocket closed:`, code, reason.toString())
        this.isSetupComplete = false
        this.ws = null
      })

      // Timeout for connection
      setTimeout(() => {
        if (!this.isSetupComplete) {
          reject(new Error('Connection timeout - setup not completed'))
        }
      }, 30000)
    })
  }

  private sendSetup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error(`[GeminiSession ${this.sessionId}] Cannot send setup - WebSocket not open`)
      return
    }

    // Note: Native audio model only supports AUDIO in responseModalities
    // Transcriptions come via outputAudioTranscription/inputAudioTranscription
    const setupConfig = {
      model: config.GEMINI_MODEL,
      generationConfig: {
        responseModalities: ['AUDIO'] as const,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: GEMINI_VOICE_NAME,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: getSystemPrompt(this.userName) }],
      },
      // Using minimal tools for testing - single tool without parameters
      tools: [{
        functionDeclarations: getToolsForGeminiMinimal()
      }],
    }

    const setupMessage = {
      setup: setupConfig,
    }

    // Debug: Log the full setup message to verify format
    console.log(`[GeminiSession ${this.sessionId}] Setup config:`, JSON.stringify(setupMessage, null, 2))

    this.ws.send(JSON.stringify(setupMessage))
    console.log(`[GeminiSession ${this.sessionId}] Setup message sent`)
  }

  private handleMessage(data: Buffer): void {
    try {
      const message: GeminiServerMessage = JSON.parse(data.toString())

      // Handle setup complete
      if (message.setupComplete !== undefined) {
        console.log(`[GeminiSession ${this.sessionId}] Setup complete`)
        this.isSetupComplete = true
        return
      }

      // Handle server content (audio responses and transcriptions)
      if (message.serverContent) {
        const serverContent = message.serverContent as any
        const { modelTurn, turnComplete, outputTranscription, inputTranscription } = serverContent

        // Handle transcriptions (for native audio model)
        if (outputTranscription?.text) {
          this.onTranscript(outputTranscription.text, 'assistant', turnComplete || false)
        }
        if (inputTranscription?.text) {
          this.onTranscript(inputTranscription.text, 'user', turnComplete || false)
        }

        if (modelTurn?.parts) {
          for (const part of modelTurn.parts) {
            // Handle text response (fallback for non-native-audio models)
            if (part.text) {
              this.onTranscript(part.text, 'assistant', turnComplete || false)
            }

            // Handle audio response
            if (part.inlineData?.mimeType?.startsWith('audio/')) {
              this.onAudioResponse(part.inlineData.data, turnComplete || false)
            }
          }
        }
      }

      // Handle tool calls
      if (message.toolCall?.functionCalls) {
        for (const functionCall of message.toolCall.functionCalls) {
          this.onToolCall(functionCall.name, functionCall.args)
          this.handleToolCall(functionCall.id, functionCall.name, functionCall.args)
        }
      }
    } catch (error) {
      console.error(`[GeminiSession ${this.sessionId}] Error parsing message:`, error)
      this.onError('Failed to parse Gemini response')
    }
  }

  sendAudio(audioBase64: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[GeminiSession ${this.sessionId}] Cannot send audio - WebSocket not open`)
      return
    }

    if (!this.isSetupComplete) {
      console.warn(`[GeminiSession ${this.sessionId}] Cannot send audio - setup not complete`)
      return
    }

    const audioMessage: GeminiRealtimeMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: audioBase64,
          },
        ],
      },
    }

    this.ws.send(JSON.stringify(audioMessage))
  }

  async handleToolCall(id: string, name: string, args: any): Promise<void> {
    try {
      console.log(`[GeminiSession ${this.sessionId}] Executing tool: ${name}`, args)

      this.pendingToolCalls.set(id, { name, args })

      const result = await executeTool(name, args, this.tenantId)

      this.onToolResult(name, result)

      // Send tool response back to Gemini
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const toolResponse: GeminiRealtimeMessage = {
          toolResponse: {
            functionResponses: [
              {
                id,
                name,
                response: result,
              },
            ],
          },
        }

        this.ws.send(JSON.stringify(toolResponse))
        console.log(`[GeminiSession ${this.sessionId}] Tool response sent for: ${name}`)
      }

      this.pendingToolCalls.delete(id)
    } catch (error) {
      console.error(`[GeminiSession ${this.sessionId}] Tool execution error:`, error)

      // Send error response to Gemini
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const errorResponse: GeminiRealtimeMessage = {
          toolResponse: {
            functionResponses: [
              {
                id,
                name,
                response: {
                  error: error instanceof Error ? error.message : 'Tool execution failed',
                },
              },
            ],
          },
        }

        this.ws.send(JSON.stringify(errorResponse))
      }

      this.pendingToolCalls.delete(id)
    }
  }

  disconnect(): void {
    if (this.ws) {
      console.log(`[GeminiSession ${this.sessionId}] Disconnecting`)
      this.ws.close()
      this.ws = null
      this.isSetupComplete = false
      this.pendingToolCalls.clear()
    }
  }
}

export default GeminiSession
