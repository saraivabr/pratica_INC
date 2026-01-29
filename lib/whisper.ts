/**
 * Whisper Audio Transcription
 * 
 * Integração com OpenAI Whisper API para transcrever áudios do WhatsApp
 */

import OpenAI from 'openai';
import FormData from 'form-data';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Download media from Evolution API
 */
export async function downloadMediaFromEvolution(
  instanceName: string,
  messageId: string
): Promise<Buffer> {
  const baseUrl = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080';
  const apiKey = process.env.EVOLUTION_API_KEY;

  const url = `${baseUrl}/message/download/${instanceName}/${messageId}`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': apiKey || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  return buffer;
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/ogg'
): Promise<TranscriptionResult> {
  try {
    // Whisper API requires multipart form data with file
    const formData = new FormData();
    
    // Determine file extension from MIME type
    let extension = 'ogg';
    if (mimeType.includes('mp4')) extension = 'm4a';
    else if (mimeType.includes('mpeg')) extension = 'mp3';
    else if (mimeType.includes('wav')) extension = 'wav';
    
    // Append audio file to form data
    formData.append('file', audioBuffer, {
      filename: `audio.${extension}`,
      contentType: mimeType,
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Portuguese
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} ${errorText}`);
    }

    const result = await response.json() as any;

    return {
      text: result.text?.trim() || '',
      language: result.language,
      duration: result.duration,
    };
  } catch (error: any) {
    console.error('[Whisper] Transcription error:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Download and transcribe audio from WhatsApp message
 */
export async function transcribeWhatsAppAudio(
  instanceName: string,
  audioMessage: any
): Promise<TranscriptionResult> {
  try {
    // Extract media info from Evolution API message
    const mediaUrl = audioMessage.url;
    const mimetype = audioMessage.mimetype || 'audio/ogg';
    
    console.log('[Whisper] Downloading audio:', {
      instance: instanceName,
      url: mediaUrl,
      mimetype,
    });

    // Download audio file
    let audioBuffer: Buffer;
    
    if (mediaUrl) {
      // Direct URL download
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`Failed to download from URL: ${response.statusText}`);
      }
      audioBuffer = await response.buffer();
    } else {
      throw new Error('No media URL found in audioMessage');
    }

    console.log('[Whisper] Audio downloaded, size:', audioBuffer.length, 'bytes');

    // Transcribe
    const result = await transcribeAudio(audioBuffer, mimetype);
    
    console.log('[Whisper] Transcription result:', {
      text: result.text.substring(0, 100),
      language: result.language,
      duration: result.duration,
    });

    return result;
  } catch (error: any) {
    console.error('[Whisper] Failed to transcribe WhatsApp audio:', error);
    throw error;
  }
}

/**
 * Extract audio message from Evolution API message data
 */
export function extractAudioMessage(message: any): any | null {
  const messageContent = message.message || {};
  
  // WhatsApp audio can come as audioMessage or ptt (push-to-talk)
  if (messageContent.audioMessage) {
    return messageContent.audioMessage;
  }
  
  if (messageContent.ptt) {
    return messageContent.ptt;
  }
  
  return null;
}

/**
 * Check if message contains audio
 */
export function isAudioMessage(message: any): boolean {
  const messageContent = message.message || {};
  return !!(messageContent.audioMessage || messageContent.ptt);
}
