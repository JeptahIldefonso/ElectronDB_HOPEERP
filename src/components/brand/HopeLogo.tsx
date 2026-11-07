'use client';

import React from 'react';
import Image from 'next/image';

interface HopeLogoProps {
  className?: string;
  size?: number;
}

export function HopeLogo({ className = '', size = 32 }: HopeLogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-md overflow-hidden border border-black/10 dark:border-white/10 shadow-xs bg-white ${className}`}
    >
      <Image
        src="/logo.jpg"
        alt="ElectronDB Official Logo"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </div>
  );
}
