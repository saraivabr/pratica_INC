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
