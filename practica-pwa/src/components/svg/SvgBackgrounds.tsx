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

    <rect width="1200" height="800" fill="url(#gradientBg)" />
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
