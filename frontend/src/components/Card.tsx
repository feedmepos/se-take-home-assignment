import React from 'react'

export const Card: React.FC<React.PropsWithChildren<{ className?: string; title?: string }>> = ({ className = '', title, children }) => (
  <section className={className} style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    {title && <h2>{title}</h2>}
    {children}
  </section>
)
