'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Loader2, X, Image as ImageIcon, Mic, Square, Trash2 } from 'lucide-react';
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const stopRecordingCleanup = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start(250); // collect data every 250ms
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) {
            // Auto-stop at 60s
            sendRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error('Erro ao acessar microfone: ' + (err.message || 'Permissao negada'));
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopRecordingCleanup();
  }, [stopRecordingCleanup]);

  const sendRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;

    // Stop timer first
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const ext = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });

        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingTime(0);

        if (blob.size < 1000) {
          toast.error('Audio muito curto');
          resolve();
          return;
        }

        // Upload
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, `audio.${ext}`);

          const res = await fetch('/api/whatsapp/upload-media', {
            method: 'POST',
            body: formData,
          });

          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Upload falhou');

          if (onSendMedia) {
            await onSendMedia({
              mediaUrl: json.url,
              fileName: `audio.${ext}`,
              mediaType: 'audio',
            });
          }
        } catch (err: any) {
          toast.error('Erro ao enviar audio: ' + (err.message || 'Tente novamente'));
        } finally {
          setUploading(false);
        }
        resolve();
      };

      recorder.stop();
    });
  }, [onSendMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

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

      {/* Text Input / Recording UI */}
      <div className="p-3">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Cancelar"
            >
              <Trash2 className="w-5 h-5" />
            </Button>

            <div className="flex-1 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-600 tabular-nums">
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
              </span>
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${(recordingTime / 60) * 100}%` }}
                />
              </div>
            </div>

            <Button
              onClick={() => sendRecording()}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        ) : (
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

            {text.trim() ? (
              <Button
                onClick={handleSend}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {busy ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                disabled={busy}
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-emerald-600"
                title="Gravar audio"
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
