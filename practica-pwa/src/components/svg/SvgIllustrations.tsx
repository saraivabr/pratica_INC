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

    <rect x="50" y="80" width="200" height="280" fill="url(#buildingGradient)" rx="8" />

    {Array.from({ length: 8 }).map((_, row) =>
      Array.from({ length: 4 }).map((_, col) => (
        <rect
          key={`${row}-${col}`}
          x={70 + col * 45}
          y={100 + row * 32}
          width="28"
          height="24"
          fill="#FFD93D"
          opacity={Math.random() > 0.3 ? 1 : 0.2}
          rx="2"
        />
      ))
    )}

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
      <polygon
        key={i}
        points="100,20 110,40 90,40"
        fill={['#FF6B6B', '#4ECDC4', '#95E77D', '#FFD93D'][i % 4]}
        opacity="0.8"
        style={{
          animation: `fall-${i} 2s ease-out forwards`,
          transformOrigin: '100px 0'
        }}
      />
    ))}
  </svg>
);

export const EmptyHeartIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 170L30 120C10 105 0 80 0 60C0 35 20 15 40 15C55 15 70 25 85 40C95 50 97 52 100 55C103 52 105 50 115 40C130 25 145 15 160 15C180 15 200 35 200 60C200 80 190 105 170 120L100 170Z"
      stroke="#A29BFE"
      strokeWidth="2"
      opacity="0.5"
    />
  </svg>
);

export const EmptyListIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="40" y1="50" x2="160" y2="50" stroke="#4ECDC4" strokeWidth="3" opacity="0.5" />
    <line x1="40" y1="90" x2="160" y2="90" stroke="#4ECDC4" strokeWidth="3" opacity="0.4" />
    <line x1="40" y1="130" x2="160" y2="130" stroke="#4ECDC4" strokeWidth="3" opacity="0.3" />
    <line x1="40" y1="170" x2="160" y2="170" stroke="#4ECDC4" strokeWidth="3" opacity="0.2" />
  </svg>
);

export const EmptyDocumentIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="50" y="30" width="100" height="140" rx="5" stroke="#FFD93D" strokeWidth="2" opacity="0.5" />
    <line x1="65" y1="70" x2="135" y2="70" stroke="#FFD93D" strokeWidth="1.5" opacity="0.4" />
    <line x1="65" y1="90" x2="135" y2="90" stroke="#FFD93D" strokeWidth="1.5" opacity="0.3" />
    <line x1="65" y1="110" x2="120" y2="110" stroke="#FFD93D" strokeWidth="1.5" opacity="0.3" />
  </svg>
);

export const SearchIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="80" cy="80" r="50" stroke="#FF6B6B" strokeWidth="2" opacity="0.5" />
    <line x1="120" y1="120" x2="160" y2="160" stroke="#FF6B6B" strokeWidth="2" opacity="0.5" />
  </svg>
);
