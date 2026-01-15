# Radical App Redesign - Imersive Mobile Experience

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the catalog app into a radical, imersive mobile app with SVG-heavy design, dual modes (Presentation/Work), and conversational personality.

**Architecture:**
- Redesign layout system to be fullscreen & immersive (respect notch/safe areas)
- Create 2 visual themes: Presentation (visual, impressive) & Work (compact, efficient)
- Replace entire color palette with organic fluid aesthetic (dark background, vibrant accents)
- Build comprehensive SVG library for icons, backgrounds, illustrations
- Add gesture system (swipe up, long press, double tap) with haptic feedback
- Implement conversational micro-copy throughout the app
- Change "Reservas" to "Propostas" everywhere

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Framer Motion (for complex animations), custom SVG components

---

## Task 1: Create Global Color System & CSS Variables

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/theme.ts`

**Step 1: Update globals.css with new color palette**

Replace the entire `:root` section with:

```css
:root {
  /* Organic Fluid Dark Palette */
  --color-bg: #0F1419;
  --color-bg-dark: #0A0E13;
  --color-bg-elevated: #1A1F2E;
  --color-surface: #151A28;

  --color-text: #FFFFFF;
  --color-text-secondary: #B0B8C1;
  --color-text-tertiary: #7A8290;

  /* Vibrant Accents */
  --color-primary: #FF6B6B;      /* Coral */
  --color-secondary: #4ECDC4;    /* Turquoise */
  --color-success: #95E77D;       /* Mint Green */
  --color-warning: #FFD93D;       /* Warm Yellow */
  --color-accent: #A29BFE;        /* Soft Purple */

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #FF6B6B 0%, #A29BFE 100%);
  --gradient-success: linear-gradient(135deg, #95E77D 0%, #4ECDC4 100%);
  --gradient-bg: linear-gradient(135deg, #0F1419 0%, #1A1F2E 100%);

  /* Typography */
  --font-system: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  --font-serif: var(--font-playfair), 'Playfair Display', Georgia, serif;
}

body {
  background: var(--gradient-bg);
  color: var(--color-text);
}
```

**Step 2: Create theme utility file**

Create `src/lib/theme.ts`:

```typescript
export const colors = {
  bg: '#0F1419',
  bgDark: '#0A0E13',
  bgElevated: '#1A1F2E',
  surface: '#151A28',

  text: '#FFFFFF',
  textSecondary: '#B0B8C1',
  textTertiary: '#7A8290',

  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  success: '#95E77D',
  warning: '#FFD93D',
  accent: '#A29BFE',
};

export const modes = {
  PRESENTATION: 'presentation',
  WORK: 'work',
} as const;

export type AppMode = typeof modes[keyof typeof modes];
```

**Step 3: Update HTML/body styling**

Add to `globals.css` in `@layer base`:

```css
html {
  background: #0F1419;
}

body {
  background: var(--gradient-bg);
  color: var(--color-text);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Fullscreen experience */
body {
  padding: 0;
  margin: 0;
  position: fixed;
  width: 100%;
  height: 100%;
}

main {
  overflow-y: auto;
  height: 100vh;
}
```

**Step 4: Commit**

```bash
git add src/app/globals.css src/lib/theme.ts
git commit -m "feat: add organic fluid color system and theme utilities"
```

---

## Task 2: Create SVG Icon Library

**Files:**
- Create: `src/components/svg/SvgIcons.tsx`
- Create: `src/components/svg/SvgBackgrounds.tsx`
- Create: `src/components/svg/SvgIllustrations.tsx`

**Step 1: Create SVG Icons Component**

Create `src/components/svg/SvgIcons.tsx`:

```typescript
import React from 'react';

interface SvgIconProps {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const TargetIcon: React.FC<SvgIconProps> = ({
  width = 24,
  height = 24,
  color = '#FF6B6B',
  className
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="1" fill={color} />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export const LightningIcon: React.FC<SvgIconProps> = ({
  width = 24,
  height = 24,
  color = '#FFD93D',
  className
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const ChatBubbleIcon: React.FC<SvgIconProps> = ({
  width = 24,
  height = 24,
  color = '#4ECDC4',
  className
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const ChartIcon: React.FC<SvgIconProps> = ({
  width = 24,
  height = 24,
  color = '#A29BFE',
  className
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

export const HotIcon: React.FC<SvgIconProps> = ({
  width = 24,
  height = 24,
  color = '#FF6B6B',
  className
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
  >
    <path d="M12 2c1.1 0 2 .9 2 2 0 2.3-1.7 4.3-4 4.8V20c0 1.1.9 2 2 2s2-.9 2-2v-6.2c2.3-.5 4-2.5 4-4.8 0-1.1.9-2 2-2s2 .9 2 2c0 4.4-3.6 8-8 8s-8-3.6-8-8c0-1.1.9-2 2-2z" />
  </svg>
);
```

**Step 2: Create Background SVG Component**

Create `src/components/svg/SvgBackgrounds.tsx`:

```typescript
import React from 'react';

export const OrganicBackground: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`fixed inset-0 w-full h-full ${className}`}
    viewBox="0 0 1200 800"
    preserveAspectRatio="none"
    style={{ zIndex: -1 }}
  >
    <defs>
      <filter id="blur">
        <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
      </filter>

      <linearGradient id="gradientBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F1419" />
        <stop offset="50%" stopColor="#1A1F2E" />
        <stop offset="100%" stopColor="#0A0E13" />
      </linearGradient>
    </defs>

    {/* Base gradient */}
    <rect width="1200" height="800" fill="url(#gradientBg)" />

    {/* Animated blobs */}
    <g filter="url(#blur)" opacity="0.3">
      <circle cx="200" cy="150" r="250" fill="#FF6B6B" />
      <circle cx="1000" cy="600" r="300" fill="#4ECDC4" />
      <circle cx="600" cy="700" r="200" fill="#A29BFE" />
    </g>
  </svg>
);

export const PulsingCircle: React.FC<{
  size?: number;
  color?: string;
  className?: string;
}> = ({ size = 100, color = '#FF6B6B', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    className={className}
    style={{
      animation: 'pulse 2s ease-in-out infinite'
    }}
  >
    <circle cx="50" cy="50" r="45" fill={color} opacity="0.6" />
    <circle cx="50" cy="50" r="30" fill={color} opacity="0.8" />
    <circle cx="50" cy="50" r="15" fill={color} />
  </svg>
);
```

**Step 3: Create Illustration SVG Component**

Create `src/components/svg/SvgIllustrations.tsx`:

```typescript
import React from 'react';

export const BuildingIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 300 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#A29BFE" />
        <stop offset="100%" stopColor="#FF6B6B" />
      </linearGradient>
    </defs>

    {/* Building outline */}
    <rect x="50" y="80" width="200" height="280" fill="url(#buildingGradient)" rx="8" />

    {/* Windows - 4x8 grid */}
    {Array.from({ length: 8 }).map((_, row) =>
      Array.from({ length: 4 }).map((_, col) => (
        <g key={`${row}-${col}`}>
          <rect
            x={70 + col * 45}
            y={100 + row * 32}
            width="28"
            height="24"
            fill="#FFD93D"
            opacity={Math.random() > 0.3 ? 1 : 0.2}
            rx="2"
          />
        </g>
      ))
    )}

    {/* Door */}
    <rect x="130" y="340" width="40" height="60" fill="#4ECDC4" rx="4" />
  </svg>
);

export const ConfettiAnimation: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    style={{
      animation: 'confetti 2s ease-out forwards'
    }}
  >
    {Array.from({ length: 12 }).map((_, i) => (
      <g key={i} style={{
        animation: `fall-${i} 2s ease-out forwards`,
        transformOrigin: '100px 0'
      }}>
        <polygon
          points="100,20 110,40 90,40"
          fill={['#FF6B6B', '#4ECDC4', '#95E77D', '#FFD93D'][i % 4]}
          opacity="0.8"
        />
      </g>
    ))}
  </svg>
);
```

**Step 4: Add animations to globals.css**

Add to `globals.css`:

```css
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

@keyframes confetti {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(300px) rotate(360deg);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

**Step 5: Commit**

```bash
git add src/components/svg/ src/app/globals.css
git commit -m "feat: add comprehensive SVG icon and background library"
```

---

## Task 3: Create App Mode Context & Hook

**Files:**
- Create: `src/context/ModeContext.tsx`
- Create: `src/hooks/useAppMode.ts`

**Step 1: Create Mode Context**

Create `src/context/ModeContext.tsx`:

```typescript
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
```

**Step 2: Create useAppMode hook**

Create `src/hooks/useAppMode.ts`:

```typescript
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
```

**Step 3: Wrap app with provider**

Modify `src/app/layout.tsx` to add provider:

```typescript
import { ModeProvider } from '@/context/ModeContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* ... existing head content ... */}
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <ModeProvider>
          {children}
        </ModeProvider>
      </body>
    </html>
  );
}
```

**Step 4: Commit**

```bash
git add src/context/ModeContext.tsx src/hooks/useAppMode.ts src/app/layout.tsx
git commit -m "feat: create app mode context and hook for switching presentation/work modes"
```

---

## Task 4: Create Header with Mode Toggle

**Files:**
- Create: `src/components/layout/AppHeader.tsx`
- Modify: `src/app/(main)/layout.tsx`

**Step 1: Create AppHeader component**

Create `src/components/layout/AppHeader.tsx`:

```typescript
'use client';

import { useAppMode } from '@/hooks/useAppMode';
import { PresentationIcon, WorkIcon } from 'lucide-react';

export function AppHeader() {
  const { mode, toggleMode } = useAppMode();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#1A1F2E] to-transparent backdrop-blur-xl">
      <div className="px-6 pt-4 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">PROPOSTAS</h1>
          <p className="text-xs text-[#7A8290]">Vamos vender hoje?</p>
        </div>

        {/* Mode Toggle */}
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
```

**Step 2: Update main layout to include header**

Modify `src/app/(main)/layout.tsx`:

```typescript
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#0F1419]">
      <AppHeader />
      <main className="pt-24 pb-32">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/layout/AppHeader.tsx src/app/\(main\)/layout.tsx
git commit -m "feat: add header with mode toggle button"
```

---

## Task 5: Redesign Catalog Page - Presentation Mode

**Files:**
- Modify: `src/app/(main)/catalogo/page.tsx`

**Step 1: Complete rewrite for Presentation mode**

Replace entire `src/app/(main)/catalogo/page.tsx`:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Search, X, ChevronUp } from 'lucide-react'
import { EmpreendimentoCard } from '@/components/catalogo/empreendimento-card-presentation'
import { FilterBar, Filters } from '@/components/catalogo/filter-bar'
import { useEmpreendimentos } from '@/hooks/use-empreendimentos'
import { useAppMode } from '@/hooks/useAppMode'
import { OrganicBackground } from '@/components/svg/SvgBackgrounds'

function CatalogoSkeleton() {
  return (
    <div className="space-y-6 px-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#1A1F2E] rounded-3xl h-80 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}

export default function CatalogoPage() {
  const { mode } = useAppMode()
  const { empreendimentos, isLoading } = useEmpreendimentos()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: [],
    bairro: [],
  })
  const [currentIndex, setCurrentIndex] = useState(0)

  const availableBairros = useMemo(() => {
    const bairros = empreendimentos.map((emp) => emp.localizacao?.bairro).filter(Boolean) as string[]
    return [...new Set(bairros)].sort()
  }, [empreendimentos])

  const filteredEmpreendimentos = useMemo(() => {
    return empreendimentos.filter((emp) => {
      const bairro = emp.localizacao?.bairro || ''
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = emp.nome.toLowerCase().includes(query)
        const matchesBairro = bairro.toLowerCase().includes(query)
        if (!matchesName && !matchesBairro) return false
      }
      if (filters.status.length > 0 && !filters.status.includes(emp.status)) {
        return false
      }
      if (filters.bairro.length > 0 && !filters.bairro.includes(bairro)) {
        return false
      }
      return true
    })
  }, [empreendimentos, searchQuery, filters])

  if (mode === 'work') {
    return <CatalogoWorkMode filteredEmpreendimentos={filteredEmpreendimentos} isLoading={isLoading} />
  }

  // PRESENTATION MODE
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F1419] to-[#1A1F2E]">
      <OrganicBackground className="opacity-40" />

      {/* Search Bar */}
      <div className="px-6 mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A8290] transition-colors group-focus-within:text-[#4ECDC4]" />
          <input
            type="search"
            placeholder="Buscar empreendimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-[#1A1F2E] border border-[#2A3142] rounded-xl text-white placeholder-[#7A8290] focus:outline-none focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#7A8290] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Toggle */}
      {filteredEmpreendimentos.length > 0 && (
        <div className="px-6 mb-6 flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              showFilters
                ? 'bg-[#FF6B6B] text-white'
                : 'bg-[#1A1F2E] text-[#7A8290] border border-[#2A3142]'
            }`}
          >
            Filtros
          </button>
        </div>
      )}

      {showFilters && (
        <div className="px-6 mb-6 animate-slideUp">
          <FilterBar
            filters={filters}
            onFiltersChange={setFilters}
            availableBairros={availableBairros}
          />
        </div>
      )}

      {/* Content */}
      <main className="px-6 pb-32">
        {isLoading ? (
          <CatalogoSkeleton />
        ) : filteredEmpreendimentos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl font-semibold text-white mb-2">Nenhum resultado</p>
            <p className="text-[#7A8290] mb-6">Tente ajustar seus filtros</p>
            {(filters.status.length > 0 || filters.bairro.length > 0) && (
              <button
                onClick={() => setFilters({ status: [], bairro: [] })}
                className="px-6 py-2 bg-[#FF6B6B] text-white rounded-full text-sm font-medium hover:bg-[#FF5252] transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Empreendimentos Carousel */}
            <div className="space-y-6">
              {filteredEmpreendimentos.map((emp, index) => (
                <div
                  key={emp.id}
                  className="animate-slideUp"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <EmpreendimentoCard
                    empreendimento={emp}
                    featured={index === 0}
                  />
                </div>
              ))}
            </div>

            {/* Swipe indicator */}
            <div className="mt-8 text-center text-[#7A8290] text-sm flex items-center justify-center gap-2">
              <ChevronUp className="w-4 h-4 animate-bounce" />
              <span>Desliza pra cima pro espelho</span>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// Work Mode Component
function CatalogoWorkMode({
  filteredEmpreendimentos,
  isLoading
}: {
  filteredEmpreendimentos: any[];
  isLoading: boolean;
}) {
  return (
    <div className="px-6 py-8">
      <h2 className="text-lg font-bold text-white mb-6">Empreendimentos</h2>

      {isLoading ? (
        <CatalogoSkeleton />
      ) : (
        <div className="space-y-3">
          {filteredEmpreendimentos.map((emp) => (
            <div
              key={emp.id}
              className="bg-[#1A1F2E] border border-[#2A3142] rounded-xl p-4 hover:border-[#FF6B6B] transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-white">{emp.nome}</p>
                  <p className="text-sm text-[#7A8290]">{emp.localizacao?.bairro}</p>
                </div>
                <p className="text-[#4ECDC4] font-bold">R$ {emp.tipologias?.[0]?.preco_base}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(main\)/catalogo/page.tsx
git commit -m "feat: redesign catalog page with presentation and work modes"
```

---

## Task 6: Create Presentation Card Component

**Files:**
- Create: `src/components/catalogo/empreendimento-card-presentation.tsx`

**Step 1: Create new card component for presentation**

Create `src/components/catalogo/empreendimento-card-presentation.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Heart, MapPin, ChevronUp } from 'lucide-react'
import { useFavorites } from '@/hooks/use-favorites'
import { formatarPreco } from '@/lib/utils'
import { Empreendimento } from '@/types/empreendimento'
import { cn } from '@/lib/utils'

interface EmpreendimentoCardProps {
  empreendimento: Empreendimento
  featured?: boolean
}

const statusConfig: Record<string, { label: string; bgColor: string }> = {
  em_construcao: { label: '🔨 Em Obras', bgColor: 'bg-[#FFD93D]/20 text-[#FFD93D]' },
  lancamento: { label: '🚀 Lançamento', bgColor: 'bg-[#A29BFE]/20 text-[#A29BFE]' },
  em_lancamento: { label: '🚀 Lançamento', bgColor: 'bg-[#A29BFE]/20 text-[#A29BFE]' },
  entregue: { label: '✅ Pronto', bgColor: 'bg-[#95E77D]/20 text-[#95E77D]' },
}

export function EmpreendimentoCard({ empreendimento: emp, featured = false }: EmpreendimentoCardProps) {
  const { toggle, isFavorite } = useFavorites()
  const favorited = isFavorite(emp.id)
  const status = statusConfig[emp.status] || { label: 'Disponível', bgColor: 'bg-[#4ECDC4]/20 text-[#4ECDC4]' }
  const preco = emp.tipologias?.[0]?.preco_base
  const imageUrl = emp.imagemCapa || 'https://via.placeholder.com/400x300?text=Empreendimento'
  const menorArea = emp.tipologias?.[0]?.area_m2
  const maiorArea = emp.tipologias?.[emp.tipologias.length - 1]?.area_m2

  return (
    <Link href={`/catalogo/${emp.id}`} className="block group">
      <article className="relative overflow-hidden rounded-3xl hover:shadow-2xl transition-all duration-500">
        {/* Image */}
        <div className={cn(
          'relative overflow-hidden bg-[#1A1F2E]',
          featured ? 'h-96' : 'h-80'
        )}>
          <img
            src={imageUrl}
            alt={emp.nome}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Status badge */}
          <div className={cn('absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-bold', status.bgColor)}>
            {status.label}
          </div>

          {/* Heart button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggle(emp.id)
            }}
            className={cn(
              'absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all',
              favorited
                ? 'bg-[#FF6B6B] text-white'
                : 'bg-white/20 text-white hover:bg-white/30'
            )}
          >
            <Heart className={cn('w-5 h-5', favorited && 'fill-current')} />
          </button>

          {/* Price overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <p className="text-sm text-white/70 mb-1">A partir de</p>
            <p className="text-4xl font-bold">R$ {formatarPreco(preco)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gradient-to-b from-[#1A1F2E] to-[#0F1419] p-6">
          {/* Title */}
          <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#FF6B6B] transition-colors">
            {emp.nome}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-2 text-[#7A8290] mb-6">
            <MapPin className="w-4 h-4" />
            <span>{emp.localizacao?.bairro || 'São Paulo'}</span>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0F1419] border border-[#2A3142] rounded-lg p-3">
              <p className="text-xs text-[#7A8290] mb-1">Área</p>
              <p className="font-bold text-white">
                {menorArea === maiorArea ? `${menorArea}m²` : `${menorArea} - ${maiorArea}m²`}
              </p>
            </div>
            <div className="bg-[#0F1419] border border-[#2A3142] rounded-lg p-3">
              <p className="text-xs text-[#7A8290] mb-1">Quartos</p>
              <p className="font-bold text-white">{emp.tipologias?.[0]?.dormitorios || 2}+</p>
            </div>
          </div>

          {/* CTA hint */}
          <div className="mt-4 pt-4 border-t border-[#2A3142] flex items-center justify-between text-xs text-[#7A8290]">
            <span>Ver espelho</span>
            <ChevronUp className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      </article>
    </Link>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/catalogo/empreendimento-card-presentation.tsx
git commit -m "feat: create presentation mode card component with new styling"
```

---

## Task 7: Redesign Espelho Page - Presentation Mode

**Files:**
- Create: `src/app/(main)/espelho/page-presentation.tsx`
- Modify: `src/app/(main)/espelho/page.tsx`

**Step 1: Create presentation version of espelho**

Create `src/app/(main)/espelho/page-presentation.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { useEmpreendimento } from '@/hooks/use-empreendimento'
import { BuildingIllustration } from '@/components/svg/SvgIllustrations'

export function EspelhoPresentationMode({ empreendimentoId }: { empreendimentoId: string }) {
  const { empreendimento, isLoading } = useEmpreendimento(empreendimentoId)
  const [selectedDorm, setSelectedDorm] = useState<number | null>(null)

  if (isLoading) {
    return <div className="text-center py-20 text-white">Carregando...</div>
  }

  const unidades = empreendimento?.unidades || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F1419] to-[#1A1F2E] px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{empreendimento?.nome}</h1>
        <div className="flex items-center gap-2 text-[#4ECDC4]">
          <span className="w-2 h-2 rounded-full bg-[#95E77D]" />
          <span className="text-sm font-medium">Disponibilidade ao vivo</span>
        </div>
      </div>

      {/* Fala amigável */}
      <div className="bg-[#1A1F2E] border-l-4 border-[#FF6B6B] rounded-lg p-4 mb-8">
        <p className="text-white text-sm">
          💬 <strong>Olha só:</strong> {unidades.filter(u => u.status === 'disponivel').length} unidades saíram essa semana!
        </p>
      </div>

      {/* Building Illustration */}
      <div className="bg-[#1A1F2E] rounded-3xl p-8 mb-8 border border-[#2A3142]">
        <div className="grid grid-cols-4 gap-2 mb-6">
          {unidades.map((unit) => (
            <button
              key={unit.id}
              onClick={() => setSelectedDorm(unit.dormitorios)}
              className={cn(
                'aspect-square rounded-lg font-bold text-sm transition-all',
                unit.status === 'disponivel'
                  ? 'bg-[#95E77D] text-black hover:scale-110'
                  : unit.status === 'reservado'
                  ? 'bg-[#FFD93D] text-black opacity-60'
                  : 'bg-[#7A8290] text-white opacity-40'
              )}
            >
              {unit.numero}
            </button>
          ))}
        </div>

        <div className="flex gap-4 justify-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#95E77D]" />
            <span className="text-white">Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#FFD93D]" />
            <span className="text-white">Reservado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#7A8290]" />
            <span className="text-[#7A8290]">Vendido</span>
          </div>
        </div>
      </div>

      {/* Selected unit details */}
      {selectedDorm !== null && (
        <div className="bg-gradient-to-br from-[#A29BFE] to-[#FF6B6B] rounded-3xl p-6 mb-8 animate-slideUp">
          <p className="text-white/80 text-sm mb-1">Unidade selecionada</p>
          <p className="text-white text-2xl font-bold mb-4">{selectedDorm} dormitórios</p>
          <button className="w-full bg-white text-[#FF6B6B] font-bold py-3 rounded-xl hover:scale-105 transition-transform">
            <Zap className="inline w-4 h-4 mr-2" />
            Simular Caixa
          </button>
        </div>
      )}

      {/* CTA */}
      <button className="w-full bg-[#FF6B6B] text-white font-bold py-4 rounded-xl hover:bg-[#FF5252] transition-colors mb-4">
        💬 Mandar pro Cliente
      </button>
    </div>
  )
}
```

**Step 2: Update main espelho page**

Modify `src/app/(main)/espelho/page.tsx`:

```typescript
'use client'

import { useAppMode } from '@/hooks/useAppMode'
import { EspelhoPresentationMode } from './page-presentation'
import { EspolhoWorkMode } from './page-work'
import { useSearchParams } from 'next/navigation'

export default function EspelhoPage() {
  const { mode } = useAppMode()
  const searchParams = useSearchParams()
  const empreendimentoId = searchParams.get('id') || 'station-park'

  return mode === 'presentation' ? (
    <EspelhoPresentationMode empreendimentoId={empreendimentoId} />
  ) : (
    <EspolhoWorkMode empreendimentoId={empreendimentoId} />
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(main\)/espelho/page.tsx src/app/\(main\)/espelho/page-presentation.tsx
git commit -m "feat: create presentation mode for espelho with interactive units"
```

---

## Task 8: Create Propostas Page with Dynamic Copy

**Files:**
- Modify: `src/app/(main)/pre-reservas/page.tsx`
- Rename to: `src/app/(main)/propostas/page.tsx`
- Create: `src/components/propostas/PropostaCard.tsx`
- Create: `src/lib/copywriting.ts`

**Step 1: Create copywriting library**

Create `src/lib/copywriting.ts`:

```typescript
export const copy = {
  motivational: [
    '🔥 Vamos vender hoje?',
    '💪 Você consegue!',
    '🎯 Pronto pra impressionar?',
    '✨ Encontre a melhor opção',
    '🚀 Decolando vendas!',
  ],
  espelho: [
    'Vê só... {n} unidades saíram essa semana!',
    'O mercado está quente 🔥',
    'Essas unidades não vão durar',
    'Tem cliente pedindo por aqui!',
  ],
  simulator: [
    'Deixa eu calcular isso pra ti',
    'Encontrei a melhor opção',
    'Olha que legal essa proposta',
  ],
  propostas: [
    'Suas histórias de venda',
    'Histórico de propostas',
    'Suas conquistas',
  ],
  success: [
    '🎉 Proposta enviada!',
    '✨ Sucesso!',
    '🎊 Partiu fechar essa venda!',
  ],
};

export function getRandomCopy(key: keyof typeof copy): string {
  const array = copy[key];
  return array[Math.floor(Math.random() * array.length)];
}
```

**Step 2: Update routes folder**

Move/rename pre-reservas to propostas:

```bash
# Update all references from "pre-reservas" to "propostas"
# This includes route files, api endpoints, types
```

**Step 3: Create PropostaCard**

Create `src/components/propostas/PropostaCard.tsx`:

```typescript
'use client'

import { MoreVertical, MessageCircle, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface PropostaCardProps {
  id: string
  clientName: string
  empreendimento: string
  unit: string
  value: number
  status: 'ativa' | 'pendente' | 'concluida' | 'cancelada'
  sentAt: Date
  onShare?: () => void
  onDelete?: () => void
}

const statusConfig = {
  ativa: { label: '🔥 Ativa', color: 'bg-[#FF6B6B]/20 text-[#FF6B6B]' },
  pendente: { label: '⏳ Pendente', color: 'bg-[#FFD93D]/20 text-[#FFD93D]' },
  concluida: { label: '✅ Concluída', color: 'bg-[#95E77D]/20 text-[#95E77D]' },
  cancelada: { label: '❌ Cancelada', color: 'bg-[#7A8290]/20 text-[#7A8290]' },
}

export function PropostaCard({
  clientName,
  empreendimento,
  unit,
  value,
  status,
  sentAt,
  onShare,
  onDelete,
}: PropostaCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const statusInfo = statusConfig[status]
  const timeAgo = formatTimeAgo(sentAt)

  return (
    <div className="bg-[#1A1F2E] border border-[#2A3142] rounded-xl p-4 hover:border-[#FF6B6B] transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-bold text-white">{clientName}</p>
          <p className="text-sm text-[#7A8290]">{empreendimento} - Apt {unit}</p>
        </div>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-[#2A3142] rounded-full transition-colors text-[#7A8290]"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Status & Value */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn('px-2.5 py-1 rounded-full text-xs font-bold', statusInfo.color)}>
          {statusInfo.label}
        </div>
        <p className="text-xl font-bold text-[#4ECDC4]">R$ {value.toLocaleString('pt-BR')}</p>
      </div>

      {/* Time */}
      <p className="text-xs text-[#7A8290] mb-3">Enviada {timeAgo}</p>

      {/* Actions */}
      {showMenu && (
        <div className="bg-[#0F1419] border border-[#2A3142] rounded-lg p-2 space-y-1 animate-slideUp">
          <button
            onClick={onShare}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#1A1F2E] rounded transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FF6B6B] hover:bg-[#FF6B6B]/10 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Deletar
          </button>
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (hours < 1) return 'agora'
  if (hours < 24) return `há ${hours}h`
  return `há ${days}d`
}
```

**Step 4: Create Propostas page**

Create `src/app/(main)/propostas/page.tsx`:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { useAppMode } from '@/hooks/useAppMode'
import { getRandomCopy } from '@/lib/copywriting'
import { PropostaCard } from '@/components/propostas/PropostaCard'
import { PulsingCircle } from '@/components/svg/SvgBackgrounds'

// Mock data - replace with actual hook
const mockPropostas = [
  {
    id: '1',
    clientName: 'João Silva',
    empreendimento: 'Station Park',
    unit: '512',
    value: 389000,
    status: 'ativa' as const,
    sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: '2',
    clientName: 'Maria Costa',
    empreendimento: 'Plaza Pinheiros',
    unit: '302',
    value: 425000,
    status: 'pendente' as const,
    sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
]

export default function PropostasPage() {
  const { mode } = useAppMode()
  const [propostas] = useState(mockPropostas)
  const [motivationalMessage] = useState(() => getRandomCopy('motivational'))

  const stats = useMemo(() => ({
    ativas: propostas.filter(p => p.status === 'ativa').length,
    pendentes: propostas.filter(p => p.status === 'pendente').length,
    concluidas: propostas.filter(p => p.status === 'concluida').length,
  }), [propostas])

  if (mode === 'work') {
    return (
      <div className="px-6 py-8">
        <h2 className="text-lg font-bold text-white mb-6">Propostas</h2>

        {/* Stats compact */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1A1F2E] rounded-lg p-3 border border-[#2A3142]">
            <p className="text-[#FF6B6B] font-bold text-lg">{stats.ativas}</p>
            <p className="text-xs text-[#7A8290]">Ativas</p>
          </div>
          <div className="bg-[#1A1F2E] rounded-lg p-3 border border-[#2A3142]">
            <p className="text-[#FFD93D] font-bold text-lg">{stats.pendentes}</p>
            <p className="text-xs text-[#7A8290]">Pendentes</p>
          </div>
          <div className="bg-[#1A1F2E] rounded-lg p-3 border border-[#2A3142]">
            <p className="text-[#95E77D] font-bold text-lg">{stats.concluidas}</p>
            <p className="text-xs text-[#7A8290]">Concluídas</p>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {propostas.map(proposta => (
            <PropostaCard key={proposta.id} {...proposta} />
          ))}
        </div>
      </div>
    )
  }

  // PRESENTATION MODE
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F1419] to-[#1A1F2E] px-6 py-8">
      <div className="mb-8">
        <p className="text-[#4ECDC4] text-sm font-bold mb-2">Suas histórias de venda</p>
        <p className="text-white text-sm mb-4">💬 {motivationalMessage}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Ativas', value: stats.ativas, color: 'from-[#FF6B6B]' },
          { label: 'Pendentes', value: stats.pendentes, color: 'from-[#FFD93D]' },
          { label: 'Concluídas', value: stats.concluidas, color: 'from-[#95E77D]' },
        ].map(stat => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} to-transparent rounded-xl p-4 border border-[#2A3142]`}
          >
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-white/70">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Propostas list */}
      <div className="space-y-4">
        {propostas.map((proposta, idx) => (
          <div key={proposta.id} className="animate-slideUp" style={{ animationDelay: `${idx * 100}ms` }}>
            <PropostaCard {...proposta} />
          </div>
        ))}
      </div>

      {/* Motivational message */}
      <div className="mt-12 text-center">
        <PulsingCircle size={60} color="#A29BFE" className="mx-auto mb-4" />
        <p className="text-[#7A8290] text-sm">Você está indo bem! 🚀</p>
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
git add src/lib/copywriting.ts src/components/propostas/ src/app/\(main\)/propostas/
git commit -m "feat: create propostas page with presentation/work modes and dynamic copy"
```

---

## Task 9: Add Gesture Support & Haptic Feedback

**Files:**
- Create: `src/hooks/useGestures.ts`
- Create: `src/lib/haptics.ts`

**Step 1: Create haptics utility**

Create `src/lib/haptics.ts`:

```typescript
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const pattern = {
      light: 10,
      medium: 20,
      heavy: 50,
    };
    navigator.vibrate(pattern[type]);
  }
}

export function triggerPattern(pattern: number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
```

**Step 2: Create gestures hook**

Create `src/hooks/useGestures.ts`:

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { triggerHaptic } from '@/lib/haptics'

interface GestureHandlers {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: () => void
  onDoubleTap?: () => void
}

export function useGestures(handlers: GestureHandlers, element?: React.RefObject<HTMLElement>) {
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const lastTapTime = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const target = element?.current || window

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX

      longPressTimer.current = setTimeout(() => {
        triggerHaptic('medium')
        handlers.onLongPress?.()
      }, 500)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      clearTimeout(longPressTimer.current)

      const touchEndY = e.changedTouches[0].clientY
      const touchEndX = e.changedTouches[0].clientX
      const diffY = touchStartY.current - touchEndY
      const diffX = Math.abs(touchStartX.current - touchEndX)

      // Swipe up
      if (diffY > 50 && diffX < 50) {
        triggerHaptic('light')
        handlers.onSwipeUp?.()
      }

      // Swipe down
      if (diffY < -50 && diffX < 50) {
        triggerHaptic('light')
        handlers.onSwipeDown?.()
      }

      // Double tap
      const now = Date.now()
      if (now - lastTapTime.current < 300) {
        triggerHaptic('medium')
        handlers.onDoubleTap?.()
      }
      lastTapTime.current = now
    }

    const handleTouchMove = (e: TouchEvent) => {
      clearTimeout(longPressTimer.current)
    }

    target.addEventListener('touchstart', handleTouchStart)
    target.addEventListener('touchend', handleTouchEnd)
    target.addEventListener('touchmove', handleTouchMove)

    return () => {
      target.removeEventListener('touchstart', handleTouchStart)
      target.removeEventListener('touchend', handleTouchEnd)
      target.removeEventListener('touchmove', handleTouchMove)
    }
  }, [handlers, element])
}
```

**Step 3: Commit**

```bash
git add src/hooks/useGestures.ts src/lib/haptics.ts
git commit -m "feat: add gesture recognition and haptic feedback support"
```

---

## Task 10: Add Global Animations to CSS

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add animation keyframes**

Add to `src/app/globals.css`:

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-slideUp {
  animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.animate-slideDown {
  animation: slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-scaleIn {
  animation: scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 2s infinite;
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add global animation keyframes for app interactions"
```

---

## Final: Verify Build & Test

**Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Test locally**

```bash
npm run dev
```

Navigate to `/catalogo` and verify:
- Toggle mode button works
- Cards display with new styling
- SVG animations work
- Colors are correct
- Gestures trigger (swipe up, long press)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete radical app redesign with imersive UI, dual modes, and SVG animations"
```

---

## Implementation Notes

- All colors use CSS variables from `:root`
- SVG components are reusable and accept props
- Gestures use Vibration API (fallback to no haptics)
- Both modes (Presentation/Work) share same components but different layouts
- Copy is randomized via `getRandomCopy()` function
- Animations use cubic-bezier for organic feel
- All components are mobile-first
- Dark background prevents eye strain
- Accent colors pop against dark background

---

**TOTAL ESTIMATED TASKS: 10**
**IMPLEMENTATION APPROACH:** Use subagent-driven-development for each task
