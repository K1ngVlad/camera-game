import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', style, children, ...rest }: Props) {
  if (variant === 'primary') {
    return (
      <button
        type="button"
        {...rest}
        style={{
          background: 'var(--accent)',
          color: 'var(--bg-deep)',
          border: '3px solid var(--bg-deep)',
          borderRadius: 16,
          padding: '14px 32px',
          fontSize: 18,
          fontFamily: 'Unbounded, sans-serif',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 6px 0 var(--accent-shadow)',
          transition: 'transform 0.05s, box-shadow 0.05s',
          ...style,
        }}
        onMouseDown={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(4px)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 0 var(--accent-shadow)'
          rest.onMouseDown?.(e)
        }}
        onMouseUp={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = ''
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 0 var(--accent-shadow)'
          rest.onMouseUp?.(e)
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = ''
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 0 var(--accent-shadow)'
          rest.onMouseLeave?.(e)
        }}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      type="button"
      {...rest}
      style={{
        background: 'transparent',
        color: 'var(--text)',
        border: '2px solid var(--line)',
        borderRadius: 12,
        padding: '10px 24px',
        fontSize: 15,
        fontFamily: 'Rubik, sans-serif',
        fontWeight: 500,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
