import {
  Menu,
  User,
  Phone,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Conversation } from './types';

interface ChatHeaderProps {
  conversation: Conversation;
  phone: string;
  showLeadPanel: boolean;
  onToggleConversations: () => void;
  onToggleLeadPanel: () => void;
}

export function ChatHeader({
  conversation,
  phone,
  showLeadPanel,
  onToggleConversations,
  onToggleLeadPanel,
}: ChatHeaderProps) {
  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
      <button
        onClick={onToggleConversations}
        className="md:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      <Avatar className="h-10 w-10">
        <AvatarImage src={conversation.profile_picture_url} alt={conversation.contact_name} />
        <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold">
          {conversation.contact_name?.slice(0, 2).toUpperCase() || <User className="w-5 h-5" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
          {conversation.contact_name}
        </h3>
        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {phone}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {conversation.is_lead && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Lead
          </Badge>
        )}

        <button
          onClick={onToggleLeadPanel}
          className="hidden md:flex text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          title={showLeadPanel ? 'Ocultar painel' : 'Mostrar painel'}
        >
          {showLeadPanel ? (
            <PanelRightClose className="w-5 h-5" />
          ) : (
            <PanelRightOpen className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
