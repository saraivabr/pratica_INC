import {
  Menu,
  User,
  Phone,
  PanelRightClose,
  PanelRightOpen,
  Flame,
  Thermometer,
  Snowflake,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Conversation } from './types';

interface ChatHeaderProps {
  conversation: Conversation;
  phone: string;
  showLeadPanel: boolean;
  onToggleConversations: () => void;
  onToggleLeadPanel: () => void;
}

function TemperatureIndicator({ temperature }: { temperature: string | null | undefined }) {
  if (!temperature) return null;

  const config: Record<string, { icon: typeof Flame; color: string; bg: string; label: string }> = {
    quente: { icon: Flame, color: 'text-red-600', bg: 'bg-red-100 border-red-200', label: 'Quente' },
    morno: { icon: Thermometer, color: 'text-amber-600', bg: 'bg-amber-100 border-amber-200', label: 'Morno' },
    frio: { icon: Snowflake, color: 'text-blue-600', bg: 'bg-blue-100 border-blue-200', label: 'Frio' },
  };

  const c = config[temperature.toLowerCase()];
  if (!c) return null;

  const Icon = c.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 py-0.5 px-1.5 text-[10px]', c.bg, c.color)}
      title={`Lead ${c.label}`}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

export function ChatHeader({
  conversation,
  phone,
  showLeadPanel,
  onToggleConversations,
  onToggleLeadPanel,
}: ChatHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Main header row */}
      <div className="p-3 flex items-center gap-3">
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
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {conversation.contact_name}
            </h3>
            <TemperatureIndicator temperature={conversation.ai_temperature} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {phone}
            </p>
            {conversation.ai_sentiment && (
              <span className="text-[10px] text-gray-400">
                · {conversation.ai_sentiment}
              </span>
            )}
          </div>
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

      {/* Next Step Banner (based on AI summary) */}
      {conversation.ai_summary && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <span className="text-[11px] text-amber-700 dark:text-amber-300 truncate">
              {conversation.ai_summary}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
