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
  if (!ref) {
    setStatus('success');
    return;
  }

  let cancelled = false;
  let attempts = 0;
  const maxAttempts = 15; // ~30s
  let timer = null;

  const clear = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const isPaid = (data) => {
    const ps =
      data?.paymentStatus ??
      data?.order?.paymentStatus ??
      data?.status ??
      data?.order?.status;
    return ['completed', 'paid', 'success', 'successful'].includes(
      String(ps || '').toLowerCase()
    );
  };

  const check = async () => {
    try {
      const res = await paymentsApi.verifyStatus(ref);
      const data = res?.data?.data ?? res?.data ?? res;
      if (cancelled) return;

      const order = data.order ?? data;
      setOrder(order);

      if (isPaid(data)) {
        setStatus('success');
        if (order?._id) {
          trackPurchase(order, purchaseEventId(order._id));
        }
        return;
      }

      setStatus('pending');
      attempts += 1;
      if (attempts < maxAttempts && !cancelled) {
        timer = setTimeout(check, 2000);
      }
    } catch (err) {
      console.warn('verifyStatus failed', err);
      if (cancelled) return;
      attempts += 1;
      if (attempts < maxAttempts) {
        timer = setTimeout(check, 2000);
      } else {
        setStatus('pending');
      }
    }
  };

  check();

  return () => {
    cancelled = true;
    clear();
  };
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
