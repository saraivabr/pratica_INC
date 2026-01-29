'use client'

import React, { useState, useEffect } from 'react'
import { useVoiceAgent } from './hooks/useVoiceAgent'
import { AudioVisualizer } from './AudioVisualizer'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  X,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
} from 'lucide-react'

export function VoiceAgentPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const { user } = useAuth()

  const {
    state,
    connect,
    disconnect,
    startListening,
    stopListening,
    interrupt,
  } = useVoiceAgent()

  const { status, isListening, isSpeaking, transcript, audioLevel } = state
  const isConnected = status === 'ready' || status === 'listening' || status === 'speaking' || status === 'processing'
  const toggleMute = () => setIsMuted(!isMuted)

  // Only render for admin users
  if (user?.role !== 'admin') {
    return null
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const handleOpen = () => {
    setIsOpen(true)
    connect()
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
    disconnect()
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
    toggleMute()
  }

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Conectando...'
      case 'ready':
        return 'Pronto para falar'
      case 'listening':
        return 'Ouvindo...'
      case 'processing':
        return 'Processando...'
      case 'speaking':
        return 'Sofia est\u00e1 falando...'
      case 'error':
        return 'Erro de conex\u00e3o'
      default:
        return 'Desconectado'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return 'text-amber-500'
      case 'ready':
        return 'text-emerald-500'
      case 'listening':
        return 'text-blue-500'
      case 'processing':
        return 'text-purple-500'
      case 'speaking':
        return 'text-emerald-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  const getMicButtonText = () => {
    switch (status) {
      case 'listening':
        return 'Ouvindo...'
      case 'processing':
        return 'Processando...'
      case 'speaking':
        return 'Sofia est\u00e1 falando...'
      default:
        return 'Clique para falar'
    }
  }

  // Floating button when panel is closed
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Abrir assistente de voz"
      >
        <div className="relative">
          {/* Pulse animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-lg opacity-40 group-hover:opacity-60 animate-pulse transition-opacity" />

          {/* Button */}
          <div className="relative h-14 w-14 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-300">
            <Mic className="h-6 w-6 text-white" />
          </div>
        </div>
      </button>
    )
  }

  // Main panel
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-80 sm:w-96 shadow-2xl border-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Sofia Avatar */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-md opacity-40" />
                <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                {/* Status indicator dot */}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                    isConnected ? 'bg-emerald-500' : 'bg-gray-400'
                  }`}
                />
              </div>

              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  Sofia
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Assistente de Voz
                </p>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleClose}
                className="h-8 w-8 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`transition-all duration-300 ${isMinimized ? 'py-3' : 'py-4'}`}>
          {/* Minimized state */}
          {isMinimized ? (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setIsMinimized(false)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      status === 'listening' || status === 'speaking'
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-gray-400'
                    }`}
                  />
                  <span className={`text-sm font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>
              </div>
              <AudioVisualizer isActive={isListening || isSpeaking} audioLevel={audioLevel} />
            </div>
          ) : (
            <>
              {/* Status indicator */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div
                  className={`h-2 w-2 rounded-full ${
                    status === 'listening' || status === 'speaking'
                      ? 'bg-emerald-500 animate-pulse'
                      : status === 'connecting' || status === 'processing'
                      ? 'bg-amber-500 animate-pulse'
                      : status === 'error'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className={`text-sm font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>

              {/* Audio Visualizer */}
              <div className="flex justify-center mb-4">
                <AudioVisualizer isActive={isListening || isSpeaking} audioLevel={audioLevel} />
              </div>

              {/* Transcript area */}
              <div className="h-24 mb-4 overflow-y-auto rounded-lg bg-gray-50 dark:bg-zinc-800/50 p-3 text-sm">
                {transcript && transcript.length > 0 ? (
                  <div className="space-y-2">
                    {transcript.slice(-5).map((entry, index) => (
                      <div
                        key={index}
                        className={`${
                          entry.speaker === 'user'
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-emerald-600 dark:text-emerald-400 font-medium'
                        }`}
                      >
                        <span className="font-semibold">
                          {entry.speaker === 'user' ? 'Voc\u00ea: ' : 'Sofia: '}
                        </span>
                        {entry.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 text-center italic">
                    A conversa aparecer\u00e1 aqui...
                  </p>
                )}
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-center gap-3">
                {/* Mute button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleMuteToggle}
                  className={`h-10 w-10 rounded-full ${
                    isMuted
                      ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400'
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

                {/* Main mic button */}
                <button
                  onClick={handleMicClick}
                  disabled={status === 'connecting' || status === 'processing'}
                  className={`relative group ${
                    status === 'connecting' || status === 'processing'
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  {/* Outer ring animation for listening/speaking */}
                  {(isListening || isSpeaking) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-lg opacity-50 animate-pulse" />
                  )}

                  <div
                    className={`relative h-16 w-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                      isListening
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/30'
                        : isSpeaking
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30'
                        : status === 'connecting' || status === 'processing'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30'
                        : 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30 hover:scale-105'
                    }`}
                  >
                    {status === 'connecting' || status === 'processing' ? (
                      <Loader2 className="h-7 w-7 text-white animate-spin" />
                    ) : isListening ? (
                      <MicOff className="h-7 w-7 text-white" />
                    ) : (
                      <Mic className="h-7 w-7 text-white" />
                    )}
                  </div>
                </button>

                {/* End call button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleClose}
                  className="h-10 w-10 rounded-full bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>

              {/* Mic button label */}
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
                {getMicButtonText()}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
