import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Search, Clock, HeartHandshake } from 'lucide-react';


const STATUS_CONFIG = {
  pending: {
    tone: 'neutral',
    Icon: Clock,
    title: 'Payment confirmation in progress',
    body: () => (
      <>The payment provider is still confirming your payment. You don't need to pay again; we'll update your order as soon as confirmation arrives. If the status doesn't update soon, please contact support.</>
    ),
  },
  rejected: {
    tone: 'warning',
    Icon: AlertTriangle,
    title: "Your payment didn't go through",
    body: (order) => (
      <>
        The amount received for this order didn't match the total, so the payment
        was declined and the funds are being <strong>returned to the account you paid from</strong>.
        This can take anywhere from a few minutes up to 24 hours to reflect, depending on your bank.
        {order.total ? (
          <> Your order total is <strong>₦{(order.total / 100).toLocaleString()}</strong> — when you're
          ready, you can retry with that exact amount.</>
        ) : null}
      </>
    ),
    cta: { label: 'Retry payment', to: (order) => `/checkout?retry=${order._id}` },
  },
  flagged_underpaid: {
    tone: 'warning',
    Icon: AlertTriangle,
    title: 'We received a partial payment',
    body: (order) => (
      <>
        The transfer we received was less than your order total of{' '}
        <strong>₦{(order.total / 100).toLocaleString()}</strong>. Your order hasn't been processed yet —
        our team is reviewing this and will be in touch, or you can contact support directly with your
        order number for a faster resolution.
      </>
    ),
    cta: { label: 'Contact support', to: () => '/contact' },
  },
  discrepancy: {
    tone: 'warning',
    Icon: Search,
    title: 'Your payment is under review',
    body: () => (
      <>
        We're double-checking the details of this payment before processing your order. This is
        usually resolved quickly — no action is needed from you right now, but feel free to reach
        out if you don't hear back within a day.
      </>
    ),
    cta: { label: 'Contact support', to: () => '/contact' },
  },
  expired: {
    tone: 'neutral',
    Icon: Clock,
    title: 'Checkout session expired',
    body: () => (
      <>
        The payment window for this order closed before it was completed. No charge was made — you
        can start a new checkout for the same items whenever you're ready.
      </>
    ),
    cta: { label: 'Retry payment', to: (order) => `/checkout?retry=${order._id}` },
  },
};

const TONE_STYLES = {
  warning: {
    background: '#FFFBEB',
    border: '#F0C36D',
    iconBg: '#F5E3B3',
    title: '#92400E',
    body: '#7A5B15',
  },
  neutral: {
    background: 'var(--parchment, #F4F1EA)',
    border: '#DED8C8',
    iconBg: '#E7E2D6',
    title: 'var(--forest-deep, #2F5D3A)',
    body: 'var(--muted, #6B6A63)',
  },
};

export default function PaymentStatusBanner({ order }) {
  if (!order) return null;

  const paymentStatus = String(order.paymentStatus ?? '').toLowerCase();
  const orderStatus = String(order.status ?? '').toLowerCase();
  const gatewayStatus = String(order.gatewayStatus ?? order.paymentResult?.status ?? '').toLowerCase();
  const paymentIsSettled =
    ['completed', 'paid', 'success', 'successful'].includes(paymentStatus) ||
    ['completed', 'paid', 'processing', 'shipped', 'delivered'].includes(orderStatus) ||
    ['completed', 'paid', 'success', 'successful'].includes(gatewayStatus);

  if (paymentIsSettled && !order.overpaymentFlag) return null;

  if (order.overpaymentFlag) {
    return (
      <div style={bannerStyle(TONE_STYLES.neutral)}>
        <span style={iconStyle(TONE_STYLES.neutral)}>
          <HeartHandshake size={16} strokeWidth={1.8} color={TONE_STYLES.neutral.title} aria-hidden="true" />
        </span>
        <div>
          <p style={titleStyle(TONE_STYLES.neutral)}>You paid a little extra</p>
          <p style={bodyStyle(TONE_STYLES.neutral)}>
            We received {order.overpaidAmount ? `₦${(order.overpaidAmount / 100).toLocaleString()}` : 'a small amount'} more
            than your order total. Your order is confirmed and being processed as normal — we'll be in
            touch about refunding or crediting the difference.
          </p>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[order.paymentStatus];
  if (!config) return null; // No additional notice is needed for this payment status.

  const styles = TONE_STYLES[config.tone];

  return (
    <div style={bannerStyle(styles)}>
      <span style={iconStyle(styles)}>
        <config.Icon size={16} strokeWidth={1.8} color={styles.title} aria-hidden="true" />
      </span>
      <div style={{ flex: 1 }}>
        <p style={titleStyle(styles)}>{config.title}</p>
        <p style={bodyStyle(styles)}>{config.body(order)}</p>
        {config.cta && (
          <Link
            to={config.cta.to(order)}
            style={{
              display: 'inline-block',
              marginTop: 10,
              fontSize: 14,
              fontWeight: 600,
              color: styles.title,
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            {config.cta.label} →
          </Link>
        )}
      </div>
    </div>
  );
}

function bannerStyle(styles) {
  return {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    background: styles.background,
    border: `1px solid ${styles.border}`,
    borderRadius: 12,
    padding: '16px 18px',
    margin: '0 0 var(--space-6, 24px)',
  };
}

function iconStyle(styles) {
  return {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: styles.iconBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
  };
}

function titleStyle(styles) {
  return {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 700,
    color: styles.title,
  };
}

function bodyStyle(styles) {
  return {
    margin: '4px 0 0',
    fontSize: 14,
    lineHeight: 1.6,
    color: styles.body,
  };
}
