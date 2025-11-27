import React from 'react'

export const Header: React.FC<{ title: string; subtitle?: string; className?: string; style?: React.CSSProperties }> = ({ title, subtitle, className, style }) => (
  <header className={className} style={style}>
    <h1 className="app-title">{title}</h1>
    {subtitle && <p className="app-subtitle">{subtitle}</p>}
  </header>
)
