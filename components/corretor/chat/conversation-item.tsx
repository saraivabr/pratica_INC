import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Conversation } from './types';

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
}

function getMessagePreview(message: string, type?: string): string {
  if (type?.includes('image')) return '📷 Imagem';
  if (type?.includes('document')) return '📄 Documento';
  if (type?.includes('audio') || type?.includes('ptt')) return '🎤 Audio';
  if (type?.includes('video')) return '🎬 Video';
  if (type?.includes('sticker')) return '✨ Figurinha';
  if (type?.includes('location')) return '📍 Localizacao';
  if (type?.includes('contact')) return '👤 Contato';
  if (type?.includes('poll')) return '📊 Enquete';
  return message?.slice(0, 50) + (message?.length > 50 ? '...' : '') || '';
}

export function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left',
        isSelected && 'bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conversation.profile_picture_url} alt={conversation.contact_name} />
          <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 font-semibold">
            {conversation.contact_name?.slice(0, 2).toUpperCase() || <User className="w-6 h-6" />}
          </AvatarFallback>
        </Avatar>
        {conversation.is_lead && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">L</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
            {conversation.contact_name}
          </h3>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {formatDate(conversation.last_message_time)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 truncate flex-1">
            {conversation.is_from_me && <span className="text-gray-400">Voce: </span>}
            {getMessagePreview(conversation.last_message, conversation.last_message_type)}
          </p>
          {conversation.unread_count > 0 && (
            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
