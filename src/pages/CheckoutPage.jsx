import React, { useEffect, useRef, useState } from 'react';
//import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import useCartStore from '@/context/cartStore';
import useAuthStore from '@/context/authStore';
import api, { orders as ordersApi, payments as paymentsApi, shipping as shippingApi } from '@/api/client';
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

const GATEWAY_LABELS = { monnify: 'Monnify', bachs: 'Bachs', paystack: 'Paystack', nomba: 'Nomba' };

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

function getSafeCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const { items, markStale } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchParams] = useSearchParams();
  const retryOrderId = searchParams.get('retry');
  const restoredRetryId = useRef(null);
 // const  navigate = useNavigate();
  const [promo, setPromo] = useState('');
  const [promoData, setPromoData] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [gatewayError, setGatewayError] = useState('');
  const [retryLoadError, setRetryLoadError] = useState('');
  const [pendingRetryOrder, setPendingRetryOrder] = useState(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
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
    if (!retryOrderId || !isAuthenticated || restoredRetryId.current === retryOrderId) return undefined;

    let active = true;
    async function loadPendingOrder() {
      try {
        const { data } = await ordersApi.get(retryOrderId);
        const body = data?.data ?? data ?? {};
        const pendingOrder = body.order ?? body;
        if (!active) return;
        if (!pendingOrder?._id && !pendingOrder?.id) {
          throw new Error('Order response did not include an order ID');
        }
        if (String(pendingOrder.status ?? '').toLowerCase() !== 'pending') {
          throw new Error('This order is not pending payment');
        }
        setPendingRetryOrder(pendingOrder);
        restoredRetryId.current = retryOrderId;
        setRetryLoadError('');
      } catch {
        if (active) {
          setPendingRetryOrder(null);
          setRetryLoadError('We could not load this order for payment. Please try again from your orders.');
        }
      }
    }

    loadPendingOrder();
    return () => { active = false; };
  }, [retryOrderId, isAuthenticated]);

  // Cart items come from Product.price (plain Naira) — see
  // config/cartMoney.js. The backend independently recomputes and
  // converts to kobo in routes/payments.js, so this is a display
  // preview only; it never determines the actual charge.
  const hasPwywItems = items.some((item) => item.pwywEnabled);
  const retryCurrency = pendingRetryOrder?.currency?.code
    ?? pendingRetryOrder?.currency
    ?? pendingRetryOrder?.paymentCurrency
    ?? currency.code;
  const checkoutCurrencyCode = retryOrderId ? String(retryCurrency).toUpperCase() : 'NGN';
  const bachsCurrencyAllowed = ['USD', 'NGN'].includes(checkoutCurrencyCode);
  const checkoutPriceProps = (amount) => gateway === 'bachs'
    ? { text: formatNaira(amount) }
    : { amount };
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
    if (submittingRef.current) return;
    if (!retryOrderId && items.length === 0) { toast.error('Cart is empty'); return; }
    if (retryOrderId && !pendingRetryOrder) {
      toast.error('We could not load this order for payment. Please try again from your orders.');
      return;
    }
    if (retryOrderId && !isAuthenticated) {
      toast.error('Sign in with the account that owns this order to retry payment.');
      return;
    }
    if (gateway === 'bachs' && !bachsCurrencyAllowed) {
      setGatewayError('Bachs is not available for this currency');
      return;
    }
    if (!retryOrderId && hasStaleItems) {
      toast.error('Choose again for unavailable options before checkout');
      return;
    }
    if (!retryOrderId && shippingQuoteLoading) {
      toast.error('Calculating shipping fee. Please wait.');
      return;
    }
    if (!retryOrderId && !shippingAvailable) {
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

    submittingRef.current = true;
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
        currency: gateway === 'bachs' ? 'NGN' : currency.code,
      };

      const response = retryOrderId
        ? await ordersApi.pay(retryOrderId, { gateway })
        : await paymentsApi.checkout(payload);
      const data = response.data?.data ?? response.data ?? {};
      const checkoutUrl = getSafeCheckoutUrl(data.checkoutUrl);
      if (!checkoutUrl) throw new Error('The payment provider returned an invalid checkout link. Please try again.');
      window.location.assign(checkoutUrl);
    } catch (err) {
      const errorData = err?.response?.data || {};
      const errorCode = errorData.code || errorData.errorCode ||
        (typeof errorData.error === 'string' ? errorData.error : errorData.error?.code);
      const bachsProviderError = errorData.gatewayResponse?.error_code || errorData.gatewayResponse?.errorCode;
      if (errorCode === 'BACHS_CURRENCY_UNSUPPORTED') {
        setGatewayError('Bachs is not available for this currency');
      } else if (gateway === 'bachs' && (
        errorCode === 'BACHS_CHECKOUT_CREATE_FAILED' ||
        bachsProviderError === 'FORBIDDEN' ||
        err?.response?.status >= 500
      )) {
        setGatewayError('Bachs is temporarily unavailable. Choose another payment method or try again later.');
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
      } else if (retryOrderId && [401, 403].includes(err?.response?.status)) {
        toast.error('Sign in with the account that owns this order to retry payment.');
      } else {
        toast.error(errorData.message || err.message || 'Checkout failed. Please try again.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCheckoutSubmit = retryOrderId
    ? (event) => {
        event.preventDefault();
        void onSubmit({});
      }
    : handleSubmit(onSubmit);

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

        {retryOrderId && !isAuthenticated && (
          <div role="alert" style={{ marginBottom: 'var(--space-5)', color: 'var(--error)' }}>
            Sign in with the account that owns this order to retry payment.
          </div>
        )}
        {retryLoadError && (
          <div role="alert" style={{ marginBottom: 'var(--space-5)', color: 'var(--error)' }}>
            {retryLoadError}
          </div>
        )}
        <form onSubmit={handleCheckoutSubmit}>
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
                        {...checkoutPriceProps(item.pwywEnabled
                          ? Number(item.lineTotal ?? item.price * item.quantity)
                          : item.price * item.quantity)}
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
                  <LineItem
                    label='Subtotal'
                    priceAmount={subtotal}
                    priceText={gateway === 'bachs' ? formatNaira(subtotal) : undefined}
                  />
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
                    priceText={gateway === 'bachs' && !shippingQuoteLoading && shippingAvailable && shipping > 0 ? formatNaira(shipping) : undefined}
                    valueColor={!shippingAvailable || shipping === 0 ? 'var(--muted)' : undefined}
                  />
                  {discount > 0 && (
                    <LineItem
                      label={`Promo (${promoData?.discountPercent}%)`}
                      priceAmount={-discount}
                      priceText={gateway === 'bachs' ? formatNaira(-discount) : undefined}
                      valueColor='var(--success)'
                    />
                  )}
                  <hr className='divider' style={{ margin: '4px 0' }} />
                  <LineItem
                    label='Total'
                    priceAmount={total}
                    priceText={gateway === 'bachs' ? formatNaira(total) : undefined}
                    bold
                  />
                </div>

                {/* Payment method */}
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', marginBottom: 8 }}>Payment method</div>
                  <GatewayPicker
                    value={gateway}
                    currencyCode={checkoutCurrencyCode}
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
                  {gateway === 'bachs' && !bachsCurrencyAllowed && !gatewayError && (
                    <p role="alert" style={{ color: 'var(--error)', fontSize: 13, marginTop: 8 }}>
                      Bachs is not available for this currency
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
                  disabled={submitting || shippingQuoteLoading || !shippingAvailable || hasStaleItems || (gateway === 'bachs' && !bachsCurrencyAllowed) || (Boolean(retryOrderId) && !pendingRetryOrder)}
                >
                  {submitting ? (
                    <><div className='spinner' style={{ width: 18, height: 18, borderColor: 'white' }} /> Processing...</>
                  ) : (
                    <>Pay <PriceTag {...checkoutPriceProps(total)} size="md" strike={false} color="#ffffff" /> <ArrowRight size={18} strokeWidth={2.2} /></>
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

function LineItem({ label, value, priceAmount, priceText, bold, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: bold ? 18 : 14, fontWeight: bold ? 700 : 400, color: bold ? 'var(--forest)' : 'var(--muted)' }}>
      <span>{label}</span>
      {priceAmount !== undefined
        ? <PriceTag {...(priceText !== undefined ? { text: priceText } : { amount: priceAmount })} size={bold ? 'lg' : 'sm'} muted={!bold} strike={false} />
        : <span style={{ color: valueColor }}>{value}</span>}
    </div>
  );
}