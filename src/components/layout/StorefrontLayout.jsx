import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/context/authStore';
import useCartStore, { selectCartCount } from '@/context/cartStore';
import ThemeToggle from '@/components/ThemeToggle';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import toast from 'react-hot-toast';
import { ShoppingBag, Package, Heart, User, Settings, Leaf } from 'lucide-react';

export default function StorefrontLayout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const count = useCartStore(selectCartCount);

  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <div className="storefront-layout">
      <style>{`
        .storefront-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Header bar ── */
        .sf-header {
          position: sticky;
          top: 0;
          z-index: 100;
          transition: all 0.3s ease;
        }
        .sf-header.is-scrolled {
          /* Was hardcoded rgba(248, 244, 238, 0.95) — a light-cream value
             baked in regardless of theme. In dark mode that put a
             near-white bar behind white heading/logo text = invisible
             on toggle. Now themed: dark in dark mode, cream in light mode. */
          background: var(--header-scrolled-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-light);
        }
        .sf-header:not(.is-scrolled) {
          background: transparent;
          border-bottom: 1px solid transparent;
        }

        .sf-header-inner {
          display: flex;
          align-items: center;
          height: 68px;
          gap: 16px;
        }

        .sf-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          text-decoration: none;
          color: inherit;
        }
        .sf-logo-text {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
          color: var(--text-heading);
          letter-spacing: -0.02em;
          white-space: nowrap;
        }

        /* Desktop nav */
        .sf-nav {
          display: flex;
          gap: var(--space-6);
          margin-left: auto;
          align-items: center;
        }

        .sf-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          flex-shrink: 0;
        }

        /* When desktop nav is visible, actions shouldn't also take margin-left auto alone */
        .sf-nav + .sf-actions {
          margin-left: 0;
        }

        .sf-cart {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          text-decoration: none;
          transition: background 0.2s;
        }
        .sf-cart:hover {
          background: var(--accent-overlay);
        }
        .sf-cart-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          background: var(--accent);
          color: #ffffff;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          pointer-events: none;
        }

        .sf-auth {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sf-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--accent);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
        }

        .sf-menu-btn {
          display: none;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: right;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-heading);
          padding: 0;
          border-radius: 8px;
        }
        .sf-menu-btn:hover {
          background: var(--accent-overlay);
        }

        /* Mobile panel */
        .sf-mobile-panel {
          display: none;
          flex-direction: column;
          /* Was var(--light-bg), which was never defined anywhere in the
             design system — resolved to nothing, so the panel had no
             background and inherited whatever sat behind it. Using the
             surface token means it's always a real, theme-correct
             background regardless of what's underneath. */
          background: var(--surface);
          border-top: 1px solid var(--border-light);
          border-bottom: 1px solid var(--border-light);
          padding: 12px 16px 20px;
          gap: 2px;
          animation: fadeIn 0.2s ease;
        }
        .sf-mobile-link {
          padding: 14px 10px;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-heading);
          border-radius: var(--radius);
          text-decoration: none;
        }
        .sf-mobile-link:hover {
          background: var(--bg-elevated);
        }
        .sf-mobile-auth {
          border-top: 1px solid var(--border-light);
          margin-top: 8px;
          padding-top: 14px;
        }

        /* Footer */
        .sf-footer {
          background: var(--deep-bg);
          color: var(--on-dark);
          padding: var(--space-16) 0 var(--space-8);
          margin-top: var(--space-20);
        }
        .sf-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: var(--space-10);
          margin-bottom: var(--space-12);
        }
        .sf-footer-brand-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .sf-footer-brand-title span:last-child {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 20px;
        }
        .sf-footer-desc {
          color: var(--sage-light);
          font-size: 14px;
          line-height: 1.7;
          max-width: 280px;
        }
        .sf-footer h4 {
          font-family: var(--font-display);
          margin-bottom: 16px;
          font-size: 16px;
          color: var(--on-dark);
        }
        .sf-footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sf-footer-links a {
          color: var(--sage-light);
          font-size: 14px;
          transition: color 0.2s;
          text-decoration: none;
        }
        .sf-footer-links a:hover {
          color: var(--on-dark);
        }
        .sf-footer-bottom {
          border-top: 1px solid var(--accent-overlay-strong);
          padding-top: var(--space-6);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: var(--sage-light);
          gap: 12px;
        }

        /* NavLink active */
        .sf-nav-link {
          font-size: 14px;
          font-weight: 500;
          color: var(--muted);
          border-bottom: 2px solid transparent;
          padding-bottom: 2px;
          transition: all 0.2s;
          text-decoration: none;
        }
        .sf-nav-link.active {
          color: var(--forest);
          border-bottom-color: var(--sage);
        }

        /* ════════════ MOBILE ≤768px ════════════ */
        @media (max-width: 768px) {
          .sf-header-inner {
            height: 60px;
            gap: 10px;
          }

          .sf-logo-text {
            font-size: 17px;
          }

          .sf-nav,
          .sf-auth {
            display: none !important;
          }

          .sf-menu-btn {
            display: flex !important;
          }

          .sf-mobile-panel.is-open {
            display: flex !important;
          }

          .sf-actions {
            margin-left: auto;
            gap: 4px;
          }

          /* Footer */
          .sf-footer {
            padding: var(--space-12) 0 var(--space-6);
            margin-top: var(--space-12);
          }
          .sf-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-8) var(--space-5);
            margin-bottom: var(--space-8);
          }
          .sf-footer-grid > div:first-child {
            grid-column: 1 / -1;
          }
          .sf-footer-desc {
            max-width: 100%;
          }
          .sf-footer-bottom {
            flex-direction: column;
            text-align: center;
            align-items: center;
            gap: 8px;
          }
        }

        @media (max-width: 400px) {
          .sf-logo-text {
            font-size: 15px;
          }
          .sf-footer-grid {
            grid-template-columns: 1fr;
            gap: var(--space-6);
          }
          .sf-footer-grid > div:first-child {
            grid-column: auto;
          }
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className={`sf-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container sf-header-inner">
          {/* Logo */}
          <Link to="/" className="sf-logo">
            <Leaf size={22} strokeWidth={1.8} color="var(--forest)" aria-hidden="true" />
            <span className="sf-logo-text">Winners Health</span>
          </Link>

          {/* Desktop nav */}
          <nav className="sf-nav">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/products">Shop</NavLink>
            {isAuthenticated && <NavLink to="/orders">Orders</NavLink>}
            {isAuthenticated && <NavLink to="/wishlist">Wishlist</NavLink>}
            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}
              >
                Admin ↗
              </Link>
            )}
          </nav>

          {/* Actions: cart always visible; auth desktop-only; menu mobile-only */}
          <div className="sf-actions">
            <CurrencySwitcher />
            <ThemeToggle />
            <Link to="/cart" className="sf-cart" aria-label="Cart">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--forest)"
                strokeWidth="1.8"
                style={{ pointerEvents: 'none' }}
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {count > 0 && (
                <span className="sf-cart-badge">{count > 9 ? '9+' : count}</span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="sf-auth">
                <Link to="/profile">
                  <div className="sf-avatar">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </Link>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            ) : (
              <div className="sf-auth">
                <Link to="/login" className="btn btn-outline btn-sm">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </div>
            )}

            <button
              className="sf-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`sf-mobile-panel ${menuOpen ? 'is-open' : ''}`}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { to: '/products', label: 'Shop', Icon: ShoppingBag },
              ...(isAuthenticated
                ? [
                    { to: '/orders', label: 'My Orders', Icon: Package },
                    { to: '/wishlist', label: 'Wishlist', Icon: Heart },
                    { to: '/profile', label: 'My Profile', Icon: User },
                  ]
                : []),
              ...(user?.role === 'admin'
                ? [{ to: '/admin/dashboard', label: 'Admin Dashboard', Icon: Settings }]
                : []),
            ].map((item) => (
              <Link key={item.to} to={item.to} className="sf-mobile-link" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <item.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                {item.label}
              </Link>
            ))}

            <div className="sf-mobile-auth">
              {isAuthenticated ? (
                <button className="btn btn-outline btn-full" onClick={handleLogout}>
                  Sign out
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link
                    to="/login"
                    className="btn btn-outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="sf-footer">
        <div className="container">
          <div className="sf-footer-grid">
            <div>
              <div className="sf-footer-brand-title">
                <Leaf size={22} strokeWidth={1.8} aria-hidden="true" />
                <span>Winners Health</span>
              </div>
              <p className="sf-footer-desc">
                Premium health supplements crafted for modern Nigerian wellness.
                Quality you can trust, results you can feel.
              </p>
            </div>

            <div>
              <h4>Shop</h4>
              <FooterLinks
                links={[
                  { to: '/products?category=immunity', label: 'Immunity' },
                  { to: '/products?category=energy', label: 'Energy' },
                  { to: '/products?category=vitamins', label: 'Vitamins' },
                  { to: '/products?category=beauty', label: 'Beauty' },
                ]}
              />
            </div>

            <div>
              <h4>Account</h4>
              <FooterLinks
                links={[
                  { to: '/profile', label: 'My Profile' },
                  { to: '/orders', label: 'Orders' },
                  { to: '/wishlist', label: 'Wishlist' },
                  { to: '/register', label: 'Create Account' },
                ]}
              />
            </div>

            <div>
              <h4>Support</h4>
              <FooterLinks
                links={[
                  { to: '#', label: 'FAQ' },
                  { to: '#', label: 'Shipping Policy' },
                  { to: '#', label: 'Returns' },
                  { to: '#', label: 'Contact Us' },
                  { to: '/privacy-policy', label: 'Privacy Policy' },
                ]}
              />
            </div>
          </div>

          <div className="sf-footer-bottom">
            <span>© {new Date().getFullYear()} Winners Health. All rights reserved.</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, children }) {
  const location = useLocation();
  const active = location.pathname.startsWith(to);
  return (
    <Link to={to} className={`sf-nav-link ${active ? 'active' : ''}`}>
      {children}
    </Link>
  );
}

function FooterLinks({ links }) {
  return (
    <ul className="sf-footer-links">
      {links.map((l) => (
        <li key={`${l.to}-${l.label}`}>
          <Link to={l.to}>{l.label}</Link>
        </li>
      ))}
    </ul>
  );
}