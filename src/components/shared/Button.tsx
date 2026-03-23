import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variantClass = {
  primary:
    'bg-gradient-to-b from-primary-container to-primary text-on-primary disabled:opacity-40',
  secondary:
    'bg-surface-container-high text-on-surface-variant',
  ghost:
    'bg-transparent text-primary',
  danger:
    'bg-surface-container-high text-red-500',
}

const sizeClass = {
  sm: 'px-4 py-2 text-sm rounded-full',
  md: 'px-5 py-2.5 text-base rounded-full',
  lg: 'px-7 py-3.5 text-base rounded-full',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: Props) {
  return (
    <button
      className={`font-headline font-semibold transition-all active:scale-95 select-none whitespace-nowrap ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      style={
        variant === 'primary'
          ? { boxShadow: '0 8px 32px rgba(68,65,204,0.15)' }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  )
}
