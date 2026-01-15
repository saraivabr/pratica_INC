'use client';

import { useAppMode } from '@/hooks/useAppMode';

export function AppHeader() {
  const { mode, toggleMode } = useAppMode();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#1A1F2E] to-transparent backdrop-blur-xl">
      <div className="px-6 pt-4 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">PROPOSTAS</h1>
          <p className="text-xs text-[#7A8290]">Vamos vender hoje?</p>
        </div>

        <button
          onClick={toggleMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
            mode === 'presentation'
              ? 'bg-[#A29BFE] text-white'
              : 'bg-[#FF6B6B] text-white'
          }`}
          aria-label="Toggle app mode"
        >
          {mode === 'presentation' ? (
            <>
              <span className="text-sm font-medium">🎯</span>
              <span className="text-xs hidden sm:inline">Apresentação</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium">🔧</span>
              <span className="text-xs hidden sm:inline">Trabalho</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}