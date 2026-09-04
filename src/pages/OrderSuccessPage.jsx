import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { payments as paymentsApi } from '@/api/client';
import { PageLoader } from '@/components/ui';
import { formatNaira } from '@/config/money';
import { CheckCircle2, Clock3 } from 'lucide-react';
import PaymentStatusBanner from '@/pages/Paymentstatusbanner';
import { trackPurchase, purchaseEventId } from '@/lib/metaPixel';

export default function OrderSuccessPage() {
  const [params] = useSearchParams();
  const ref = params.get('reference') || params.get('ref');
  const [status, setStatus] = useState('loading');
  const [order, setOrder]   = useState(null);

  useEffect(() => {
    if (!ref) { setStatus('success'); return; }
    paymentsApi.verifyStatus(ref)
      .then(({ data }) => {
        setOrder(data.order);
        const isSuccess = data.paymentStatus === 'completed';
        setStatus(isSuccess ? 'success' : 'pending');
        // Deterministic per-order ID (not a fresh generateEventId())
        // so reloading this page re-sends the SAME event_id — Meta
        // dedupes repeats of an identical ID rather than counting
        // each page reload as a new Purchase.
        if (isSuccess && data.order?._id) {
          trackPurchase(data.order, purchaseEventId(data.order._id));
        }
      })
      .catch(() => setStatus('success'));
  }, [ref]);

  if (status === 'loading') return <PageLoader />;

  return (
    <div style={{
      minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-8)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 520, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
          {status === 'success'
            ? <CheckCircle2 size={72} strokeWidth={1.5} color="var(--success)" aria-hidden="true" />
            : <Clock3 size={72} strokeWidth={1.5} color="var(--amber)" aria-hidden="true" />}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--forest-deep)', marginBottom: 12 }}>
          {status === 'success' ? 'Order Confirmed!' : 'Payment Processing'}
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 'var(--space-8)', fontSize: 16 }}>
          {status === 'success'
            ? 'Thank you for your order! We\'ll process your order and deliver them to you sooner.'
            : 'Your payment is being processed. You\'ll receive a confirmation email shortly.'}
        </p>

        {order && (
          <div style={{ textAlign: 'left' }}>
            <PaymentStatusBanner order={order} />
          </div>
        )}

        {order && (
          <div style={{
            background: 'var(--cream)', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-5)', marginBottom: 'var(--space-6)', textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Order Number</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--forest)' }}>{order.orderNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Total Paid</span>
              <span style={{ fontWeight: 700, color: 'var(--forest)' }}>{formatNaira(order.total)}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to='/orders' className='btn btn-primary btn-lg'>View My Orders</Link>
          <Link to='/products' className='btn btn-outline btn-lg'>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
