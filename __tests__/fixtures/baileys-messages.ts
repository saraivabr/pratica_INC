import { randomUUID } from 'crypto'
import type { MockBaileysMessage } from '../utils/mock-baileys'

// Mock Baileys message factory
export const mockBaileysMessage = {
  /**
   * Creates a simple text message
   */
  text: (from: string, text: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: fromMe ? `${from}@s.whatsapp.net` : `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      conversation: text
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates an extended text message (with mentions, links, etc.)
   */
  extendedText: (from: string, text: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      extendedTextMessage: {
        text
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates an image message with caption
   */
  image: (from: string, caption: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      imageMessage: {
        caption,
        mimetype: 'image/jpeg',
        url: 'mock-image-url',
        fileSha256: Buffer.from('mock-sha256'),
        fileLength: 12345
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates a video message with caption
   */
  video: (from: string, caption: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      videoMessage: {
        caption,
        mimetype: 'video/mp4',
        url: 'mock-video-url'
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates a document message
   */
  document: (from: string, fileName: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      documentMessage: {
        fileName,
        mimetype: 'application/pdf',
        url: 'mock-document-url'
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates a button response message
   */
  buttonResponse: (from: string, buttonId: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      buttonsResponseMessage: {
        selectedButtonId: buttonId,
        selectedDisplayText: `Button ${buttonId}`
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates a list response message
   */
  listResponse: (from: string, listId: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      listResponseMessage: {
        singleSelectReply: {
          selectedRowId: listId
        }
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates a contact message
   */
  contact: (from: string, contactName: string, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      contactMessage: {
        displayName: contactName,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nEND:VCARD`
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  }),

  /**
   * Creates a location message
   */
  location: (from: string, latitude: number, longitude: number, fromMe: boolean = false): MockBaileysMessage => ({
    key: {
      remoteJid: `${from}@s.whatsapp.net`,
      fromMe,
      id: randomUUID()
    },
    message: {
      locationMessage: {
        degreesLatitude: latitude,
        degreesLongitude: longitude
      }
    },
    messageTimestamp: Math.floor(Date.now() / 1000)
  })
}

// Common test scenarios
export const testMessages = {
  // Simple greeting
  greeting: mockBaileysMessage.text('5511999999999', 'Olá!'),

  // Lead inquiry
  leadInquiry: mockBaileysMessage.text(
    '5511988887777',
    'Olá, gostaria de agendar uma visita ao apartamento no Jardins'
  ),

  // Follow-up message
  followUp: mockBaileysMessage.text('5511977776666', 'Já conseguiu falar com o proprietário?'),

  // Image with property photo
  propertyPhoto: mockBaileysMessage.image('5511966665555', 'Foto do imóvel que visitei hoje'),

  // Button response for scheduling
  scheduleConfirm: mockBaileysMessage.buttonResponse('5511955554444', 'confirm-schedule'),

  // List selection for property type
  propertyTypeSelection: mockBaileysMessage.listResponse('5511944443333', 'apartment-2bed'),

  // Contact sharing
  ownerContact: mockBaileysMessage.contact('5511933332222', 'João Proprietário'),

  // Property location
  propertyLocation: mockBaileysMessage.location('5511922221111', -23.550520, -46.633308)
}
