import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCartStore from '@/context/cartStore';
import useAuthStore from '@/context/authStore';
import { EmptyState } from '@/components/ui';
import PriceTag from '@/components/PriceTag';
import {
  calculateShippingNaira as calculateShipping,
  FREE_SHIPPING_THRESHOLD_NAIRA,
} from '@/config/cartMoney';
import toast from 'react-hot-toast';
import { ShoppingCart, Box, Minus, Plus, X, Trash2, ArrowRight, ShieldCheck, Truck, BadgePercent, AlertTriangle } from 'lucide-react';
import useRevalidateCart from '@/hooks/useRevalidateCart';

export default function CartPage() {
  const { items, removeItem, updateQty, clear } = useCartStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const { changes: priceChanges } = useRevalidateCart();

  // Cart items come from Product.price, which is plain Naira — see
  // config/cartMoney.js for why this uses different helpers than
  // OrdersPage (which formats real Order documents, genuinely in kobo).
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = calculateShipping(subtotal);
  const total     = subtotal + shipping;
  const freeShippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD_NAIRA) * 100));

  const handleRemove = (item) => {
    removeItem(item._id);
    toast.success(`${item.name} removed from cart`, {
      icon: <Trash2 size={18} strokeWidth={2} color="var(--rust)" />,
    });
  };

  const handleClear = () => {
    if (items.length === 0) return;
    clear();
    toast.success('Cart cleared');
  };

  if (items.length === 0) return (
    <div style={{ padding: 'var(--space-8) 0' }}>
      <div className='container'>
        <EmptyState
          icon={ShoppingCart}
          title='Your cart is empty'
          message="Looks like you haven't added anything yet. Browse our collection to get started."
          action={<Link to='/products' className='btn btn-primary'>Shop Now</Link>}
        />
      </div>
    </div>
  );

  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
      <div className='container'>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 'var(--space-8)', color: 'var(--forest)' }}>
          Shopping Cart ({items.length} item{items.length !== 1 ? 's' : ''})
        </h1>

        {priceChanges?.priceChanges?.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--warning-bg, rgba(224,160,62,0.12))',
            border: '1px solid var(--warning)', borderRadius: 'var(--radius)',
            padding: 'var(--space-4)', marginBottom: 'var(--space-6)',
          }}>
            <AlertTriangle size={18} strokeWidth={2} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div style={{ fontSize: 14, color: 'var(--forest)' }}>
              <strong>Some prices have changed since you added these items.</strong> The prices
              below have been updated to match — this is what you'll actually pay.
            </div>
          </div>
        )}

        <div className='cart-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-8)', alignItems: 'start' }}>
          {/* Items */}
          <div className='card'>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-light)' }}>
              <button className='btn btn-ghost btn-sm' onClick={handleClear}>Clear all</button>
            </div>
            {items.map((item) => (
              <div key={item._id} className='cart-item' style={{
                display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-5)',
                borderBottom: '1px solid var(--border-light)',
                alignItems: 'center',
              }}>
                {/* Image */}
                <div className='cart-item-image' style={{
                  width: 80, height: 80, borderRadius: 'var(--radius)',
                  background: 'var(--parchment)', overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.images?.[0]
                    ? <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Box size={32} strokeWidth={1.5} color="var(--sage)" aria-hidden="true" />
                  }
                </div>

                {/* Info */}
                <div className='cart-item-info' style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/products/${item.slug || item._id}`} style={{
                    fontWeight: 600, color: 'var(--forest)', fontSize: 15,
                    display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                  </Link>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{item.category}</div>
                </div>

                {/* Qty + Price */}
                <div className='cart-item-qtyprice' style={{ display: 'contents' }}>
                  {/* Qty */}
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0 }}>
                    <button
                      onClick={() => updateQty(item._id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      style={{ width: 34, height: 36, cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)' }}
                    >
                      <Minus size={14} strokeWidth={2.2} />
                    </button>
                    <span style={{ width: 34, textAlign: 'center', fontWeight: 600, color: 'var(--forest)' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item._id, item.quantity + 1)}
                      aria-label="Increase quantity"
                      style={{ width: 34, height: 36, cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--forest)' }}
                    >
                      <Plus size={14} strokeWidth={2.2} />
                    </button>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', minWidth: 100, flexShrink: 0 }}>
                    <div><PriceTag amount={item.price * item.quantity} size="md" /></div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      <PriceTag amount={item.price} size="sm" muted /> each
                    </div>
                  </div>
                </div>

                <button
                  className='cart-item-remove'
                  onClick={() => handleRemove(item)}
                  aria-label={`Remove ${item.name} from cart`}
                  style={{
                    color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none',
                    padding: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className='card cart-summary' style={{ padding: 'var(--space-6)', position: 'sticky', top: 80 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 'var(--space-4)', color: 'var(--forest)' }}>Order Summary</h2>

            {/* Free-shipping progress bar */}
            <div style={{
              height: 6, borderRadius: 'var(--radius-full)', background: 'var(--card-2)',
              overflow: 'hidden', marginBottom: 8,
            }}>
              <div style={{
                height: '100%', width: `${freeShippingProgress}%`,
                background: 'var(--sage)', borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            {shipping > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 'var(--space-4)' }}>
                Add <PriceTag amount={FREE_SHIPPING_THRESHOLD_NAIRA - subtotal} size="sm" muted /> more for free shipping
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--muted)' }}>
                <span>Subtotal</span><PriceTag amount={subtotal} size="sm" muted />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--muted)' }}>
                <span>Shipping</span>
                {shipping === 0
                  ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>Free</span>
                  : <PriceTag amount={shipping} size="sm" muted />}
              </div>
              <hr className='divider' style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 18, color: 'var(--forest)' }}>
                <span>Total</span><PriceTag amount={total} size="lg" strike={false} />
              </div>
            </div>

            <button
              className='btn btn-primary btn-full btn-lg'
              style={{ marginTop: 'var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => isAuthenticated ? navigate('/checkout') : navigate('/login?redirect=/checkout')}
            >
              {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
              <ArrowRight size={18} strokeWidth={2.2} />
            </button>
            <Link to='/products' className='btn btn-ghost btn-full' style={{ marginTop: 8, textAlign: 'center' }}>
              Continue Shopping
            </Link>

            {/* Trust row */}
            <div style={{
              display: 'flex', justifyContent: 'space-around', marginTop: 'var(--space-5)',
              paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-light)',
            }}>
              {[
                { Icon: ShieldCheck, label: 'Secure checkout' },
                { Icon: Truck, label: 'Fast delivery' },
                { Icon: BadgePercent, label: 'Best prices' },
              ].map(({ Icon, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <Icon size={18} strokeWidth={1.8} color="var(--sage)" aria-hidden="true" />
                  <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}