import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
    
    const variants = {
      default: 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/10 hover:bg-amber-600',
      destructive: 'bg-red-600 text-zinc-50 shadow-sm hover:bg-red-700',
      outline: 'border border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900 hover:text-zinc-100',
      secondary: 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100',
      ghost: 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
      link: 'text-amber-500 underline-offset-4 hover:underline',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3 text-xs',
      lg: 'h-11 rounded-md px-8 text-base',
      icon: 'h-10 w-10',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
