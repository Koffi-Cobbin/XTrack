export default function Toast({ toasts }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 1000,
      width: 'calc(100% - 40px)',
      maxWidth: 400,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warning)' : 'var(--bg-elevated)',
            color: t.type === 'warning' ? '#1a1a2e' : 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            borderLeft: `4px solid ${t.type === 'error' ? '#c0392b' : t.type === 'warning' ? '#e67e22' : 'var(--accent)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: 'var(--shadow-md)',
            animation: 'slideUp 0.2s ease',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
