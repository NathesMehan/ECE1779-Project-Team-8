
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './Button.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`custom-button button-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
