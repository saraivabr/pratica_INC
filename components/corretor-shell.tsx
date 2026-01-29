'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Building2, Search } from 'lucide-react';
import { ReactNode } from 'react';

interface CorretorShellProps {
  children: ReactNode;
}

export function CorretorShell({ children }: CorretorShellProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { href: '/empreendimentos', icon: Building2, label: 'Imóveis' },
    { href: '/catavendas', icon: Search, label: 'CataVendas' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Conteúdo */}
      {children}

      {/* Bottom navigation fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
        <nav className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 min-w-[70px] h-full transition-colors ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
