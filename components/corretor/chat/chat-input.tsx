'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WhatsAppTemplatesPicker } from '@/components/whatsapp-templates-picker';
import { SmartReplyBar } from './smart-reply-bar';
import { AgentToolbar } from './agent-toolbar';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

interface ChatInputProps {
  contactName: string;
  isSending: boolean;
  onSend: (message: string) => void;
  onSendMedia?: (data: { mediaUrl: string; fileName: string; mediaType: string; caption?: string }) => void;
  onTyping: () => void;
  phoneNumber?: string;
  instanceName?: string;
  lastMessageIsFromMe?: boolean;
}

export function ChatInput({
  contactName,
  isSending,
  onSend,
  onSendMedia,
  onTyping,
  phoneNumber,
  instanceName,
  lastMessageIsFromMe = true,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() || isSending) return;
    onSend(text.trim());
    setText('');
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be re-selected
    e.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Maximo: 16MB');
      return;
    }

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setPreview({ url: objectUrl, name: file.name, type: 'image' });
    } else {
      setPreview({ url: '', name: file.name, type: 'file' });
    }

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/whatsapp/upload-media', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Upload falhou');
      }

      // Send media via onSendMedia callback
      if (onSendMedia) {
        await onSendMedia({
          mediaUrl: json.url,
          fileName: file.name,
          mediaType: json.mediaType || 'document',
          caption: text.trim() || undefined,
        });
        setText('');
      }

      setPreview(null);
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err.message || 'Tente novamente'));
    } finally {
      setUploading(false);
    }
  };

  const cancelPreview = () => {
    if (preview?.url && preview.type === 'image') {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
  };

  const busy = isSending || uploading;

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* Smart Reply Bar */}
      {phoneNumber && (
        <SmartReplyBar
          phoneNumber={phoneNumber}
          lastMessageIsFromMe={lastMessageIsFromMe}
          onSend={onSend}
        />
      )}

      {/* Agent Toolbar */}
      {phoneNumber && instanceName && (
        <AgentToolbar
          phoneNumber={phoneNumber}
          instanceName={instanceName}
          onSend={onSend}
        />
      )}

      {/* Image preview */}
      {preview && (
        <div className="px-3 pt-3 flex items-center gap-2">
          {preview.type === 'image' ? (
            <img src={preview.url} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
          ) : (
            <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{preview.name}</p>
            {uploading && <p className="text-xs text-gray-400">Enviando...</p>}
          </div>
          <button onClick={cancelPreview} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Text Input */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <WhatsAppTemplatesPicker
            contactName={contactName}
            onSelect={(msg) => setText(msg)}
          />

          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
          />

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
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
            disabled={busy}
          />

          <Button
            onClick={handleSend}
            disabled={busy || !text.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
