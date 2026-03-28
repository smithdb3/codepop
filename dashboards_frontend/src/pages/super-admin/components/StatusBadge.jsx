import React from 'react';

export function StatusBadge({ status, text }) {
  const statusMap = {
    online: { icon: '🟢', color: '#10B981' },
    offline: { icon: '🔴', color: '#EF4444' },
    healthy: { icon: '🟢', color: '#10B981' },
    degraded: { icon: '🟡', color: '#F59E0B' },
    critical: { icon: '🔴', color: '#EF4444' },
    active: { icon: '🟢', color: '#10B981' },
    inactive: { icon: '🔴', color: '#EF4444' },
    success: { icon: '✓', color: '#10B981' },
    failure: { icon: '✕', color: '#EF4444' },
  };

  const config = statusMap[status] || statusMap.inactive;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: 'var(--font-size-body-small)',
        color: config.color,
        fontWeight: 'var(--font-weight-semibold)',
      }}
    >
      <span>{config.icon}</span>
      {text && <span>{text}</span>}
    </span>
  );
}
