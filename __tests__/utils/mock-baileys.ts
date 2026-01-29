import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'

export interface MockBaileysMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message?: any
  messageTimestamp?: number
}

export class MockBaileysSocket extends EventEmitter {
  public user: { id: string; name: string } | null = null
  public status: 'connecting' | 'qr' | 'ready' | 'disconnected' | 'error' = 'connecting'
  public sendMessageCalls: Array<{ jid: string; content: any }> = []
  public logoutCalled = false

  async sendMessage(jid: string, content: any): Promise<any> {
    if (this.status !== 'ready') {
      throw new Error('Not connected')
    }

    this.sendMessageCalls.push({ jid, content })

    return {
      key: {
        id: randomUUID(),
        remoteJid: jid,
        fromMe: true
      },
      message: content,
      messageTimestamp: Math.floor(Date.now() / 1000)
    }
  }

  async logout(): Promise<void> {
    this.logoutCalled = true
    this.status = 'disconnected'
    this.user = null
    this.emit('connection.update', {
      connection: 'close',
      lastDisconnect: {
        error: { message: 'Logged out' }
      }
    })
  }

  // Test helpers to simulate Baileys events

  simulateQR(qrCode: string): void {
    this.status = 'qr'
    this.emit('connection.update', { qr: qrCode })
  }

  simulateConnected(phone: string, deviceName: string = 'Mock Device'): void {
    this.status = 'ready'
    this.user = {
      id: `${phone}@s.whatsapp.net`,
      name: deviceName
    }
    this.emit('connection.update', {
      connection: 'open',
      user: this.user
    })
  }

  simulateDisconnect(reason: string = 'Connection lost'): void {
    this.status = 'disconnected'
    this.user = null
    this.emit('connection.update', {
      connection: 'close',
      lastDisconnect: {
        error: { message: reason }
      }
    })
  }

  simulateError(errorMessage: string): void {
    this.status = 'error'
    this.emit('connection.update', {
      connection: 'close',
      lastDisconnect: {
        error: new Error(errorMessage)
      }
    })
  }

  simulateIncomingMessage(message: MockBaileysMessage): void {
    this.emit('messages.upsert', {
      messages: [message],
      type: 'notify'
    })
  }

  simulateIncomingMessages(messages: MockBaileysMessage[]): void {
    this.emit('messages.upsert', {
      messages,
      type: 'notify'
    })
  }

  // Helper to reset mock state
  reset(): void {
    this.user = null
    this.status = 'connecting'
    this.sendMessageCalls = []
    this.logoutCalled = false
    this.removeAllListeners()
  }
}

// Factory function to create mock Baileys socket
export function createMockBaileysSocket(): MockBaileysSocket {
  return new MockBaileysSocket()
}

// Mock makeWASocket function that returns MockBaileysSocket
export function mockMakeWASocket(socket?: MockBaileysSocket): () => MockBaileysSocket {
  const mockSocket = socket || createMockBaileysSocket()
  return () => mockSocket
}

// Helper to create mock auth state
export function createMockAuthState(): any {
  return {
    creds: {
      noiseKey: {
        private: Buffer.from('mock-private-key'),
        public: Buffer.from('mock-public-key')
      },
      signedIdentityKey: {
        private: Buffer.from('mock-identity-private'),
        public: Buffer.from('mock-identity-public')
      },
      signedPreKey: {
        keyPair: {
          private: Buffer.from('mock-prekey-private'),
          public: Buffer.from('mock-prekey-public')
        },
        keyId: 1
      },
      registrationId: 12345,
      advSecretKey: 'mock-adv-secret',
      me: {
        id: '5511999999999@s.whatsapp.net',
        name: 'Mock User'
      }
    },
    keys: {
      get: async () => null,
      set: async () => {}
    }
  }
}
