import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      connected
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    )}>
      {connected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Desconectado</span>
        </>
      )}
    </div>
  );
}
