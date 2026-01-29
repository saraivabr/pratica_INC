import 'dotenv/config'

// Voice agent is optional - warn if key is missing but don't crash
if (!process.env.GOOGLE_AI_API_KEY) {
  console.warn('[VoiceAgent] GOOGLE_AI_API_KEY not set - voice agent will be disabled')
}

export const config = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  GEMINI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GEMINI_MODEL: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
  GEMINI_WS_URL: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
  DATABASE_URL: process.env.DATABASE_URL,

  AUDIO: {
    INPUT_SAMPLE_RATE: 16000,
    OUTPUT_SAMPLE_RATE: 24000,
    CHUNK_SIZE: 4096,
  },

  SESSION: {
    MAX_SESSIONS: 50,
    SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    HEARTBEAT_INTERVAL_MS: 30000,
  },
}

export default config
