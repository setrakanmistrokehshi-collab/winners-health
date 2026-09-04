// src/components/admin/AdminLayout.jsx
import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import '../../pages/admin/Admin.css';
import ThemeToggle from '@/components/ThemeToggle';
import {
  LayoutDashboard, ShoppingCart, Users, TrendingUp, Plus, Package,
  Star, Tag, ShieldCheck, Settings as SettingsIcon, LogOut, Menu,
  Search, Bell, AlertTriangle, Wallet, RotateCcw, Leaf,
} from 'lucide-react';

const NAV = [
  { section: 'Main' },
  { to: '/admin',           Icon: LayoutDashboard, label: 'Dashboard',       end: true  },
  { to: '/admin/orders',    Icon: ShoppingCart,    label: 'Orders',          badge: '7' },
  { to: '/admin/customers', Icon: Users,           label: 'Customers'                   },
  { to: '/admin/reports',   Icon: TrendingUp,      label: 'Reports'                     },
  { section: 'Product' },
  { to: '/admin/products/add', Icon: Plus,    label: 'Add Product'               },
  { to: '/admin/products',     Icon: Package, label: 'Product List'              },
  { to: '/admin/reviews',      Icon: Star,    label: 'Reviews',       badge: '3' },
  { to: '/admin/categories',   Icon: Tag,     label: 'Categories'               },
  { section: 'Admin' },
  { to: '/admin/users',     Icon: ShieldCheck,  label: 'AdminUsers'                 },
  { to: '/admin/settings',  Icon: SettingsIcon, label: 'Settings'                   },
];

const NOTIFICATIONS = [
  { color: 'var(--danger)',  Icon: AlertTriangle, text: 'SlimBalance is low on stock (12 units)',   time: '2 min ago'  },
  { color: 'var(--warn)',    Icon: ShoppingCart,  text: '7 orders are pending fulfillment',          time: '18 min ago' },
  { color: 'var(--accent2)', Icon: Star,          text: '3 new reviews awaiting approval',           time: '1 hour ago' },
  { color: 'var(--accent)',  Icon: Wallet,        text: 'Payment ₦85,000 confirmed — #VC-10241',     time: '3 hours ago'},
  { color: 'var(--danger)',  Icon: RotateCcw,     text: 'Refund request for order #VC-10198',        time: 'Yesterday'  },
];

export default function AdminLayout() {
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [search,       setSearch]       = useState('');
  const navigate    = useNavigate();
  const notifRef    = useRef(null);

  // Close notif panel on outside click
  useEffect(() => {
    function handle(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/admin/orders?search=${encodeURIComponent(search)}`);
  }

  function handleLogout() {
    localStorage.removeItem('vc_access');
    navigate('/admin-login');
  }

  // Get admin name from token
  let adminName = 'Admin';
  try {
    const token = localStorage.getItem('vc_access');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      adminName = payload.name ?? 'Admin';
    }
  } catch { /* ignore */ }

  return (
    <div className="admin-shell">

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark"><Leaf size={20} strokeWidth={1.8} aria-hidden="true" /></div>
          <div className="logo-text">Winners<span>Admin</span></div>
        </div>

        <nav>
          {NAV.map((item, i) => {
            if (item.section) {
              return <div key={i} className="sidebar-section">{item.section}</div>;
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon"><item.Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
                {item.label}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <span className="nav-icon"><LogOut size={17} strokeWidth={1.8} aria-hidden="true" /></span> Logout
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 0' }}>
            <div className="avatar" style={{ fontSize: 13 }}>{adminName[0]}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{adminName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="admin-main">

        {/* HEADER */}
        <header className="admin-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
            <Menu size={20} strokeWidth={2} />
          </button>

          <form onSubmit={handleSearch} className="search-wrap">
            <span className="search-icon"><Search size={16} strokeWidth={2} aria-hidden="true" /></span>
            <input
              type="text"
              placeholder="Search orders, products, customers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>

          <div className="header-actions">
            <ThemeToggle />
            <button className="btn btn-primary" onClick={() => navigate('/admin/products/add')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} strokeWidth={2.2} /> Add Product
            </button>

            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <div className="icon-btn" onClick={() => setNotifOpen(o => !o)}>
                <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
                <div className="notif-dot" />
              </div>

              {notifOpen && (
                <div className="notif-panel" style={{ position: 'absolute', top: '44px', right: 0 }}>
                  <div className="notif-header">
                    Notifications
                    <span style={{ color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>
                      Mark all read
                    </span>
                  </div>
                  {NOTIFICATIONS.map((n, i) => (
                    <div key={i} className="notif-item">
                      <n.Icon size={16} strokeWidth={1.8} color={n.color} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <div>
                        <div className="notif-text">{n.text}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="icon-btn" onClick={() => navigate('/admin/settings')} aria-label="Settings" role="button">
              <SettingsIcon size={18} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="avatar" style={{ width: 34, height: 34, fontSize: 13, cursor: 'pointer' }}>
              {adminName[0]}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT — rendered by child routes */}
        <main className="admin-content">
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="admin-footer">
          <div>Winners Admin v2.0.0 · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="footer-links">
            <a href="#">Help Center</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </footer>
      </div>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }}
        />
      )}
    </div>
  );
}
