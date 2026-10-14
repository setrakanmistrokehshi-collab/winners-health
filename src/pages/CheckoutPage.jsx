import React, { useEffect, useRef, useState } from 'react';
//import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import useCartStore from '@/context/cartStore';
import useAuthStore from '@/context/authStore';
import api, { orders as ordersApi, payments as paymentsApi, products as productsApi, shipping as shippingApi } from '@/api/client';
import { Field } from '@/components/ui';
import {
  formatNairaAmount as formatNaira,
} from '@/config/cartMoney';
import toast from 'react-hot-toast';
import { Box, Lock, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { trackInitiateCheckout, generateEventId } from '@/lib/metaPixel';
import PriceTag from '@/components/PriceTag';
import useRevalidateCart from '@/hooks/useRevalidateCart';
import useCurrencyStore from '@/context/currencyStore';
import GatewayPicker from '@/components/GatewayPicker';
import {
  getPushPermissionState,
  isIOSInstallRequired,
  isPushConfigured,
  requestPushPermission,
} from '@/lib/onesignal';

const GATEWAY_LABELS = { monnify: 'Monnify', bachs: 'Bachs' };

function normalizeLocation(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\bstate\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function unwrapShippingPayload(payload) {
  const body = payload?.data ?? payload ?? {};
  return body.shipping ?? body.quote ?? body;
}

export default function CheckoutPage() {
  const { items, replaceItems, clear, markStale } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const retryOrderId = searchParams.get('retry');
  const restoredRetryId = useRef(null);
 // const  navigate = useNavigate();
  const [promo, setPromo] = useState('');
  const [promoData, setPromoData] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [gatewayError, setGatewayError] = useState('');
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notifyOrderUpdates, setNotifyOrderUpdates] = useState(true);
  const [pushPermissionHint, setPushPermissionHint] = useState('');
  const [gateway, setGateway] = useState('monnify');
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
  const [shippingConfig, setShippingConfig] = useState({
    shippingFee: 0,
    freeShippingThreshold: 0,
    zones: [],
  });
  const currency = useCurrencyStore((s) => s.getCurrent());
  const {  changes: priceChanges } = useRevalidateCart();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      street: '', city: '', state: '',
    },
  });
  const city = watch('city');
  const state = watch('state');

  useEffect(() => {
    if (gateway === 'bachs' && !['USD', 'NGN'].includes(currency.code)) {
      setGateway('monnify');
    }
  }, [gateway, currency.code]);

  useEffect(() => {
    if (!retryOrderId || restoredRetryId.current === retryOrderId) return undefined;

    let active = true;
    async function restorePendingOrder() {
      try {
        const { data } = await ordersApi.get(retryOrderId);
        const body = data?.data ?? data ?? {};
        const pendingOrder = body.order ?? body;

        if (!active || !Array.isArray(pendingOrder.items)) return;

        const recoveryItems = pendingOrder.items
          .map((item) => {
            const product = item.product ?? item.productId ?? item;
            const productId = product?._id ?? product?.id ?? item.productId;
            return productId
              ? { item, product, productId: String(productId), quantity: Number(item.quantity) || 1 }
              : null;
          })
          .filter(Boolean);

        if (recoveryItems.length === 0) {
          throw new Error('Pending order has no recoverable products');
        }

        // Fetch current product prices in the product API's base units. Never
        // copy order snapshot prices here: order/payment values may be stored
        // in currency minor units, while cart prices use the product contract.
        const { data: revalidated } = await productsApi.revalidateCart(
          recoveryItems.map(({ productId }) => productId)
        );
        const freshProducts = new Map(
          (revalidated?.products ?? []).map((product) => [String(product.productId ?? product._id), product])
        );

        const restoredItems = recoveryItems.map(({ item, product, productId, quantity }) => {
          const fresh = freshProducts.get(productId);
          if (!fresh || fresh.available === false || !Number.isFinite(Number(fresh.price))) {
            throw new Error('A product in this checkout is no longer available');
          }

          return {
            ...product,
            _id: productId,
            name: item.name ?? product.name,
            price: Number(fresh.price),
            stock: fresh.stock,
            image: item.image ?? product.image,
            quantity,
          };
        });

        if (active) {
          replaceItems(restoredItems);
          restoredRetryId.current = retryOrderId;
        }
      } catch (err) {
        if (active) toast.error('We could not restore that checkout. Please start again.');
      }
    }

    restorePendingOrder();
    return () => { active = false; };
  }, [retryOrderId, replaceItems]);

  // Cart items come from Product.price (plain Naira) — see
  // config/cartMoney.js. The backend independently recomputes and
  // converts to kobo in routes/payments.js, so this is a display
  // preview only; it never determines the actual charge.
  const hasPwywItems = items.some((item) => item.pwywEnabled);
  const hasStaleItems = items.some((item) => item.stale);
  const subtotal = items.reduce((sum, item) => sum + (item.pwywEnabled
    ? Number(item.lineTotal ?? item.price * item.quantity) || 0
    : item.price * item.quantity), 0);
  const discount = promoData
    ? Math.round(subtotal * (promoData.discountPercent / 100))
    : 0;
  const locationText = normalizeLocation(`${city || ''} ${state || ''}`);
  const matchedZone = shippingConfig.zones.find((zone) => {
    const zoneName = normalizeLocation(zone.name);
    return zoneName && locationText && (
      locationText.includes(zoneName) || zoneName.includes(locationText)
    );
  });
  const hasDeliveryLocation = Boolean(locationText);
  const hasConfiguredZones = shippingConfig.zones.length > 0;
  const localShippingAvailable = hasDeliveryLocation && (!hasConfiguredZones || Boolean(matchedZone));
  const shippingAvailable = shippingQuote
    ? shippingQuote.available !== false
    : localShippingAvailable;
  const shippingFee = shippingQuote
    ? Number(shippingQuote.shippingFee ?? shippingQuote.fee ?? 0)
    : shippingAvailable
      ? Number(matchedZone?.price ?? shippingConfig.shippingFee ?? shippingConfig.fee ?? 0)
      : 0;
  const freeShippingThreshold = Number(shippingConfig.freeShippingThreshold ?? shippingConfig.freeThreshold ?? 0);
  const shipping = shippingQuote
    ? shippingFee
    : shippingAvailable && subtotal - discount < freeShippingThreshold
      ? shippingFee
      : 0;
  const total = Number(shippingQuote?.total ?? (subtotal + shipping - discount));

  useEffect(() => {
    let mounted = true;

    async function loadShippingConfig() {
      try {
        const { data } = await shippingApi.getConfig();
        const shippingOptions = unwrapShippingPayload(data);

        if (!mounted) return;

        setShippingConfig({
          shippingFee: Number(shippingOptions.standardFee ?? shippingOptions.fee ?? shippingOptions.shippingFee ?? shippingOptions.price ?? 0),
          freeShippingThreshold: Number(shippingOptions.freeThreshold ?? shippingOptions.freeShippingThreshold ?? 0),
          zones: Array.isArray(shippingOptions.zones)
            ? shippingOptions.zones.map((zone) => ({
                name: String(zone.name ?? '').trim(),
                price: Math.max(0, Number(zone.price) || 0),
              }))
            : [],
        });
      } catch (err) {
        // Keep checkout usable while the dedicated backend endpoint is
        // being deployed; remove this fallback once /shipping/config exists.
        try {
          const { data } = await api.get('/admin/settings');
          const shippingOptions = unwrapShippingPayload(data);

          if (!mounted) return;

          setShippingConfig({
            shippingFee: Number(shippingOptions.standardFee ?? shippingOptions.fee ?? shippingOptions.shippingFee ?? shippingOptions.price ?? 0),
            freeShippingThreshold: Number(shippingOptions.freeThreshold ?? shippingOptions.freeShippingThreshold ?? 0),
            zones: Array.isArray(shippingOptions.zones)
              ? shippingOptions.zones.map((zone) => ({
                  name: String(zone.name ?? '').trim(),
                  price: Math.max(0, Number(zone.price) || 0),
                }))
              : [],
          });
        } catch (fallbackError) {
          console.warn('Failed to load shipping configuration:', fallbackError);
        }
      }
    }

    loadShippingConfig();

    if (items.length > 0 && !items.some((item) => item.pwywEnabled)) {
      trackInitiateCheckout(items, subtotal, generateEventId());
    }

    return () => { mounted = false; };
  }, [items, subtotal]);

  useEffect(() => {
    if (!hasDeliveryLocation) {
      setShippingQuote(null);
      setShippingQuoteLoading(false);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setShippingQuoteLoading(true);
      try {
        const { data } = await shippingApi.quote({
          city: city || '',
          state: state || '',
          country: 'Nigeria',
          subtotal,
          discount,
        });

        if (active) setShippingQuote(unwrapShippingPayload(data));
      } catch (err) {
        // Keep the local calculation as a temporary fallback while the
        // dedicated quote endpoint is unavailable during backend rollout.
        if (active) setShippingQuote(null);
      } finally {
        if (active) setShippingQuoteLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [city, state, subtotal, discount, hasDeliveryLocation]);

  const handlePromo = async () => {
    if (!promo.trim()) return;
    setCheckingPromo(true);
    setPromoError('');
    try {
      const { data } = await paymentsApi.validatePromo(promo.trim().toUpperCase());
      setPromoData(data);
      toast.success(hasPwywItems ? 'Promo applied' : `${data.discountPercent}% promo applied`, {
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
    if (hasStaleItems) {
      toast.error('Choose again for unavailable options before checkout');
      return;
    }
    if (shippingQuoteLoading) {
      toast.error('Calculating shipping fee. Please wait.');
      return;
    }
    if (!shippingAvailable) {
      toast.error(hasDeliveryLocation
        ? 'We do not currently deliver to this location'
        : 'Enter your city or state to calculate shipping');
      return;
    }

    setPushPermissionHint('');
    let permissionRequest;
    if (isPushConfigured() && notifyOrderUpdates && getPushPermissionState() !== 'granted') {
      if (isIOSInstallRequired()) {
        setPushPermissionHint('On iPhone, tap Share, then Add to Home Screen to enable notifications.');
      } else {
        permissionRequest = requestPushPermission();
      }
    }

    setSubmitting(true);
    setGatewayError('');
    try {
      if (permissionRequest) {
        let permissionTimeout;
        const permissionResult = await Promise.race([
          permissionRequest,
          new Promise((resolve) => {
            permissionTimeout = setTimeout(() => resolve('timeout'), 1200);
          }),
        ]);
        clearTimeout(permissionTimeout);

        if (permissionResult === 'denied' || getPushPermissionState() === 'denied') {
          setPushPermissionHint('Notifications are blocked. Use the lock icon in the address bar, then Notifications, to re-enable them.');
        }
        if (permissionResult === 'timeout') {
          void permissionRequest.then((permission) => {
            if (permission === 'denied') {
              setPushPermissionHint('Notifications are blocked. Use the lock icon in the address bar, then Notifications, to re-enable them.');
            }
          });
        }
      }

      const payload = {
        items: items.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
          ...(item.pwywEnabled ? { chosenTierId: item.chosenTierId } : {}),
        })),
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        },
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: 'Nigeria',
        },
        promoCode: promoData ? promo.trim().toUpperCase() : undefined,
        gateway,
        currency: currency.code,
      };

      let data;
      if (gateway === 'bachs') {
        const orderPayload = { ...payload };
        delete orderPayload.gateway;
        const { data: orderResponse } = await paymentsApi.checkout(orderPayload);
        const orderBody = orderResponse?.data ?? orderResponse ?? {};
        const orderId = orderBody.orderId ?? orderBody.order?._id ?? orderBody.order?.id ?? orderBody.id;
        if (!orderId) {
          throw new Error('We could not prepare this order for Bachs. Please try again.');
        }

        const paymentResponse = await ordersApi.pay(orderId, { gateway: 'bachs' });
        data = paymentResponse.data?.data ?? paymentResponse.data;
      } else {
        const response = await paymentsApi.checkout(payload);
        data = response.data;
      }

      if (data.checkoutUrl) {
        clear();
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Payment initiation failed');
      }
    } catch (err) {
      const errorData = err?.response?.data || {};
      const errorCode = errorData.code || errorData.errorCode ||
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.code);
      if (errorCode === 'BACHS_CURRENCY_UNSUPPORTED') {
        setGatewayError('Bachs is not available for this currency');
      } else if (errorCode === 'BACHS_CHECKOUT_CREATE_FAILED') {
        setGatewayError('We couldn’t start Bachs checkout. Please try again.');
      } else if (errorCode === 'CART_LINE_STALE') {
        const details = errorData.line || errorData.cartLine || errorData.details?.line || errorData.details || {};
        const staleProductId = String(details.productId ?? details.product?._id ?? errorData.productId ?? '');
        const staleTierId = String(details.chosenTierId ?? errorData.chosenTierId ?? '');
        const lineId = String(details.lineId ?? errorData.lineId ?? '');
        const itemIndex = Number(details.itemIndex ?? errorData.itemIndex);
        let affected = items.filter((item, index) =>
          (lineId && String(item.lineId) === lineId) ||
          (staleProductId && String(item._id) === staleProductId && (!staleTierId || String(item.chosenTierId) === staleTierId)) ||
          (Number.isInteger(itemIndex) && index === itemIndex)
        );
        if (affected.length === 0) affected = items.filter((item) => item.pwywEnabled);
        markStale(affected.map((item) => item.cartKey || item.lineId || String(item._id)));
        toast.error('This option is no longer available. Please choose again.');
      } else if (errorCode === 'PROMO_BELOW_FLOOR') {
        setPromoError("This promo can't be applied to the selected option.");
      } else {
        toast.error(errorData.message || 'Checkout failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
      <div className='container'>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 'var(--space-8)', color: 'var(--forest)' }}>Checkout</h1>

        {!hasPwywItems && priceChanges?.priceChanges?.length > 0 && (
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
          {hasStaleItems && (
            <div role="alert" style={{ marginBottom: 'var(--space-5)', color: 'var(--error)' }}>
              Choose again for unavailable options in your <Link to="/cart">cart</Link> before checkout.
            </div>
          )}
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
                  <div key={item.cartKey || item.lineId || item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <Box size={20} strokeWidth={1.8} color="var(--sage)" aria-hidden="true" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--forest)' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {item.chosenTierLabel ? `${item.chosenTierLabel} · ` : ''}Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                    <span style={{ flexShrink: 0, marginLeft: 12 }}>
                      <PriceTag
                        amount={item.pwywEnabled
                          ? Number(item.lineTotal ?? item.price * item.quantity)
                          : item.price * item.quantity}
                        size="sm"
                      />
                    </span>
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
                      onChange={(e) => {
                        setPromo(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      style={{ flex: 1 }}
                    />
                    <button type='button' className='btn btn-outline btn-sm' onClick={handlePromo} disabled={checkingPromo}>
                      {checkingPromo ? '...' : 'Apply'}
                    </button>
                  </div>
                  {promoData && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                      <Check size={13} strokeWidth={2.5} /> {hasPwywItems ? 'Promo applied' : `${promoData.discountPercent}% promo applied`}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPromo('');
                          setPromoData(null);
                          setPromoError('');
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {promoError && <div role="alert" style={{ color: 'var(--error)', fontSize: 12, marginTop: 5 }}>{promoError}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <LineItem label='Subtotal' priceAmount={subtotal} />
                  <LineItem
                    label='Shipping'
                    value={!hasDeliveryLocation
                      ? 'Enter state or city'
                      : shippingQuoteLoading
                        ? 'Calculating...'
                      : !shippingAvailable
                        ? 'Unavailable for this location'
                        : shipping === 0 ? 'Free' : undefined}
                        priceAmount={!shippingQuoteLoading && shippingAvailable && shipping > 0 ? shipping : undefined}
                    valueColor={!shippingAvailable || shipping === 0 ? 'var(--muted)' : undefined}
                  />
                  {discount > 0 && <LineItem label={`Promo (${promoData?.discountPercent}%)`} priceAmount={-discount} valueColor='var(--success)' />}
                  <hr className='divider' style={{ margin: '4px 0' }} />
                  <LineItem label='Total' priceAmount={total} bold />
                </div>

                {/* Payment method */}
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', marginBottom: 8 }}>Payment method</div>
                  <GatewayPicker
                    value={gateway}
                    currencyCode={currency.code}
                    onChange={(nextGateway) => {
                      setGateway(nextGateway);
                      setGatewayError('');
                    }}
                  />
                  {gatewayError && (
                    <p role="alert" style={{ color: 'var(--error)', fontSize: 13, marginTop: 8 }}>
                      {gatewayError}
                    </p>
                  )}
                </div>

                {isPushConfigured() && (
                  <div className='checkout-notify'>
                    <label className='checkout-notify-label'>
                      <input
                        type='checkbox'
                        checked={notifyOrderUpdates}
                        onChange={(event) => setNotifyOrderUpdates(event.target.checked)}
                      />
                      <span>Notify me instantly about this order and future orders</span>
                    </label>
                    <p className='checkout-notify-description'>Includes payment confirmation and shipping updates.</p>
                    {pushPermissionHint && (
                      <p className='checkout-notify-hint' role='status'>{pushPermissionHint}</p>
                    )}
                  </div>
                )}

                <button
                  type='submit'
                  className='btn btn-primary btn-full btn-lg'
                  style={{ marginTop: 'var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  disabled={submitting || shippingQuoteLoading || !shippingAvailable || hasStaleItems}
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
        ? <PriceTag amount={priceAmount} size={bold ? 'lg' : 'sm'} muted={!bold} strike={false} />
        : <span style={{ color: valueColor }}>{value}</span>}
    </div>
  );
}