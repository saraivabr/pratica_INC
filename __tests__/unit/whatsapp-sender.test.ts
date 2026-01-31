/**
 * Tests for lib/whatsapp-sender.ts
 *
 * Validates:
 * 1. Default (no provider) → Z-API
 * 2. withProvider('evolution') → Evolution API
 * 3. Nested contexts restore correctly
 * 4. Interactive fallbacks (buttons→text, lists→text, action→inline URL)
 * 5. Media routing (image, document)
 * 6. Location fallback (→ Google Maps link)
 * 7. Context isolation (concurrent calls don't leak)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// MOCKS — must be before import
// ============================================

// Mock Z-API
vi.mock('@/lib/zapi', () => ({
  sendTextMessage: vi.fn().mockResolvedValue({ messageId: 'zapi-msg-1' }),
  sendQuickButtons: vi.fn().mockResolvedValue({ messageId: 'zapi-btn-1' }),
  sendOptionList: vi.fn().mockResolvedValue({ messageId: 'zapi-list-1' }),
  sendActionButtons: vi.fn().mockResolvedValue({ messageId: 'zapi-action-1' }),
  sendImage: vi.fn().mockResolvedValue({ messageId: 'zapi-img-1' }),
  sendDocument: vi.fn().mockResolvedValue({ messageId: 'zapi-doc-1' }),
  sendLocation: vi.fn().mockResolvedValue({ messageId: 'zapi-loc-1' }),
  sendReaction: vi.fn().mockResolvedValue({ messageId: 'zapi-react-1' }),
}));

// Mock Evolution API
vi.mock('@/lib/evolution-api', () => ({
  sendTextMessage: vi.fn().mockResolvedValue({ key: { id: 'evo-msg-1', remoteJid: '5511999999999@s.whatsapp.net' } }),
  sendMediaMessage: vi.fn().mockResolvedValue({ key: { id: 'evo-media-1' } }),
  sendTyping: vi.fn().mockResolvedValue(undefined),
  formatPhoneNumber: vi.fn((phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  }),
}));

// Mock zapi-client (transitive dep of zapi)
vi.mock('@/lib/zapi-client', () => ({
  zapiRequestWithRetry: vi.fn().mockResolvedValue({ ok: true, messageId: 'zapi-raw-1' }),
}));

import {
  withProvider,
  getCurrentProvider,
  sendTextMessage,
  sendQuickButtons,
  sendOptionList,
  sendActionButtons,
  sendImage,
  sendDocument,
  sendLocation,
  sendReaction,
  askYesNo,
  askAction,
  sendBairrosMenu,
  askEntrada,
  askPostSimulacao,
  sendButtonMessage,
  sendButtonActions,
} from '@/lib/whatsapp-sender';

import * as zapi from '@/lib/zapi';
import * as evolution from '@/lib/evolution-api';

// ============================================
// TESTS
// ============================================

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Provider context (AsyncLocalStorage)', () => {
  it('returns undefined when no provider is set', () => {
    expect(getCurrentProvider()).toBeUndefined();
  });

  it('returns context inside withProvider', async () => {
    await withProvider('evolution', 'test-instance', async () => {
      const ctx = getCurrentProvider();
      expect(ctx).toEqual({ provider: 'evolution', instanceName: 'test-instance' });
    });
  });

  it('restores undefined after withProvider completes', async () => {
    await withProvider('evolution', 'test-instance', async () => {
      // inside
    });
    expect(getCurrentProvider()).toBeUndefined();
  });

  it('handles nested providers correctly (inner overrides, outer restores)', async () => {
    await withProvider('evolution', 'outer-instance', async () => {
      expect(getCurrentProvider()?.instanceName).toBe('outer-instance');

      await withProvider('zapi', 'inner-zapi', async () => {
        expect(getCurrentProvider()?.provider).toBe('zapi');
      });

      // After inner completes, outer context is restored
      expect(getCurrentProvider()?.provider).toBe('evolution');
      expect(getCurrentProvider()?.instanceName).toBe('outer-instance');
    });
  });

  it('isolates concurrent contexts', async () => {
    const results: string[] = [];

    await Promise.all([
      withProvider('evolution', 'instance-A', async () => {
        await new Promise(r => setTimeout(r, 10));
        results.push(`A:${getCurrentProvider()?.instanceName}`);
      }),
      withProvider('evolution', 'instance-B', async () => {
        await new Promise(r => setTimeout(r, 5));
        results.push(`B:${getCurrentProvider()?.instanceName}`);
      }),
    ]);

    expect(results).toContain('A:instance-A');
    expect(results).toContain('B:instance-B');
  });
});

describe('sendTextMessage routing', () => {
  it('routes to Z-API without provider context', async () => {
    await sendTextMessage('5511999999999', 'Hello');
    expect(zapi.sendTextMessage).toHaveBeenCalledWith('5511999999999', 'Hello', undefined);
    expect(evolution.sendTextMessage).not.toHaveBeenCalled();
  });

  it('routes to Evolution inside withProvider', async () => {
    await withProvider('evolution', 'my-instance', async () => {
      await sendTextMessage('11999999999', 'Hello from evo');
    });

    expect(evolution.sendTextMessage).toHaveBeenCalledWith('my-instance', {
      number: '5511999999999',
      text: 'Hello from evo',
    });
    expect(zapi.sendTextMessage).not.toHaveBeenCalled();
  });

  it('sends typing indicator when delayTyping is set (Evolution)', async () => {
    await withProvider('evolution', 'my-instance', async () => {
      await sendTextMessage('11999999999', 'Typing test', { delayTyping: 3000 });
    });

    expect(evolution.sendTyping).toHaveBeenCalledWith('my-instance', '5511999999999', 3000);
    expect(evolution.sendTextMessage).toHaveBeenCalled();
  });

  it('returns zapi-shaped response from Evolution', async () => {
    const result = await withProvider('evolution', 'my-instance', async () => {
      return sendTextMessage('11999999999', 'test');
    });

    expect(result).toEqual({
      zapiMessageId: 'evo-msg-1',
      messageId: 'evo-msg-1',
    });
  });
});

describe('Interactive message fallbacks (Evolution)', () => {
  it('sendQuickButtons falls back to numbered text', async () => {
    await withProvider('evolution', 'inst', async () => {
      await sendQuickButtons('5511999999999', 'Escolha:', [
        { id: 'a', label: 'Opcao A' },
        { id: 'b', label: 'Opcao B' },
      ]);
    });

    // Should call sendTextMessage (Evolution) with numbered fallback
    expect(evolution.sendTextMessage).toHaveBeenCalled();
    const call = (evolution.sendTextMessage as any).mock.calls[0];
    expect(call[0]).toBe('inst');
    expect(call[1].text).toContain('1. Opcao A');
    expect(call[1].text).toContain('2. Opcao B');
    expect(call[1].text).toContain('Responda com o número');

    // Should NOT call Z-API
    expect(zapi.sendQuickButtons).not.toHaveBeenCalled();
  });

  it('sendQuickButtons calls Z-API without context', async () => {
    await sendQuickButtons('5511999999999', 'Escolha:', [
      { id: 'a', label: 'A' },
    ]);
    expect(zapi.sendQuickButtons).toHaveBeenCalled();
    expect(evolution.sendTextMessage).not.toHaveBeenCalled();
  });

  it('sendOptionList falls back to numbered text with sections', async () => {
    await withProvider('evolution', 'inst', async () => {
      await sendOptionList('5511999999999', 'Escolha bairro:', 'Bairros', [
        {
          title: 'Centro',
          rows: [
            { id: '1', title: 'Emp A', description: '5 disponíveis' },
            { id: '2', title: 'Emp B' },
          ],
        },
      ]);
    });

    const call = (evolution.sendTextMessage as any).mock.calls[0];
    const text = call[1].text;
    expect(text).toContain('*Centro*');
    expect(text).toContain('1. Emp A - 5 disponíveis');
    expect(text).toContain('2. Emp B');
    expect(text).toContain('Responda com o número');
  });

  it('sendActionButtons includes URLs inline for Evolution', async () => {
    await withProvider('evolution', 'inst', async () => {
      await sendActionButtons('5511999999999', 'Veja online:', [
        { type: 'URL', label: 'Ver', url: 'https://example.com' },
        { type: 'CALL', label: 'Ligar', phone: '5511999' },
        { type: 'REPLY', label: 'Responder' },
      ]);
    });

    const call = (evolution.sendTextMessage as any).mock.calls[0];
    const text = call[1].text;
    expect(text).toContain('Ver: https://example.com');
    expect(text).toContain('Ligar: 5511999');
    expect(text).toContain('Responder');
  });
});

describe('Media routing', () => {
  it('sendImage routes to Evolution sendMediaMessage', async () => {
    await withProvider('evolution', 'inst', async () => {
      await sendImage('11999999999', 'https://img.com/photo.jpg', 'Caption');
    });

    expect(evolution.sendMediaMessage).toHaveBeenCalledWith('inst', {
      number: '5511999999999',
      mediaType: 'image',
      media: { mediaUrl: 'https://img.com/photo.jpg', caption: 'Caption' },
    });
    expect(zapi.sendImage).not.toHaveBeenCalled();
  });

  it('sendImage routes to Z-API without context', async () => {
    await sendImage('11999999999', 'https://img.com/photo.jpg', 'Caption');
    expect(zapi.sendImage).toHaveBeenCalled();
    expect(evolution.sendMediaMessage).not.toHaveBeenCalled();
  });

  it('sendDocument routes to Evolution sendMediaMessage', async () => {
    await withProvider('evolution', 'inst', async () => {
      await sendDocument('11999999999', 'https://files.com/doc.pdf', 'doc.pdf', 'A PDF');
    });

    expect(evolution.sendMediaMessage).toHaveBeenCalledWith('inst', {
      number: '5511999999999',
      mediaType: 'document',
      media: { mediaUrl: 'https://files.com/doc.pdf', fileName: 'doc.pdf', caption: 'A PDF' },
    });
  });
});

describe('Location fallback', () => {
  it('sendLocation falls back to Google Maps text on Evolution', async () => {
    await withProvider('evolution', 'inst', async () => {
      await sendLocation('11999999999', {
        title: 'Escritório',
        address: 'Rua A, 123',
        latitude: -23.55,
        longitude: -46.63,
      });
    });

    const call = (evolution.sendTextMessage as any).mock.calls[0];
    const text = call[1].text;
    expect(text).toContain('Escritório');
    expect(text).toContain('Rua A, 123');
    expect(text).toContain('maps.google.com');
    expect(text).toContain('-23.55');
    expect(zapi.sendLocation).not.toHaveBeenCalled();
  });

  it('sendLocation routes to Z-API without context', async () => {
    await sendLocation('11999999999', {
      title: 'Office',
      address: 'Rua B',
      latitude: -23,
      longitude: -46,
    });
    expect(zapi.sendLocation).toHaveBeenCalled();
  });
});

describe('sendReaction', () => {
  it('is no-op on Evolution (non-critical)', async () => {
    const result = await withProvider('evolution', 'inst', async () => {
      return sendReaction('11999999999', 'msg-1', '👍');
    });
    expect(result).toEqual({});
    expect(zapi.sendReaction).not.toHaveBeenCalled();
  });

  it('routes to Z-API without context', async () => {
    await sendReaction('11999999999', 'msg-1', '👍');
    expect(zapi.sendReaction).toHaveBeenCalled();
  });
});

describe('Convenience functions', () => {
  it('askYesNo delegates to sendQuickButtons', async () => {
    await askYesNo('11999999999', 'Confirma?', 'test');
    expect(zapi.sendQuickButtons).toHaveBeenCalled();
    const call = (zapi.sendQuickButtons as any).mock.calls[0];
    expect(call[2]).toEqual([
      { id: 'test_sim', label: '✅ Sim' },
      { id: 'test_nao', label: '❌ Não' },
    ]);
  });

  it('askAction delegates to sendQuickButtons', async () => {
    await askAction('11999999999', 'O que fazer?', [
      { id: 'a', emoji: '💰', label: 'Simular' },
    ]);
    expect(zapi.sendQuickButtons).toHaveBeenCalled();
  });

  it('askEntrada uses sendQuickButtons', async () => {
    await askEntrada('11999999999', 500000);
    expect(zapi.sendQuickButtons).toHaveBeenCalled();
    const call = (zapi.sendQuickButtons as any).mock.calls[0];
    expect(call[1]).toContain('500.000');
  });

  it('askPostSimulacao delegates correctly', async () => {
    await askPostSimulacao('11999999999');
    expect(zapi.sendQuickButtons).toHaveBeenCalled();
  });

  it('sendBairrosMenu delegates to sendOptionList', async () => {
    await sendBairrosMenu('11999999999', [
      {
        bairro: 'Centro',
        empreendimentos: [{ id: '1', nome: 'Emp A', disponiveis: 3 }],
      },
    ]);
    expect(zapi.sendOptionList).toHaveBeenCalled();
  });
});

describe('Legacy functions', () => {
  it('sendButtonMessage delegates to sendQuickButtons', async () => {
    await sendButtonMessage('11999', 'msg', [{ id: 'a', label: 'A' }]);
    expect(zapi.sendQuickButtons).toHaveBeenCalled();
  });

  it('sendButtonActions delegates to sendActionButtons', async () => {
    await sendButtonActions('11999', 'msg', [{ type: 'REPLY', label: 'R' }]);
    expect(zapi.sendActionButtons).toHaveBeenCalled();
  });
});

describe('withProvider edge cases', () => {
  it('withProvider("zapi") forces Z-API even in nested evolution', async () => {
    await withProvider('evolution', 'inst', async () => {
      await withProvider('zapi', '', async () => {
        await sendTextMessage('11999999999', 'forced zapi');
      });
    });

    expect(zapi.sendTextMessage).toHaveBeenCalledWith('11999999999', 'forced zapi', undefined);
    expect(evolution.sendTextMessage).not.toHaveBeenCalled();
  });

  it('synchronous fn works in withProvider', () => {
    const result = withProvider('evolution', 'inst', () => {
      return getCurrentProvider()?.instanceName;
    });
    expect(result).toBe('inst');
  });
});
