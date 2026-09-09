import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { products as productsApi } from '@/api/client';
import { ProductCard, PageLoader } from '@/components/ui';
import { 
  ShieldPlus, 
  Flame, 
  Pill, 
  Scale, 
  Flower2, 
  HeartPulse 
} from 'lucide-react';

const CATEGORIES = [
  { id: 'immunity', Icon: ShieldPlus,  label: 'Immunity', desc: 'Defend & protect' },
  { id: 'energy',   Icon: Flame,       label: 'Energy',   desc: 'Power your day' },
  { id: 'vitamins', Icon: Pill,        label: 'Vitamins', desc: 'Essential nutrients' },
  { id: 'weight',   Icon: Scale,       label: 'Weight',   desc: 'Body composition' },
  { id: 'beauty',   Icon: Flower2,     label: 'Beauty',   desc: 'Glow from within' },
  { id: 'general',  Icon: HeartPulse,  label: 'General',  desc: 'Daily wellness' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi.list({ featured: true, limit: 6 })
      .then(({ data }) => setFeatured(data.products || []))
      .catch((err) => {console.error('Failed to load featured products:', err); setFeatured([]); })
      .finally(() => setLoading(false));
  }, []);


  return (
    <div>
     <section className='hero-section' style={{
  background: `
    linear-gradient(135deg, rgba(6, 10, 22, 0.88) 0%, rgba(8, 14, 30, 0.55) 50%, rgba(4, 7, 16, 0.75) 100%),
    url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&q=80')
  `,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  minHeight: '88vh',
  display: 'flex', 
  alignItems: 'center',
  position: 'relative', 
  overflow: 'hidden',
}}>
        {/* Decorative orbs */}
        <div className='hero-orb-1' style={{
          position: 'absolute', top: '15%', right: '8%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(66, 133, 244, 0.28) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div className='hero-orb-2' style={{
          position: 'absolute', bottom: '10%', left: '5%',
          width: 250, height: 250, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122,158,246,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className='container' style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 680 }}>
            <div className='animate-fade-up' style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(66,133,244,0.18)', border: '1px solid rgba(66,133,244,0.4)',
              borderRadius: 'var(--radius-full)', padding: '6px 16px',
              marginBottom: 'var(--space-6)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sage-light)', display: 'block' }} />
              <span style={{ color: 'var(--sage-light)', fontSize: 13, fontWeight: 500, letterSpacing: '0.04em' }}>
                Premium Nigerian Wellness
              </span>
            </div>

            <h1 className='animate-fade-up' style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(40px, 7vw, 80px)',
              fontWeight: 700, color: 'var(--on-dark)', lineHeight: 1.1,
              letterSpacing: '-0.02em', marginBottom: 'var(--space-6)',
              animationDelay: '80ms',
            }}>
              Nourish Your Body.<br />
              <em style={{ color: 'var(--amber-light)', fontStyle: 'italic' }}>Elevate</em> Your Life.
            </h1>

            <p className='animate-fade-up' style={{
              fontSize: 18, color: 'rgba(248,244,238,0.75)',
              lineHeight: 1.7, maxWidth: 520, marginBottom: 'var(--space-8)',
              animationDelay: '160ms',
            }}>
              Science-backed supplements formulated for healthy lifestyles.
              Premium quality, transparent ingredients, measurable results.
            </p>

            <div className='hero-cta animate-fade-up' style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', animationDelay: '240ms' }}>
              <Link to='/products' className='btn btn-amber btn-lg'>
                Shop Now
              </Link>
              <Link to='/products?featured=true' className='btn btn-lg' style={{
                background: 'rgba(255,255,255,0.1)', color: 'var(--on-dark)',
                borderColor: 'rgba(255,255,255,0.3)',
              }}>
                Bestselling →
              </Link>
            </div>

            {/* Trust signals */}
            <div className='hero-trust animate-fade-up' style={{
              display: 'flex', gap: 'var(--space-8)', marginTop: 'var(--space-12)',
              animationDelay: '320ms',
            }}>
              {[
                { n: '5,000+', l: 'Happy Customers' },
                { n: '100%', l: 'Natural Ingredients' },
                { n: '24hr', l: 'Delivery in Lagos, Owerri, Port Harcourt' },
              ].map((t) => (
                <div key={t.n}>
                  <div className='hero-stat-num' style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-dark)', fontFamily: 'var(--font-display)' }}>{t.n}</div>
                  <div style={{ fontSize: 12, color: 'rgba(248,244,238,0.6)', marginTop: 2 }}>{t.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className='section-pad' style={{ padding: 'var(--space-20) 0' }}>
        <div className='container'>
          <div className='section-header' style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 42px)', color: 'var(--forest-deep)', marginBottom: 12 }}>
              Shop by Category
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 16 }}>Find exactly what your body needs</p>
          </div>
          <div className='category-grid stagger' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className='card category-card animate-fade-up'
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: 'var(--space-6) var(--space-4)', gap: 'var(--space-3)',
                  textAlign: 'center', textDecoration: 'none', color: 'inherit',
                  transition: 'all 0.25s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--sage-light)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div className='category-icon' style={{
                  width: 60, height: 60, borderRadius: 'var(--radius-lg)',
                  background: 'var(--cream)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <cat.Icon size={26} strokeWidth={1.8} color="var(--forest)" aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--forest-deep)', fontSize: 15 }}>{cat.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{cat.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured products ─────────────────────────────────────── */}
      <section className='section-pad-tight' style={{ padding: 'var(--space-4) 0 var(--space-20)', background: 'var(--parchment)' }}>
        <div className='container'>
          <div className='featured-header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-10)' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 3.5vw, 38px)', color: 'var(--forest-deep)', marginBottom: 8 }}>
                Featured Products
              </h2>
              <p style={{ color: 'var(--muted)' }}>Curated picks our customers love most</p>
            </div>
            <Link to='/products' className='btn btn-outline'>View All →</Link>
          </div>

          {loading ? (
            <PageLoader />
          ) : (
            <div className='product-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
              {featured.map((p, i) => <ProductCard key={p._id} product={p} delay={i * 80} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Newsletter ────────────────────────────────────────────── */}
      <section className='section-pad' style={{ padding: 'var(--space-20) 0', background: 'var(--parchment)' }}>
        <div className='container' style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--on-dark)', marginBottom: 12 }}>
            Join 5,000+ Wellness Subscribers
          </h2>
          <p style={{ color: 'var(--sage-light)', marginBottom: 'var(--space-6)', lineHeight: 1.7 }}>
            Get exclusive deals, new product launches, and wellness tips delivered weekly.
          </p>
          <div className='newsletter-form' style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: 440, margin: '0 auto' }}>
            <input
              type='email'
              placeholder='your@email.com'
              className='input'
              style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: 'var(--on-dark)' }}
            />
            <button className='btn btn-amber'>Subscribe</button>
          </div>
        </div>
      </section>
    </div>
  );
}
