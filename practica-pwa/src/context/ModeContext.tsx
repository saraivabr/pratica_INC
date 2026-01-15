'use client';

import React, { createContext, useState, ReactNode } from 'react';
import { AppMode, modes } from '@/lib/theme';

interface ModeContextType {
  mode: AppMode;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
}

export const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppMode>(modes.PRESENTATION);

  const toggleMode = () => {
    setMode(prev => prev === modes.PRESENTATION ? modes.WORK : modes.PRESENTATION);
  };

  return (
    <ModeContext.Provider value={{ mode, toggleMode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}
