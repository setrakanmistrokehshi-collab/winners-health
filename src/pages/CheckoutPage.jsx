import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useCartStore from '@/context/cartStore';
import useAuthStore from '@/context/authStore';
import { payments as paymentsApi } from '@/api/client';
import { Field } from '@/components/ui';
import {
  formatNairaAmount as formatNaira,
  calculateShippingNaira as calculateShipping,
} from '@/config/cartMoney';
import toast from 'react-hot-toast';
import { Box, Lock, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { trackInitiateCheckout, generateEventId } from '@/lib/metaPixel';
import PriceTag from '@/components/PriceTag';
import useRevalidateCart from '@/hooks/useRevalidateCart';
import useCurrencyStore from '@/context/currencyStore';
import GatewayPicker from '@/components/GatewayPicker';

const GATEWAY_LABELS = { monnify: 'Monnify', paystack: 'Paystack', nomba: 'Nomba' };

export default function CheckoutPage() {
  const { items, clear } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [promo, setPromo] = useState('');
  const [promoData, setPromoData] = useState(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gateway, setGateway] = useState('monnify');
  const currency = useCurrencyStore((s) => s.getCurrent());
  const { checking: revalidating, changes: priceChanges } = useRevalidateCart();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      street: '', city: '', state: '',
    },
  });

  // Cart items come from Product.price (plain Naira) — see
  // config/cartMoney.js. The backend independently recomputes and
  // converts to kobo in routes/payments.js, so this is a display
  // preview only; it never determines the actual charge.
  const subtotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount  = promoData ? Math.round(subtotal * (promoData.discountPercent / 100)) : 0;
  const shipping  = calculateShipping(subtotal, discount);
  const total     = subtotal + shipping - discount;

  // Fires once per checkout-page visit with items in cart, not on
  // every render (subtotal/promo changes shouldn't re-fire it — this
  // event represents "reached checkout", not "checkout total changed").
  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout(items, subtotal, generateEventId());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePromo = async () => {
    if (!promo.trim()) return;
    setCheckingPromo(true);
    try {
      const { data } = await paymentsApi.validatePromo(promo.trim().toUpperCase());
      setPromoData(data);
      toast.success(`${data.discountPercent}% discount applied`, {
        icon: <Check size={18} strokeWidth={2.5} color="var(--success)" />,
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid promo code');
      setPromoData(null);
    } finally {
      setCheckingPromo(false);
    }
  };

  const onSubmit = async (formData) => {
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    setSubmitting(true);
    try {
     const payload = {
  items: items.map((i) => ({ productId: i._id, quantity: i.quantity })),
  customer: {                         
    name:  formData.name,
    email: formData.email,
    phone: formData.phone,
  },
  shippingAddress: {
    street: formData.street,
    city:   formData.city,
    state:  formData.state,
    country: 'Nigeria', // hardcoded for now
  },
  promoCode: promoData ? promo.trim().toUpperCase() : undefined,
  gateway,
  currency: currency.code,
};

      const { data } = await paymentsApi.checkout(payload);
      if (data.checkoutUrl) {
        clear();
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Payment initiation failed');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
      <div className='container'>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 'var(--space-8)', color: 'var(--forest)' }}>Checkout</h1>

        {priceChanges?.priceChanges?.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--warning-bg, rgba(224,160,62,0.12))',
            border: '1px solid var(--warning)', borderRadius: 'var(--radius)',
            padding: 'var(--space-4)', marginBottom: 'var(--space-6)',
          }}>
            <AlertTriangle size={18} strokeWidth={2} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div style={{ fontSize: 14, color: 'var(--forest)' }}>
              <strong>Some prices have changed since you added these items.</strong> Your total below
              already reflects the current, correct prices — nothing you see here differs from what
              you'll be charged.
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {priceChanges.priceChanges.map((c) => (
                  <li key={c.name}>{c.name}: was {formatNaira(c.from)}, now {formatNaira(c.to)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className='checkout-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-8)', alignItems: 'start' }}>
            {/* ── Left: Details ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Contact */}
              <div className='card' style={{ padding: 'var(--space-6)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 'var(--space-5)', color: 'var(--forest)' }}>Contact Info</h2>
                <div className='checkout-2col' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <Field label='Full Name *' error={errors.name?.message}>
                    <input className={`input ${errors.name ? 'error' : ''}`} {...register('name', { required: 'Required' })} />
                  </Field>
                  <Field label='Email *' error={errors.email?.message}>
                    <input className={`input ${errors.email ? 'error' : ''}`} type='email' {...register('email', { required: 'Required' })} />
                  </Field>
                  <Field label='Phone *' error={errors.phone?.message} style={{ gridColumn: '1 / -1' }}>
                    <input className={`input ${errors.phone ? 'error' : ''}`} placeholder='08012345678' {...register('phone', { required: 'Required' })} />
                  </Field>
                </div>
              </div>

              {/* Shipping */}
              <div className='card' style={{ padding: 'var(--space-6)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 'var(--space-5)', color: 'var(--forest)' }}>Delivery Address</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <Field label='Street Address *' error={errors.street?.message}>
                    <input className={`input ${errors.street ? 'error' : ''}`} placeholder='12 Adeola Odeku Street' {...register('street', { required: 'Required' })} />
                  </Field>
                  <div className='checkout-2col' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <Field label='City *' error={errors.city?.message}>
                      <input className={`input ${errors.city ? 'error' : ''}`} placeholder='Lagos' {...register('city', { required: 'Required' })} />
                    </Field>
                    <Field label='State *' error={errors.state?.message}>
                      <input className={`input ${errors.state ? 'error' : ''}`} placeholder='Lagos State' {...register('state', { required: 'Required' })} />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Items preview */}
              <div className='card' style={{ padding: 'var(--space-6)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 'var(--space-4)', color: 'var(--forest)' }}>Order Items</h2>
                {items.map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <Box size={20} strokeWidth={1.8} color="var(--sage)" aria-hidden="true" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--forest)' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, marginLeft: 12 }}><PriceTag amount={item.price * item.quantity} size="sm" /></span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Summary ── */}
            <div className='checkout-summary' style={{ position: 'sticky', top: 80 }}>
              <div className='card' style={{ padding: 'var(--space-6)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 'var(--space-5)', color: 'var(--forest)' }}>Order Summary</h2>

                {/* Promo code */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className='input'
                      placeholder='Promo code'
                      value={promo}
                      onChange={(e) => setPromo(e.target.value.toUpperCase())}
                      style={{ flex: 1 }}
                    />
                    <button type='button' className='btn btn-outline btn-sm' onClick={handlePromo} disabled={checkingPromo}>
                      {checkingPromo ? '...' : 'Apply'}
                    </button>
                  </div>
                  {promoData && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                      <Check size={13} strokeWidth={2.5} /> {promoData.discountPercent}% discount applied
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <LineItem label='Subtotal' priceAmount={subtotal} />
                  <LineItem label='Shipping' value={shipping === 0 ? 'Free' : undefined} priceAmount={shipping === 0 ? undefined : shipping} valueColor={shipping === 0 ? 'var(--success)' : undefined} />
                  {discount > 0 && <LineItem label={`Promo (${promoData?.discountPercent}%)`} priceAmount={-discount} valueColor='var(--success)' />}
                  <hr className='divider' style={{ margin: '4px 0' }} />
                  <LineItem label='Total' priceAmount={total} bold />
                </div>

                {/* Payment method */}
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', marginBottom: 8 }}>Payment method</div>
                  <GatewayPicker value={gateway} onChange={setGateway} />
                </div>

                <button
                  type='submit'
                  className='btn btn-primary btn-full btn-lg'
                  style={{ marginTop: 'var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <><div className='spinner' style={{ width: 18, height: 18, borderColor: 'white' }} /> Processing...</>
                  ) : (
                    <>Pay <PriceTag amount={total} size="md" strike={false} color="#ffffff" /> <ArrowRight size={18} strokeWidth={2.2} /></>
                  )}
                </button>

                <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 12 }}>
                    <Lock size={13} strokeWidth={2} aria-hidden="true" /> Secured by {GATEWAY_LABELS[gateway]} · Your data is safe
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function LineItem({ label, value, priceAmount, bold, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: bold ? 18 : 14, fontWeight: bold ? 700 : 400, color: bold ? 'var(--forest)' : 'var(--muted)' }}>
      <span>{label}</span>
      {priceAmount !== undefined
        ? <PriceTag amount={priceAmount} size={bold ? 'lg' : 'sm'} muted={!bold} strike={!bold} />
        : <span style={{ color: valueColor }}>{value}</span>}
    </div>
  );
}