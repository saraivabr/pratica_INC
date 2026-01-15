'use client';

import { useContext } from 'react';
import { ModeContext } from '@/context/ModeContext';

export function useAppMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within ModeProvider');
  }
  return context;
}
