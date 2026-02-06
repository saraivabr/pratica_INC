import {
  Check,
  CheckCheck,
  Clock,
  X,
  FileText,
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

export function MessageBubble({ message }: { message: Message }) {
  const isMedia = message.media_url || message.message_type?.includes('image') || message.message_type?.includes('video');

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
        {isMedia && message.media_url && (
          <div className="p-1">
            {message.message_type?.includes('image') ? (
              <img
                src={message.media_url}
                alt="Imagem"
                className="rounded-xl max-w-full max-h-64 object-cover"
              />
            ) : message.message_type?.includes('video') ? (
              <video
                src={message.media_url}
                controls
                className="rounded-xl max-w-full max-h-64"
              />
            ) : (
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                <FileText className="w-8 h-8 text-gray-500" />
                <span className="text-sm">Abrir documento</span>
              </a>
            )}
          </div>
        )}

        {/* Text content */}
        {(message.message_text || message.caption) && (
          <div className="px-3 py-2">
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.caption || message.message_text}
            </p>
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
