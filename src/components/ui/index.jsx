import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useCartStore from '@/context/cartStore';
import { users as usersApi } from '@/api/client';
import useAuthStore from '@/context/authStore';
import toast from 'react-hot-toast';
import {
  Box, Heart, Check, ChevronLeft, ChevronRight, X,
  TrendingUp, TrendingDown, Leaf, ShoppingCart,
} from 'lucide-react';
import { trackAddToCart, generateEventId } from '@/lib/metaPixel';
import PriceTag from '@/components/PriceTag';

// ── ProductCard ───────────────────────────────────────────────────
export function ProductCard({ product, delay = 0 }) {
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { toast.error('Login to save wishlist'); return; }
    try {
      await usersApi.toggleWishlist(product._id);
      setWishlisted((w) => !w);
      toast.success(wishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (_) {
      toast.error('Failed to update wishlist');
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding) return; // guard against rapid repeat clicks re-firing the toast/store update
    setAdding(true);
    addItem(product);
    trackAddToCart(product, 1, generateEventId());
    toast.success(`${product.name} added to cart`, {
      icon: <Check size={18} strokeWidth={2.5} color="var(--success)" />,
    });
    setTimeout(() => setAdding(false), 600);
  };

  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <Link
      to={`/products/${product.slug || product._id}`}
      className='animate-fade-up'
      style={{
        animationDelay: `${delay}ms`,
        display: 'flex', flexDirection: 'column',
        background: 'var(--white)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.25s ease',
        textDecoration: 'none', color: 'inherit',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Image / Icon area */}
      <div className='product-card-image' style={{
        height: 200, background: 'var(--parchment)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box size={56} strokeWidth={1.5} color="var(--sage)" aria-hidden="true" />
        )}

        {/* Badges */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 4 }}>
          {product.badge && (
            <span className='badge badge-forest' style={{ fontSize: 10 }}>{product.badge}</span>
          )}
          {discount > 0 && (
            <span className='badge badge-amber' style={{ fontSize: 10 }}>-{discount}%</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.99)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Heart
            size={16}
            strokeWidth={2}
            color={wishlisted ? 'var(--rust)' : 'var(--muted)'}
            fill={wishlisted ? 'var(--rust)' : 'none'}
          />
        </button>
      </div>

      {/* Content */}
      <div className='product-card-body' style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className='product-card-cat' style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {product.category}
        </div>
        <h3 className='product-card-title' style={{
          fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
          color: 'var(--forest)', lineHeight: 1.3,
        }}>
          {product.name}
        </h3>

        {/* Rating */}
        {product.numReviews > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--amber)', fontSize: 13 }}>{'★'.repeat(Math.round(product.rating))}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>({product.numReviews})</span>
          </div>
        )}

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 'auto' }}>
          <PriceTag amount={product.price} size="md" />
        </div>

        {/* Stock */}
        {product.stock <= 10 && product.stock > 0 && (
          <div style={{ fontSize: 12, color: 'var(--rust)', fontWeight: 500 }}>
            Only {product.stock} left
          </div>
        )}
        {product.stock === 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Out of stock</div>
        )}

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0 || adding}
          className='btn btn-primary btn-sm'
          style={{ marginTop: 4, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {adding ? <Check size={14} strokeWidth={2.5} /> : <ShoppingCart size={14} strokeWidth={2} />}
          {adding ? 'Added' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 24, color = 'var(--sage)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}`,
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ── PageLoader ────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 400,
    }}>
      <Spinner size={36} />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────
// `icon` accepts a lucide component (not a string/emoji) so every
// call site renders a real icon; defaults to Leaf to match the brand.
export function EmptyState({ icon: Icon = Leaf, title, message, action }) {
  return (
    <div style={{
      textAlign: 'center', padding: 'var(--space-16) var(--space-6)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)',
    }}>
      <Icon size={48} strokeWidth={1.5} color="var(--sage)" aria-hidden="true" />
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--forest-deep)' }}>{title}</h3>
      {message && <p style={{ color: 'var(--muted)', maxWidth: 360, lineHeight: 1.6 }}>{message}</p>}
      {action}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────
export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 'var(--space-8)' }}>
      <button
        className='btn btn-outline btn-sm'
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ChevronLeft size={16} strokeWidth={2} /> Prev
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          style={{
            width: 36, height: 36, borderRadius: 'var(--radius)',
            background: p === page ? 'var(--sage-dark)' : 'transparent',
            color: p === page ? '#ffffff' : 'var(--charcoal)',
            border: '1.5px solid',
            borderColor: p === page ? 'var(--sage-dark)' : 'var(--border)',
            cursor: 'pointer', fontWeight: p === page ? 600 : 400, fontSize: 14,
          }}
        >
          {p}
        </button>
      ))}
      <button
        className='btn btn-outline btn-sm'
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        Next <ChevronRight size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 520 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='card'
        style={{
          width: '100%', maxWidth,
          animation: 'fadeUp 0.25s ease',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ fontSize: 20, color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
        </div>
        <div style={{ padding: 'var(--space-6)' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Admin StatCard ────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon, trend, color = 'var(--admin-accent)' }) {
  const positive = trend > 0;
  return (
    <div className='admin-card' style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 4, background: color, borderRadius: '0 var(--radius-md) var(--radius-md) 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--admin-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--admin-text)', lineHeight: 1, marginBottom: 6 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 13, color: 'var(--admin-muted)' }}>{sub}</div>}
          {trend !== undefined && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, fontSize: 12, fontWeight: 600,
              color: positive ? '#4ade80' : '#f87171',
            }}>
              {positive ? '↑' : '↓'} {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius)',
            background: `${color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Status Badge ────────────────────────────────────────────
export function OrderStatusBadge({ status }) {
  const map = {
    pending:    { cls: 'badge-amber', label: 'Pending' },
    paid:       { cls: 'badge-green', label: 'Paid' },
    processing: { cls: 'badge-green', label: 'Processing' },
    shipped:    { cls: 'badge-forest', label: 'Shipped' },
    delivered:  { cls: 'badge-green', label: 'Delivered' },
    cancelled:  { cls: 'badge-red', label: 'Cancelled' },
    refunded:   { cls: 'badge-gray', label: 'Refunded' },
  };
  const { cls, label } = map[status] || { cls: 'badge-gray', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ── Input with label wrapper ──────────────────────────────────────
export function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label className='label'>{label}</label>}
      {children}
      {error && <span className='field-error'>{error}</span>}
    </div>
  );
}
