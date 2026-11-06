import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1 font-sans">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#041a24]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex h-8 w-full rounded-[2px] border border-black/15 bg-white px-3 py-1.5 text-xs text-[#041a24] transition-all',
            'placeholder:text-[#41555f]/60 focus:border-[#041a24] focus:outline-none focus:ring-1 focus:ring-[#041a24]/15',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F4F4F0]',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-[11px] text-red-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#41555f]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
