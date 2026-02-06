'use client';

import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ChatCRM } from '@/components/corretor/chat-crm';
import { useAuth } from '@/lib/auth-context';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function WhatsAppChatPage() {
  const params = useParams();
  const instanceName = params.instanceName as string;
  const { user, isLoading } = useAuth();

  if (isLoading || !user?.id) {
    return (
      <AppShell title="WhatsApp">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </AppShell>
    );
  }

  const hasAccess = user.role === 'admin' || user.role === 'gerente';
  if (!hasAccess) {
    return (
      <AppShell title="WhatsApp">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="w-12 h-12 text-yellow-500" />
          <h2 className="text-xl font-semibold">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas administradores e gerentes podem acessar esta página.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="WhatsApp">
      <div className="h-[calc(100vh-120px)]">
        <ChatCRM instanceName={instanceName} userId={user.id} />
      </div>
    </AppShell>
  );
}
