'use client';

import React from 'react';

interface HopeLogoProps {
  className?: string;
  size?: number;
}

export function HopeLogo({ className = '', size = 32 }: HopeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Hexagonal Isometric Cube */}
      {/* Top Face */}
      <path
        d="M20 4L34 12V14L20 6L6 14V12L20 4Z"
        fill="#34D399"
      />
      <path
        d="M20 6.5L31.5 13L20 19.5L8.5 13L20 6.5Z"
        fill="#10B981"
      />

      {/* Left Face */}
      <path
        d="M6 14.5L19 22V36L6 28.5V14.5Z"
        fill="#166B52"
      />
      <path
        d="M9 17.5L17.5 22.5V32.5L9 27.5V17.5Z"
        fill="#228B47"
      />

      {/* Right Face */}
      <path
        d="M21 22L34 14.5V28.5L21 36V22Z"
        fill="#0F3B2A"
      />
      <path
        d="M22.5 22.5L31 17.5V27.5L22.5 32.5V22.5Z"
        fill="#154C36"
      />

      {/* Center records core node */}
      <circle cx="20" cy="20.5" r="2.5" fill="#FFFFFF" />
      <path
        d="M20 14V18M14 24L17.5 22M26 24L22.5 22"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
