'use client'
// Componenti condivisi del pannello admin (stili in app/admin/admin.css)
import type { ReactNode } from 'react'

export function PageHeader({ icon, title, subtitle, actions }: { icon?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="adm-head">
      <div style={{ minWidth: 0 }}>
        <div className="adm-head-title">{icon ? `${icon} ` : ''}{title}</div>
        {subtitle && <div className="adm-head-sub">{subtitle}</div>}
      </div>
      {actions && <div className="adm-head-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, icon, more, children, style }: { title?: string; icon?: string; more?: ReactNode; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="adm-card" style={style}>
      {title && <div className="adm-card-title">{icon && <span>{icon}</span>}<span>{title}</span>{more}</div>}
      {children}
    </div>
  )
}

export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return <span className="adm-pill" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 40%, transparent)` }}>{children}</span>
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="adm-seg">
      {options.map(o => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="n">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon = '📭', children }: { icon?: string; children: ReactNode }) {
  return <div className="adm-empty"><div className="ico">{icon}</div>{children}</div>
}

// Stati ordine: etichette e colori unici per tutto il pannello
export const ORDER_STATUS: Record<string, { label: string; short: string; color: string; icon: string }> = {
  pending:   { label: 'In attesa di pagamento', short: 'Da incassare', color: '#ff9a4d', icon: '💳' },
  paid:      { label: 'Pagato · da spedire',    short: 'Da spedire',   color: '#f5c842', icon: '📦' },
  shipped:   { label: 'Spedito',                short: 'Spedito',      color: '#60a5fa', icon: '🚚' },
  delivered: { label: 'Consegnato',             short: 'Consegnato',   color: '#3dff6e', icon: '✅' },
  cancelled: { label: 'Annullato',              short: 'Annullato',    color: '#8aa58c', icon: '✕' },
}

export const eur = (n: number, compact = false) =>
  compact && Math.abs(n) >= 1000
    ? `€${(n / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k`
    : `€${n.toLocaleString('it-IT', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
