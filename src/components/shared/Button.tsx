import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variantClass = {
  primary: 'bg-indigo-500 text-white active:bg-indigo-700 disabled:opacity-40',
  secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-600',
  ghost: 'bg-transparent text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700',
  danger: 'bg-red-500 text-white active:bg-red-700',
}

const sizeClass = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-2xl',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: Props) {
  return (
    <button
      className={`font-medium transition-all select-none ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
