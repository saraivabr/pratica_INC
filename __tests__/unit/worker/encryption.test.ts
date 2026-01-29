import { describe, test, expect, beforeAll } from 'vitest'
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

// Encryption utilities (replicated from worker.mjs for testing)
function getKeyBuffer(sessionKey: string): Buffer {
  if (sessionKey.length === 64 && /^[0-9a-f]+$/i.test(sessionKey)) {
    return Buffer.from(sessionKey, 'hex')
  }
  return Buffer.from(sessionKey, 'base64')
}

function encryptString(plainText: string, sessionKey: string): string {
  const iv = randomBytes(12)
  const key = getKeyBuffer(sessionKey)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

function decryptString(payload: string, sessionKey: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload')
  }
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const key = getKeyBuffer(sessionKey)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

describe('Encryption Utilities', () => {
  const testKey = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' // 64 hex chars

  beforeAll(() => {
    process.env.WHATSAPP_SESSION_KEY = testKey
  })

  describe('encryptString', () => {
    test('produces valid encrypted payload with correct format', () => {
      const plainText = 'sensitive session data'
      const encrypted = encryptString(plainText, testKey)

      // Verify format: iv.tag.data (base64 components separated by dots)
      const parts = encrypted.split('.')
      expect(parts.length).toBe(3)

      // Verify each part is valid base64
      parts.forEach(part => {
        expect(() => Buffer.from(part, 'base64')).not.toThrow()
      })
    })

    test('produces correct component lengths', () => {
      const plainText = 'test data'
      const encrypted = encryptString(plainText, testKey)
      const [ivB64, tagB64, dataB64] = encrypted.split('.')

      // IV should be 12 bytes (16 chars in base64)
      const iv = Buffer.from(ivB64, 'base64')
      expect(iv.length).toBe(12)

      // Auth tag should be 16 bytes
      const tag = Buffer.from(tagB64, 'base64')
      expect(tag.length).toBe(16)

      // Data should exist
      const data = Buffer.from(dataB64, 'base64')
      expect(data.length).toBeGreaterThan(0)
    })

    test('does not leak plaintext in encrypted output', () => {
      const plainText = 'this is a secret message'
      const encrypted = encryptString(plainText, testKey)

      expect(encrypted).not.toContain(plainText)
      expect(encrypted.toLowerCase()).not.toContain('secret')
    })

    test('produces unique output for same input (random IV)', () => {
      const plainText = 'same text'
      const encrypted1 = encryptString(plainText, testKey)
      const encrypted2 = encryptString(plainText, testKey)

      // Should differ due to random IV
      expect(encrypted1).not.toBe(encrypted2)

      // But both should decrypt to same value
      expect(decryptString(encrypted1, testKey)).toBe(plainText)
      expect(decryptString(encrypted2, testKey)).toBe(plainText)
    })
  })

  describe('decryptString', () => {
    test('correctly decrypts encrypted data (round-trip)', () => {
      const plainText = 'original message'
      const encrypted = encryptString(plainText, testKey)
      const decrypted = decryptString(encrypted, testKey)

      expect(decrypted).toBe(plainText)
    })

    test('handles complex JSON data', () => {
      const complexData = JSON.stringify({
        creds: { noiseKey: 'abc123', registrationId: 12345 },
        keys: ['key1', 'key2', 'key3'],
        nested: { deep: { value: 'test' } }
      })

      const encrypted = encryptString(complexData, testKey)
      const decrypted = decryptString(encrypted, testKey)

      expect(decrypted).toBe(complexData)
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(complexData))
    })

    test('handles Unicode characters', () => {
      const plainText = 'Olá! Mensagem com acentuação: çãõéú 🎉'
      const encrypted = encryptString(plainText, testKey)
      const decrypted = decryptString(encrypted, testKey)

      expect(decrypted).toBe(plainText)
    })

    test('throws on invalid payload format (missing components)', () => {
      expect(() => decryptString('invalid', testKey)).toThrow('Invalid encrypted payload')
      expect(() => decryptString('only.two', testKey)).toThrow('Invalid encrypted payload')
      expect(() => decryptString('..', testKey)).toThrow('Invalid encrypted payload')
    })

    test('throws on tampered ciphertext', () => {
      const plainText = 'original data'
      const encrypted = encryptString(plainText, testKey)

      // Tamper with the data component
      const parts = encrypted.split('.')
      const tamperedData = Buffer.from(parts[2], 'base64')
      tamperedData[0] ^= 0xFF // Flip bits
      parts[2] = tamperedData.toString('base64')
      const tampered = parts.join('.')

      expect(() => decryptString(tampered, testKey)).toThrow()
    })

    test('throws on tampered auth tag', () => {
      const plainText = 'original data'
      const encrypted = encryptString(plainText, testKey)

      // Tamper with the tag component
      const parts = encrypted.split('.')
      const tamperedTag = Buffer.from(parts[1], 'base64')
      tamperedTag[0] ^= 0xFF
      parts[1] = tamperedTag.toString('base64')
      const tampered = parts.join('.')

      expect(() => decryptString(tampered, testKey)).toThrow()
    })
  })

  describe('getKeyBuffer', () => {
    test('handles 64-character hex key', () => {
      const hexKey = 'a'.repeat(64) // 32 bytes as hex
      const keyBuffer = getKeyBuffer(hexKey)

      expect(keyBuffer).toBeInstanceOf(Buffer)
      expect(keyBuffer.length).toBe(32) // AES-256 requires 32 bytes
    })

    test('handles base64 key', () => {
      const base64Key = Buffer.from('a'.repeat(32)).toString('base64')
      const keyBuffer = getKeyBuffer(base64Key)

      expect(keyBuffer).toBeInstanceOf(Buffer)
      expect(keyBuffer.length).toBe(32)
    })

    test('hex key and equivalent base64 key produce different buffers', () => {
      const hexKey = '0'.repeat(64)
      const hexBuffer = getKeyBuffer(hexKey)

      // Same data as base64
      const base64Key = Buffer.from('0'.repeat(32)).toString('base64')
      const base64Buffer = getKeyBuffer(base64Key)

      // Should be different because hex interprets as hex digits
      expect(hexBuffer.toString('hex')).not.toBe(base64Buffer.toString('hex'))
    })

    test('identifies hex format correctly', () => {
      const validHex = 'abcdef0123456789'.repeat(4) // 64 hex chars
      const keyBuffer = getKeyBuffer(validHex)

      // Verify it was interpreted as hex
      expect(keyBuffer.toString('hex')).toBe(validHex.toLowerCase())
    })

    test('falls back to base64 for non-hex strings', () => {
      const nonHex = 'ghijklmnopqrstuvwxyz'.repeat(4) // 80 chars, not all hex
      const keyBuffer = getKeyBuffer(nonHex)

      // Should interpret as base64
      expect(keyBuffer).toBeInstanceOf(Buffer)
    })
  })

  describe('Encryption Security Properties', () => {
    test('different keys produce different ciphertexts', () => {
      const plainText = 'same message'
      const key1 = 'a'.repeat(64)
      const key2 = 'b'.repeat(64)

      const encrypted1 = encryptString(plainText, key1)
      const encrypted2 = encryptString(plainText, key2)

      expect(encrypted1).not.toBe(encrypted2)

      // Each decrypts with its own key
      expect(decryptString(encrypted1, key1)).toBe(plainText)
      expect(decryptString(encrypted2, key2)).toBe(plainText)

      // Wrong key fails
      expect(() => decryptString(encrypted1, key2)).toThrow()
    })

    test('very short strings can be encrypted and decrypted', () => {
      const plainText = 'a'
      const encrypted = encryptString(plainText, testKey)
      const decrypted = decryptString(encrypted, testKey)

      expect(decrypted).toBe('a')
    })

    test('very long strings can be encrypted and decrypted', () => {
      const plainText = 'a'.repeat(10000) // 10KB of data
      const encrypted = encryptString(plainText, testKey)
      const decrypted = decryptString(encrypted, testKey)

      expect(decrypted).toBe(plainText)
    })

    test('binary data (when base64 encoded) survives encryption', () => {
      const binaryData = randomBytes(256).toString('base64')
      const encrypted = encryptString(binaryData, testKey)
      const decrypted = decryptString(encrypted, testKey)

      expect(decrypted).toBe(binaryData)
    })
  })
})
