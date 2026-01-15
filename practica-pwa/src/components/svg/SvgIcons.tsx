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
