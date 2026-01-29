import { useState, useRef, useCallback, useEffect } from 'react'
import { useAudioCapture } from './useAudioCapture'
import { useAudioPlayback } from './useAudioPlayback'
import type {
  VoiceAgentState,
  VoiceAgentStatus,
  TranscriptEntry,
  UseVoiceAgentReturn,
  ServerMessage,
  TranscriptMessage,
  AudioResponseMessage,
  ErrorMessage
} from '@/lib/voice-agent/types'

const RECONNECT_DELAY = 3000

export function useVoiceAgent(): UseVoiceAgentReturn {
  // State
  const [state, setState] = useState<VoiceAgentState>({
    status: 'idle',
    isListening: false,
    isSpeaking: false,
    transcript: [],
    error: null,
    audioLevel: 0
  })

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Hooks
  const {
    startCapture,
    stopCapture,
    onAudioData,
    audioLevel: captureLevel
  } = useAudioCapture()

  const {
    playAudio,
    stopPlayback,
    queueAudio,
    clearQueue,
    isPlaying
  } = useAudioPlayback()

  // Update audioLevel from captureLevel
  useEffect(() => {
    setState(prev => ({
      ...prev,
      audioLevel: captureLevel
    }))
  }, [captureLevel])

  // Update isSpeaking from isPlaying
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSpeaking: isPlaying,
      status: isPlaying ? 'speaking' : prev.status === 'speaking' ? 'ready' : prev.status
    }))
  }, [isPlaying])

  // Handle server messages
  const handleServerMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'connection_ready':
          setState(prev => ({
            ...prev,
            status: 'ready',
            error: null
          }))
          break

        case 'session_started':
          setState(prev => ({
            ...prev,
            isListening: true,
            status: 'listening'
          }))
          break

        case 'audio_response': {
          const audioMessage = message as AudioResponseMessage
          // Decode base64 audio and queue for playback
          const binaryString = atob(audioMessage.data.audio)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          queueAudio(bytes.buffer)
          setState(prev => ({
            ...prev,
            isSpeaking: true,
            status: 'speaking'
          }))
          break
        }

        case 'transcript': {
          const transcriptMessage = message as TranscriptMessage
          const newEntry: TranscriptEntry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            speaker: transcriptMessage.data.speaker,
            text: transcriptMessage.data.text,
            timestamp: new Date(),
            isFinal: transcriptMessage.data.isFinal
          }

          setState(prev => {
            // If not final, update the last entry from same speaker if exists
            if (!newEntry.isFinal) {
              const lastIndex = prev.transcript.findLastIndex(
                t => t.speaker === newEntry.speaker && !t.isFinal
              )
              if (lastIndex !== -1) {
                const updated = [...prev.transcript]
                updated[lastIndex] = { ...updated[lastIndex], text: newEntry.text }
                return { ...prev, transcript: updated }
              }
            }
            return {
              ...prev,
              transcript: [...prev.transcript, newEntry]
            }
          })
          break
        }

        case 'error': {
          const errorMessage = message as ErrorMessage
          setState(prev => ({
            ...prev,
            error: errorMessage.data.message,
            status: 'error'
          }))
          break
        }

        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse server message:', error)
    }
  }, [queueAudio])

  // Connect to WebSocket
  const connect = useCallback(async (): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setState(prev => ({
      ...prev,
      status: 'connecting',
      error: null
    }))

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/voice-agent`)
      wsRef.current = ws

      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          status: 'ready',
          error: null
        }))
        // Send start session message
        ws.send(JSON.stringify({ type: 'start_session', timestamp: Date.now() }))
        resolve()
      }

      ws.onmessage = handleServerMessage

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          status: 'error'
        }))
        reject(new Error('WebSocket connection error'))
      }

      ws.onclose = (event) => {
        setState(prev => ({
          ...prev,
          status: 'disconnected',
          isListening: false
        }))

        // Attempt reconnection if not a clean close
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect().catch(console.error)
          }, RECONNECT_DELAY)
        }
      }
    })
  }, [handleServerMessage])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }

    // Stop capture and playback
    stopCapture()
    stopPlayback()
    clearQueue()

    // Reset state
    setState({
      status: 'idle',
      isListening: false,
      isSpeaking: false,
      transcript: [],
      error: null,
      audioLevel: 0
    })
  }, [stopCapture, stopPlayback, clearQueue])

  // Start listening
  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot start listening: WebSocket not connected')
      return
    }

    setState(prev => ({
      ...prev,
      isListening: true,
      status: 'listening'
    }))

    // Start audio capture
    await startCapture()

    // Set up audio data handler to send chunks via WebSocket
    onAudioData((audioData: ArrayBuffer) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(audioData)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64Audio = btoa(binary)

        wsRef.current.send(JSON.stringify({
          type: 'audio_chunk',
          data: { audio: base64Audio },
          timestamp: Date.now()
        }))
      }
    })
  }, [startCapture, onAudioData])

  // Stop listening
  const stopListening = useCallback(() => {
    setState(prev => ({
      ...prev,
      isListening: false,
      status: 'processing'
    }))

    stopCapture()
  }, [stopCapture])

  // Interrupt playback
  const interrupt = useCallback(() => {
    // Send interrupt message to server
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'interrupt',
        timestamp: Date.now()
      }))
    }

    // Stop local playback
    stopPlayback()
    clearQueue()

    setState(prev => ({
      ...prev,
      isSpeaking: false,
      status: prev.isListening ? 'listening' : 'ready'
    }))
  }, [stopPlayback, clearQueue])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    state,
    connect,
    disconnect,
    startListening,
    stopListening,
    interrupt
  }
}
