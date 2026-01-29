import { useState, useRef, useCallback, useEffect } from 'react'
import type { UseAudioPlaybackReturn } from '@/lib/voice-agent/types'

function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length)
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768
  }
  return float32Array
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingRef = useRef<boolean>(false)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const playAudio = useCallback(async (audioData: ArrayBuffer): Promise<void> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
    }

    const audioContext = audioContextRef.current

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const int16Array = new Int16Array(audioData)
    const float32Array = int16ToFloat32(int16Array)

    const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000)
    audioBuffer.copyToChannel(float32Array, 0)

    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext.destination)

    currentSourceRef.current = source

    return new Promise<void>((resolve) => {
      source.onended = () => {
        currentSourceRef.current = null
        resolve()
      }
      source.start()
    })
  }, [])

  const processQueue = useCallback(async () => {
    while (audioQueueRef.current.length > 0 && isPlayingRef.current) {
      const audioData = audioQueueRef.current.shift()
      if (audioData) {
        await playAudio(audioData)
      }
    }

    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }, [playAudio])

  const queueAudio = useCallback((audioData: ArrayBuffer) => {
    audioQueueRef.current.push(audioData)

    if (!isPlayingRef.current) {
      isPlayingRef.current = true
      setIsPlaying(true)
      processQueue()
    }
  }, [processQueue])

  const stopPlayback = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop()
      } catch {
        // Source may have already stopped
      }
      currentSourceRef.current = null
    }

    audioQueueRef.current = []
    isPlayingRef.current = false
    setIsPlaying(false)
  }, [])

  const clearQueue = useCallback(() => {
    audioQueueRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      stopPlayback()
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [stopPlayback])

  return {
    isPlaying,
    playAudio,
    stopPlayback,
    queueAudio,
    clearQueue
  }
}
