'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { UseAudioCaptureReturn } from '@/lib/voice-agent/types'

/**
 * Helper function to convert Float32 audio samples to Int16 PCM
 * Converts -1..1 floats to -32768..32767 int16 values
 */
function float32ToInt16(float32Array: Float32Array): ArrayBuffer {
  const int16Array = new Int16Array(float32Array.length)

  for (let i = 0; i < float32Array.length; i++) {
    // Clamp the value to -1..1 range
    const sample = Math.max(-1, Math.min(1, float32Array[i]))
    // Convert to 16-bit signed integer
    int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
  }

  return int16Array.buffer
}

/**
 * React hook for capturing microphone audio at 16kHz mono PCM
 *
 * Handles:
 * - Requesting microphone permissions
 * - Setting up AudioContext and processing nodes
 * - Converting Float32 audio to Int16 PCM format
 * - Calculating audio levels for visualization
 * - Cleanup on unmount
 */
export function useAudioCapture(): UseAudioCaptureReturn {
  // State
  const [isCapturing, setIsCapturing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const callbackRef = useRef<((data: ArrayBuffer) => void) | null>(null)

  /**
   * Start capturing audio from the microphone
   */
  const startCapture = useCallback(async () => {
    try {
      // Request microphone access with 16kHz mono audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      mediaStreamRef.current = stream

      // Create AudioContext with 16kHz sample rate
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      // Create source node from media stream
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      // Create ScriptProcessorNode for audio processing
      // bufferSize: 4096, inputChannels: 1, outputChannels: 1
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      // Handle audio processing
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)

        // Calculate audio level (RMS) for visualization
        let sum = 0
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i]
        }
        const rms = Math.sqrt(sum / inputData.length)
        // Normalize to 0-1 range with some amplification for better visualization
        const normalizedLevel = Math.min(1, rms * 3)
        setAudioLevel(normalizedLevel)

        // Convert to Int16 PCM and call the callback
        if (callbackRef.current) {
          const pcmData = float32ToInt16(inputData)
          callbackRef.current(pcmData)
        }
      }

      // Connect the audio processing chain
      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsCapturing(true)
    } catch (error) {
      console.error('Failed to start audio capture:', error)
      throw error
    }
  }, [])

  /**
   * Stop capturing audio
   */
  const stopCapture = useCallback(() => {
    // Disconnect and clean up processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current.onaudioprocess = null
      processorRef.current = null
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    // Stop all media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    setIsCapturing(false)
    setAudioLevel(0)
  }, [])

  /**
   * Register a callback to receive audio data
   * @param callback Function called with ArrayBuffer containing Int16 PCM data
   */
  const onAudioData = useCallback((callback: (data: ArrayBuffer) => void) => {
    callbackRef.current = callback
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [stopCapture])

  return {
    isCapturing,
    audioLevel,
    startCapture,
    stopCapture,
    onAudioData
  }
}
