import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orders as ordersApi } from '@/api/client';
import useCartStore from '@/context/cartStore';
import { PageLoader } from '@/components/ui';
import { formatNaira } from '@/config/money';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import PaymentStatusBanner from '@/pages/Paymentstatusbanner';
import { trackPurchase, purchaseEventId } from '@/lib/metaPixel';

const POLL_MS = 2500;
const MAX_ATTEMPTS = 24; // ~60s

function isConfirmed(data) {
  const payment = String(
    data?.paymentStatus ?? data?.order?.paymentStatus ?? ''
  ).toLowerCase();
  const orderStatus = String(
    data?.order?.status ?? data?.status ?? ''
  ).toLowerCase();

  if (['cancelled', 'refunded', 'failed'].includes(orderStatus)) return 'failed';
  if (['failed', 'cancelled', 'abandoned'].includes(payment)) return 'failed';

  if (['completed', 'paid', 'success', 'successful'].includes(payment)) {
    return 'success';
  }
  if (['paid', 'processing', 'shipped', 'delivered'].includes(orderStatus)) {
    return 'success';
  }
  return 'pending';
}

export default function OrderSuccessPage() {
  const [params] = useSearchParams();
  const ref =
    params.get('reference') ||
    params.get('ref') ||
    params.get('orderId');
  const checkoutId = params.get('checkout_id') || params.get('checkoutId');

  const [status, setStatus] = useState(() => (ref ? 'loading' : 'pending'));
  const [order, setOrder] = useState(null);
  const clearCart = useCartStore((state) => state.clear);

  useEffect(() => {
    if (!ref) return undefined;

    let cancelled = false;
    let attempts = 0;
    let timer = null;

    const clear = () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const check = async () => {
      try {
        // Prefer an endpoint that live-verifies gateway when needed.
        // Pass checkout_id so Bachs can GET /checkout-sessions/{chk_...}
        const res = await ordersApi.verifyStatus(ref, {
          checkoutId: checkoutId || undefined,
          live: true,
        });
        const data = res?.data?.data ?? res?.data ?? res;
        if (cancelled) return;

        const ord = data.order ?? data;
        setOrder(ord);

        const result = isConfirmed(data);

        if (result === 'success') {
          setStatus('success');
          clearCart();
          if (ord?._id) {
            trackPurchase(ord, purchaseEventId(ord._id));
          }
          return;
        }

        if (result === 'failed') {
          setStatus('failed');
          return;
        }

        setStatus('pending');
        attempts += 1;
        if (attempts < MAX_ATTEMPTS && !cancelled) {
          timer = setTimeout(check, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;

        setStatus('pending');
        const code = err?.response?.status;
        if (code === 404 || code === 400) return;

        attempts += 1;
        if (attempts < MAX_ATTEMPTS && !cancelled) {
          timer = setTimeout(check, POLL_MS);
        }
      }
    };

    check();

    return () => {
      cancelled = true;
      clear();
    };
  }, [ref, checkoutId, clearCart]);

  if (status === 'loading') return <PageLoader />;

  const title =
    status === 'success'
      ? 'Order Confirmed!'
      : status === 'failed'
        ? 'Payment Not Completed'
        : 'Confirming Payment…';

  const message =
    status === 'success'
      ? "Thank you for your order! We'll process it and deliver as soon as possible."
      : status === 'failed'
        ? 'We could not confirm a successful payment. You can retry from My Orders or contact support.'
        : 'Please wait while we confirm your payment with the provider. This usually takes a few seconds.';

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 520,
          animation: 'fadeUp 0.4s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 'var(--space-6)',
          }}
        >
          {status === 'success' ? (
            <CheckCircle2
              size={72}
              strokeWidth={1.5}
              color="var(--success)"
              aria-hidden="true"
            />
          ) : status === 'failed' ? (
            <XCircle
              size={72}
              strokeWidth={1.5}
              color="var(--rust)"
              aria-hidden="true"
            />
          ) : (
            <Clock3
              size={72}
              strokeWidth={1.5}
              color="var(--amber)"
              aria-hidden="true"
            />
          )}
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            color: 'var(--forest-deep)',
            marginBottom: 12,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            color: 'var(--muted)',
            lineHeight: 1.7,
            marginBottom: 'var(--space-8)',
            fontSize: 16,
          }}
        >
          {message}
        </p>

        {order && (
          <div style={{ textAlign: 'left' }}>
            <PaymentStatusBanner order={order} />
          </div>
        )}

        {order && (
          <div
            style={{
              background: 'var(--cream)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-5)',
              marginBottom: 'var(--space-6)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                Order Number
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: 'var(--forest)',
                }}
              >
                {order.orderNumber}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                {status === 'success' ? 'Total Paid' : 'Order Total'}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--forest)' }}>
                {formatNaira(order.total)}
              </span>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link to="/orders" className="btn btn-primary btn-lg">
            View My Orders
          </Link>
          <Link to="/products" className="btn btn-outline btn-lg">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}