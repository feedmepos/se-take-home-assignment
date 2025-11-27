import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'normal' | 'vip' | 'add' | 'remove'
  icon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ variant, icon, children, className = '', ...rest }: ButtonProps) => {
  const v = variant ? ` btn-${variant}` : ''
  return (
    <button className={`btn${v} ${className}`} {...rest}>
      {icon && <span className="icon">{icon}</span>}
      {children}
    </button>
  )
}
