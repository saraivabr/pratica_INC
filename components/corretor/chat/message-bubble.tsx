import {
  Check,
  CheckCheck,
  Clock,
  X,
  FileText,
  Mic,
  Download,
  ImageOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from './types';

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function MessageStatus({ status, isFromMe }: { status?: string; isFromMe: boolean }) {
  if (!isFromMe) return null;

  switch (status) {
    case 'read':
      return <CheckCheck className="w-4 h-4 text-blue-400" />;
    case 'delivered':
      return <CheckCheck className="w-4 h-4" />;
    case 'sent':
      return <Check className="w-4 h-4" />;
    case 'pending':
      return <Clock className="w-3 h-3" />;
    case 'failed':
      return <X className="w-4 h-4 text-red-400" />;
    default:
      return <Check className="w-4 h-4" />;
  }
}

/**
 * Format WhatsApp-style text: *bold*, _italic_, ~strike~, `code`, and linkify URLs.
 */
function formatWhatsAppText(text: string): string {
  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // URLs → clickable links
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">$1</a>'
  );

  // WhatsApp formatting (only between word boundaries)
  html = html.replace(/\*([^\s*][^*]*[^\s*])\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\w)_([^\s_][^_]*[^\s_])_(?!\w)/g, '<em>$1</em>');
  html = html.replace(/~([^\s~][^~]*[^\s~])~/g, '<s>$1</s>');
  html = html.replace(/```([^`]+)```/g, '<code class="block bg-black/10 rounded p-1 text-xs">$1</code>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-black/10 rounded px-1 text-xs">$1</code>');

  return html;
}

function getMessageTypeCategory(type: string | undefined): string {
  if (!type) return 'text';
  if (type.includes('image')) return 'image';
  if (type.includes('video')) return 'video';
  if (type.includes('audio') || type.includes('ptt')) return 'audio';
  if (type.includes('document')) return 'document';
  if (type.includes('sticker')) return 'sticker';
  return 'text';
}

function MediaContent({ message }: { message: Message }) {
  const category = getMessageTypeCategory(message.message_type);
  const mediaUrl = message.media_url;

  // No media URL but type indicates media → placeholder
  if (!mediaUrl && category !== 'text') {
    return (
      <div className="p-3 flex items-center gap-2 opacity-60">
        <ImageOff className="w-5 h-5" />
        <span className="text-xs italic">Midia nao disponivel</span>
      </div>
    );
  }

  if (!mediaUrl) return null;

  switch (category) {
    case 'image':
      return (
        <div className="p-1">
          <img
            src={mediaUrl}
            alt={message.caption || 'Imagem'}
            className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
            onClick={() => window.open(mediaUrl, '_blank')}
            loading="lazy"
          />
        </div>
      );

    case 'video':
      return (
        <div className="p-1">
          <video
            src={mediaUrl}
            controls
            preload="metadata"
            className="rounded-xl max-w-full max-h-64"
          />
        </div>
      );

    case 'audio':
      return (
        <div className={cn(
          'px-3 py-2 flex items-center gap-2',
        )}>
          <Mic className={cn(
            'w-5 h-5 flex-shrink-0',
            message.is_from_me ? 'text-emerald-200' : 'text-emerald-600'
          )} />
          <audio
            src={mediaUrl}
            controls
            preload="metadata"
            className="flex-1 h-8 max-w-[240px]"
            style={{ colorScheme: message.is_from_me ? 'dark' : 'light' }}
          />
        </div>
      );

    case 'document': {
      // Try to extract filename from raw_data
      const rawData = typeof message.raw_data === 'string'
        ? (() => { try { return JSON.parse(message.raw_data); } catch { return null; } })()
        : message.raw_data;
      const docName = rawData?.message?.documentMessage?.fileName
        || mediaUrl.split('/').pop()
        || 'Documento';

      return (
        <div className="p-2">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl transition',
              message.is_from_me
                ? 'bg-emerald-700/50 hover:bg-emerald-700/70'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            <FileText className={cn(
              'w-8 h-8 flex-shrink-0',
              message.is_from_me ? 'text-emerald-200' : 'text-gray-500'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{docName}</p>
              <p className={cn(
                'text-[10px]',
                message.is_from_me ? 'text-emerald-200' : 'text-gray-400'
              )}>Documento</p>
            </div>
            <Download className={cn(
              'w-4 h-4 flex-shrink-0',
              message.is_from_me ? 'text-emerald-200' : 'text-gray-400'
            )} />
          </a>
        </div>
      );
    }

    case 'sticker':
      return (
        <div className="p-1">
          <img
            src={mediaUrl}
            alt="Figurinha"
            className="max-w-32 max-h-32"
            loading="lazy"
          />
        </div>
      );

    default:
      return null;
  }
}

export function MessageBubble({ message }: { message: Message }) {
  const category = getMessageTypeCategory(message.message_type);
  const displayText = message.caption || message.message_text;
  const hasTextContent = !!displayText && displayText.trim().length > 0;

  // Stickers render without bubble background
  if (category === 'sticker' && message.media_url) {
    return (
      <div className={cn('flex', message.is_from_me ? 'justify-end' : 'justify-start')}>
        <div className="max-w-[85%] sm:max-w-md">
          <MediaContent message={message} />
          <div className={cn(
            'flex items-center gap-1 px-1 text-[10px] text-gray-400',
            message.is_from_me ? 'justify-end' : ''
          )}>
            <span>{formatTime(message.timestamp)}</span>
            <MessageStatus status={message.status} isFromMe={message.is_from_me} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', message.is_from_me ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] sm:max-w-md rounded-2xl shadow-sm',
          message.is_from_me
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
        )}
      >
        {/* Media content */}
        <MediaContent message={message} />

        {/* Text content */}
        {hasTextContent && (
          <div className="px-3 py-2">
            <p
              className="whitespace-pre-wrap break-words text-sm"
              dangerouslySetInnerHTML={{ __html: formatWhatsAppText(displayText!) }}
            />
          </div>
        )}

        {/* Timestamp and status */}
        <div
          className={cn(
            'flex items-center gap-1 px-3 pb-2 text-[10px]',
            message.is_from_me ? 'text-emerald-100 justify-end' : 'text-gray-400'
          )}
        >
          <span>{formatTime(message.timestamp)}</span>
          <MessageStatus status={message.status} isFromMe={message.is_from_me} />
        </div>
      </div>
    </div>
  );
}
