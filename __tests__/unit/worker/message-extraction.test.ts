import { describe, test, expect } from 'vitest'

// Message extraction utility (replicated from worker.mjs for testing)
function extractMessageText(message: any): string | null {
  if (!message) return null

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    null
  )
}

describe('extractMessageText', () => {
  describe('Simple text messages', () => {
    test('extracts text from conversation field', () => {
      const message = {
        conversation: 'Hello, this is a test message'
      }

      expect(extractMessageText(message)).toBe('Hello, this is a test message')
    })

    test('handles empty conversation string', () => {
      const message = {
        conversation: ''
      }

      // Empty string is falsy, so will fall through to null
      expect(extractMessageText(message)).toBeNull()
    })
  })

  describe('Extended text messages', () => {
    test('extracts text from extendedTextMessage', () => {
      const message = {
        extendedTextMessage: {
          text: 'Extended message with formatting'
        }
      }

      expect(extractMessageText(message)).toBe('Extended message with formatting')
    })

    test('prefers conversation over extendedTextMessage when both present', () => {
      const message = {
        conversation: 'Conversation text',
        extendedTextMessage: {
          text: 'Extended text'
        }
      }

      // conversation is checked first
      expect(extractMessageText(message)).toBe('Conversation text')
    })
  })

  describe('Media messages', () => {
    test('extracts caption from imageMessage', () => {
      const message = {
        imageMessage: {
          caption: 'Photo of the property',
          url: 'https://example.com/image.jpg',
          mimetype: 'image/jpeg'
        }
      }

      expect(extractMessageText(message)).toBe('Photo of the property')
    })

    test('extracts caption from videoMessage', () => {
      const message = {
        videoMessage: {
          caption: 'Property tour video',
          url: 'https://example.com/video.mp4',
          mimetype: 'video/mp4'
        }
      }

      expect(extractMessageText(message)).toBe('Property tour video')
    })

    test('returns null for image without caption', () => {
      const message = {
        imageMessage: {
          url: 'https://example.com/image.jpg',
          mimetype: 'image/jpeg'
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })

    test('returns null for video without caption', () => {
      const message = {
        videoMessage: {
          url: 'https://example.com/video.mp4',
          mimetype: 'video/mp4'
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })

    test('prefers text over media captions', () => {
      const message = {
        conversation: 'Text message',
        imageMessage: {
          caption: 'Image caption'
        }
      }

      expect(extractMessageText(message)).toBe('Text message')
    })
  })

  describe('Interactive messages', () => {
    test('extracts selectedButtonId from buttonsResponseMessage', () => {
      const message = {
        buttonsResponseMessage: {
          selectedButtonId: 'confirm_appointment',
          selectedDisplayText: 'Confirmar'
        }
      }

      expect(extractMessageText(message)).toBe('confirm_appointment')
    })

    test('extracts selectedRowId from listResponseMessage', () => {
      const message = {
        listResponseMessage: {
          singleSelectReply: {
            selectedRowId: 'apartment_2bed'
          }
        }
      }

      expect(extractMessageText(message)).toBe('apartment_2bed')
    })

    test('handles button response without selectedButtonId', () => {
      const message = {
        buttonsResponseMessage: {
          selectedDisplayText: 'Some text'
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })

    test('handles list response without selectedRowId', () => {
      const message = {
        listResponseMessage: {
          singleSelectReply: {}
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })
  })

  describe('Unsupported message types', () => {
    test('returns null for document message', () => {
      const message = {
        documentMessage: {
          fileName: 'contract.pdf',
          mimetype: 'application/pdf'
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })

    test('returns null for audio message', () => {
      const message = {
        audioMessage: {
          url: 'https://example.com/audio.mp3',
          mimetype: 'audio/mpeg'
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })

    test('returns null for sticker message', () => {
      const message = {
        stickerMessage: {
          url: 'https://example.com/sticker.webp'
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })

    test('returns null for contact message', () => {
      const message = {
        contactMessage: {
          displayName: 'John Doe',
          vcard: 'BEGIN:VCARD...'
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })

    test('returns null for location message', () => {
      const message = {
        locationMessage: {
          degreesLatitude: -23.5505,
          degreesLongitude: -46.6333
        }
      }

      expect(extractMessageText(message)).toBeNull()
    })
  })

  describe('Edge cases', () => {
    test('returns null for empty message object', () => {
      const message = {}

      expect(extractMessageText(message)).toBeNull()
    })

    test('returns null for null message', () => {
      expect(extractMessageText(null)).toBeNull()
    })

    test('returns null for undefined message', () => {
      expect(extractMessageText(undefined)).toBeNull()
    })

    test('handles message with multiple fields (priority order)', () => {
      const message = {
        conversation: 'Priority 1',
        extendedTextMessage: { text: 'Priority 2' },
        imageMessage: { caption: 'Priority 3' },
        videoMessage: { caption: 'Priority 4' },
        buttonsResponseMessage: { selectedButtonId: 'Priority 5' },
        listResponseMessage: { singleSelectReply: { selectedRowId: 'Priority 6' } }
      }

      // Should extract in order: conversation first
      expect(extractMessageText(message)).toBe('Priority 1')
    })

    test('handles message with only button response', () => {
      const message = {
        buttonsResponseMessage: {
          selectedButtonId: 'schedule_visit',
          selectedDisplayText: 'Agendar Visita'
        }
      }

      expect(extractMessageText(message)).toBe('schedule_visit')
    })

    test('handles message with only list response', () => {
      const message = {
        listResponseMessage: {
          singleSelectReply: {
            selectedRowId: 'property_type_house'
          }
        }
      }

      expect(extractMessageText(message)).toBe('property_type_house')
    })
  })

  describe('Real-world message scenarios', () => {
    test('extracts lead inquiry message', () => {
      const message = {
        conversation: 'Olá, gostaria de agendar uma visita ao imóvel no Jardins'
      }

      expect(extractMessageText(message)).toBe('Olá, gostaria de agendar uma visita ao imóvel no Jardins')
    })

    test('extracts property photo caption', () => {
      const message = {
        imageMessage: {
          caption: 'Foto da sala do apartamento',
          url: 'encrypted-url',
          mimetype: 'image/jpeg',
          fileSha256: Buffer.from('sha256'),
          fileLength: 123456
        }
      }

      expect(extractMessageText(message)).toBe('Foto da sala do apartamento')
    })

    test('extracts confirmation button response', () => {
      const message = {
        buttonsResponseMessage: {
          selectedButtonId: 'confirm_schedule_2024-01-20_14:00',
          selectedDisplayText: 'Confirmar agendamento'
        }
      }

      expect(extractMessageText(message)).toBe('confirm_schedule_2024-01-20_14:00')
    })

    test('extracts property type selection from list', () => {
      const message = {
        listResponseMessage: {
          singleSelectReply: {
            selectedRowId: 'apartment_3bed_2bath'
          },
          title: 'Tipo de Imóvel'
        }
      }

      expect(extractMessageText(message)).toBe('apartment_3bed_2bath')
    })
  })
})
