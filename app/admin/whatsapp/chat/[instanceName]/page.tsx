'use client';

import { useParams } from 'next/navigation';
import { WhatsAppChat } from '@/components/whatsapp-chat';

export default function WhatsAppChatPage() {
  const params = useParams();
  const instanceName = params.instanceName as string;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <WhatsAppChat
        instanceName={instanceName}
        title="Conversas WhatsApp"
        backUrl="/admin/whatsapp"
        className="h-[calc(100vh-32px)]"
      />
    </div>
  );
}
