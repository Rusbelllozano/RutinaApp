import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'lg' | 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink',
  secondary: 'border border-border bg-transparent text-text',
  ghost: 'bg-transparent text-text-secondary',
}

const sizeClasses: Record<Size, string> = {
  lg: 'h-14 rounded-2xl text-[15px] font-semibold',
  md: 'h-12 rounded-xl text-sm font-medium',
  sm: 'h-9 rounded-lg text-[13px] font-semibold',
}

/** Flat, no-shadow button per docs/DESIGN.md. One primary action per screen. */
export function Button({ variant = 'primary', size = 'lg', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`w-full font-sans ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
}
