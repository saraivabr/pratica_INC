/**
 * Voice Agent Types
 *
 * Type definitions for the real-time voice agent using Gemini Flash Live API
 */

// ============================================================================
// Session Types
// ============================================================================

export interface VoiceAgentSession {
  sessionId: string
  userId: string
  role: 'admin' | 'gerente'
  workspaceId: number
  connectedAt: Date
  lastActivity: Date
}

export interface SessionData {
  userId: string
  phone: string
  role: 'corretor' | 'gerente' | 'admin'
  workspaceId?: number
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type ClientMessageType =
  | 'audio_chunk'
  | 'start_session'
  | 'end_session'
  | 'interrupt'

export type ServerMessageType =
  | 'session_started'
  | 'session_ended'
  | 'audio_response'
  | 'transcript'
  | 'tool_call'
  | 'tool_result'
  | 'error'
  | 'connection_ready'

export interface ClientMessage {
  type: ClientMessageType
  data?: any
  timestamp?: number
}

export interface AudioChunkMessage extends ClientMessage {
  type: 'audio_chunk'
  data: {
    audio: string // Base64 encoded PCM 16kHz mono
  }
}

export interface ServerMessage {
  type: ServerMessageType
  data?: any
  timestamp: number
}

export interface AudioResponseMessage extends ServerMessage {
  type: 'audio_response'
  data: {
    audio: string // Base64 encoded PCM 24kHz
    isFinal: boolean
  }
}

export interface TranscriptMessage extends ServerMessage {
  type: 'transcript'
  data: {
    text: string
    speaker: 'user' | 'assistant'
    isFinal: boolean
  }
}

export interface ToolCallMessage extends ServerMessage {
  type: 'tool_call'
  data: {
    toolName: string
    args: Record<string, any>
  }
}

export interface ToolResultMessage extends ServerMessage {
  type: 'tool_result'
  data: {
    toolName: string
    result: any
  }
}

export interface ErrorMessage extends ServerMessage {
  type: 'error'
  data: {
    code: string
    message: string
  }
}

// ============================================================================
// Tool Types
// ============================================================================

export interface VoiceAgentToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required?: string[]
  }
  execute: (args: Record<string, any>, workspaceId: number) => Promise<any>
}

export interface ToolExecutionContext {
  workspaceId: number
  userId: string
  sessionId: string
}

// ============================================================================
// Gemini Live API Types
// ============================================================================

export interface GeminiLiveConfig {
  model: string
  generationConfig: {
    responseModalities: ('AUDIO' | 'TEXT')[]
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: string
        }
      }
    }
  }
  systemInstruction?: {
    parts: { text: string }[]
  }
  tools?: GeminiTool[]
}

export interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[]
}

export interface GeminiFunctionDeclaration {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required?: string[]
  }
}

export interface GeminiRealtimeMessage {
  setup?: GeminiLiveConfig
  clientContent?: {
    turns: GeminiTurn[]
    turnComplete: boolean
  }
  realtimeInput?: {
    mediaChunks: {
      mimeType: string
      data: string // Base64 encoded audio
    }[]
  }
  toolResponse?: {
    functionResponses: {
      id: string
      name: string
      response: any
    }[]
  }
}

export interface GeminiTurn {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
  functionCall?: {
    id: string
    name: string
    args: Record<string, any>
  }
  functionResponse?: {
    id: string
    name: string
    response: any
  }
}

export interface GeminiServerMessage {
  setupComplete?: {}
  serverContent?: {
    modelTurn?: {
      parts: GeminiPart[]
    }
    turnComplete?: boolean
  }
  toolCall?: {
    functionCalls: {
      id: string
      name: string
      args: Record<string, any>
    }[]
  }
}

// ============================================================================
// Audio Types
// ============================================================================

export interface AudioConfig {
  sampleRate: number
  channelCount: number
  bitsPerSample: number
}

export const INPUT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channelCount: 1,
  bitsPerSample: 16
}

export const OUTPUT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channelCount: 1,
  bitsPerSample: 16
}

// ============================================================================
// React Hook Types
// ============================================================================

export type VoiceAgentStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'disconnected'

export interface VoiceAgentState {
  status: VoiceAgentStatus
  isListening: boolean
  isSpeaking: boolean
  transcript: TranscriptEntry[]
  error: string | null
  audioLevel: number
}

export interface TranscriptEntry {
  id: string
  speaker: 'user' | 'assistant'
  text: string
  timestamp: Date
  isFinal: boolean
}

export interface UseVoiceAgentReturn {
  state: VoiceAgentState
  connect: () => Promise<void>
  disconnect: () => void
  startListening: () => void
  stopListening: () => void
  interrupt: () => void
}

export interface UseAudioCaptureReturn {
  isCapturing: boolean
  audioLevel: number
  startCapture: () => Promise<void>
  stopCapture: () => void
  onAudioData: (callback: (data: ArrayBuffer) => void) => void
}

export interface UseAudioPlaybackReturn {
  isPlaying: boolean
  playAudio: (audioData: ArrayBuffer) => Promise<void>
  stopPlayback: () => void
  queueAudio: (audioData: ArrayBuffer) => void
  clearQueue: () => void
}
