import { CreditCard } from 'lucide-react';

const GATEWAYS = [
  { code: 'monnify', label: 'Monnify', blurb: 'Card, bank transfer, USSD' },
  { code: 'paystack', label: 'Paystack', blurb: 'Card, bank transfer, USSD' },
  { code: 'nomba', label: 'Nomba', blurb: 'Card, bank transfer' },
];

export default function GatewayPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Payment method" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {GATEWAYS.map((g) => {
        const active = value === g.code;
        return (
          <label
            key={g.code}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              border: `1.5px solid ${active ? 'var(--sage)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)', padding: '12px 14px',
              cursor: 'pointer', background: active ? 'var(--parchment)' : 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <input
              type="radio"
              name="gateway"
              value={g.code}
              checked={active}
              onChange={() => onChange(g.code)}
              style={{ accentColor: 'var(--sage)', width: 16, height: 16 }}
            />
            <CreditCard size={18} strokeWidth={1.8} color={active ? 'var(--sage)' : 'var(--muted)'} aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--forest)' }}>{g.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.blurb}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
