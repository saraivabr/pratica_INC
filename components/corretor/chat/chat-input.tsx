'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WhatsAppTemplatesPicker } from '@/components/whatsapp-templates-picker';

interface ChatInputProps {
  contactName: string;
  isSending: boolean;
  onSend: (message: string) => void;
  onTyping: () => void;
}

export function ChatInput({ contactName, isSending, onSend, onTyping }: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() || isSending) return;
    onSend(text.trim());
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <WhatsAppTemplatesPicker
          contactName={contactName}
          onSelect={(msg) => setText(msg)}
        />

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-700"
          disabled
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.length === 1) {
              onTyping();
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Digite uma mensagem..."
          className="flex-1"
          disabled={isSending}
        />

        <Button
          onClick={handleSend}
          disabled={isSending || !text.trim()}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
