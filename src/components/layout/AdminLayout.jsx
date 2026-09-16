// src/components/admin/AdminLayout.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import '../../pages/admin/Admin.css';
import ThemeToggle from '@/components/ThemeToggle';
import { admin, orders } from '@/api/client';
import {
  LayoutDashboard, ShoppingCart, Users, TrendingUp, Plus, Package,
  Star, Tag, ShieldCheck, Settings as SettingsIcon, LogOut, Menu,
  Search, Bell, AlertTriangle, Wallet, RotateCcw, Leaf,
} from 'lucide-react';

const NAV_BASE = [
  { section: 'Main' },
  { to: '/admin', end: true, Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/orders', Icon: ShoppingCart, label: 'Orders', badgeKey: 'pendingOrders' },
  { to: '/admin/customers', Icon: Users, label: 'Customers' },
  { to: '/admin/reports', Icon: TrendingUp, label: 'Reports' },
  { section: 'Product' },
  { to: '/admin/products/add', Icon: Plus, label: 'Add Product' },
  { to: '/admin/products', Icon: Package, label: 'Product List' },
  { to: '/admin/reviews', Icon: Star, label: 'Reviews', badgeKey: 'pendingReviews' },
  { to: '/admin/categories', Icon: Tag, label: 'Categories' },
  { section: 'Admin' },
  { to: '/admin/users', Icon: ShieldCheck, label: 'AdminUsers' },
  { to: '/admin/settings', Icon: SettingsIcon, label: 'Settings' },
  { to: '/admin/currencies', Icon: Wallet, label: 'Currencies' },
  { to: '/admin/monitoring', Icon: AlertTriangle, label: 'Monitoring' },
];

function timeAgo(date) {
  if (!date) return '';
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) === 1 ? '' : 's'} ago`;
  if (s < 172800) return 'Yesterday';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? res ?? null;
}

function mapApiNotification(n) {
  const type = (n.type || n.kind || '').toLowerCase();
  let Icon = Bell;
  let color = 'var(--admin-accent)';

  if (type.includes('stock') || type.includes('inventory')) {
    Icon = AlertTriangle;
    color = 'var(--error)';
  } else if (type.includes('order') || type.includes('pending')) {
    Icon = ShoppingCart;
    color = 'var(--warning)';
  } else if (type.includes('review')) {
    Icon = Star;
    color = 'var(--admin-accent)';
  } else if (type.includes('payment') || type.includes('paid')) {
    Icon = Wallet;
    color = 'var(--success)';
  } else if (type.includes('refund')) {
    Icon = RotateCcw;
    color = 'var(--error)';
  }

  return {
    id: n._id || n.id,
    text: n.message || n.text || n.title || 'Notification',
    time: timeAgo(n.createdAt || n.time),
    read: Boolean(n.read || n.isRead),
    Icon,
    color,
    link: n.link || n.href || null,
  };
}

/** Build notifications from live stats when /admin/notifications is empty or missing */
function deriveFromStats(stats, pendingOrderCount, pendingReviewCount) {
  const list = [];

  const lowStock = stats?.lowStockItems ?? stats?.inventory?.filter?.((i) => i.alert) ?? [];
  if (Array.isArray(lowStock) && lowStock.length) {
    lowStock.slice(0, 3).forEach((item) => {
      list.push({
        id: `stock-${item._id || item.name}`,
        text: `${item.name} is low on stock (${item.stock ?? 0} units)`,
        time: '',
        read: false,
        Icon: AlertTriangle,
        color: 'var(--error)',
        link: '/admin/products',
      });
    });
  } else if (stats?.outOfStock > 0) {
    list.push({
      id: 'out-of-stock',
      text: `${stats.outOfStock} product(s) out of stock`,
      time: '',
      read: false,
      Icon: AlertTriangle,
      color: 'var(--error)',
      link: '/admin/products',
    });
  }

  if (pendingOrderCount > 0) {
    list.push({
      id: 'pending-orders',
      text: `${pendingOrderCount} order(s) pending fulfillment`,
      time: '',
      read: false,
      Icon: ShoppingCart,
      color: 'var(--warning)',
      link: '/admin/orders?status=pending',
    });
  }

  if (pendingReviewCount > 0) {
    list.push({
      id: 'pending-reviews',
      text: `${pendingReviewCount} new review(s) awaiting approval`,
      time: '',
      read: false,
      Icon: Star,
      color: 'var(--admin-accent)',
      link: '/admin/reviews',
    });
  }

  return list;
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [badges, setBadges] = useState({ pendingOrders: 0, pendingReviews: 0 });
  const [unread, setUnread] = useState(0);

  const navigate = useNavigate();
  const notifRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      let apiNotifs = [];
      let stats = null;
      let pendingOrders = 0;
      let pendingReviews = 0;

      // 1) Dedicated notifications endpoint (if backend has it)
      if (typeof admin.notifications === 'function') {
        try {
          const res = await admin.notifications({ limit: 20 });
          const body = unwrap(res);
          apiNotifs = Array.isArray(body)
            ? body
            : Array.isArray(body?.notifications)
              ? body.notifications
              : Array.isArray(body?.data)
                ? body.data
                : [];
        } catch {
          // endpoint may not exist yet
        }
      }

      // 2) Live counts from stats + orders + reviews
      const tasks = [];

      if (typeof admin.dashboard === 'function') {
        tasks.push(
          admin.dashboard('7d').then((r) => {
            stats = unwrap(r);
            pendingOrders = Number(
              stats?.pendingOrders ?? stats?.pending ?? 0
            );
          }).catch(() => {})
        );
      }

      if (typeof orders.all === 'function') {
        tasks.push(
          orders.all({ status: 'pending', limit: 1 }).then((r) => {
            const body = unwrap(r);
            // prefer explicit total from pagination
            const total =
              body?.total ??
              body?.pagination?.total ??
              (Array.isArray(body?.orders) ? body.orders.length : null);
            if (total != null) pendingOrders = Number(total) || pendingOrders;
          }).catch(() => {})
        );
      }

      if (admin.reviews?.list) {
        tasks.push(
          admin.reviews.list({ status: 'pending', limit: 1 }).then((r) => {
            const body = unwrap(r);
            pendingReviews = Number(
              body?.total ??
              body?.pagination?.total ??
              body?.count ??
              (Array.isArray(body?.reviews) ? body.reviews.length : 0)
            );
          }).catch(() => {})
        );
      }

      await Promise.all(tasks);

      setBadges({ pendingOrders, pendingReviews });

      const mapped = apiNotifs.map(mapApiNotification);
      const list =
        mapped.length > 0
          ? mapped
          : deriveFromStats(stats, pendingOrders, pendingReviews);

      setNotifications(list);
      setUnread(list.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Notifications load failed:', err);
      setNotifications([]);
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, [loadNotifications]);

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
    if (search.trim()) {
      navigate(`/admin/orders?search=${encodeURIComponent(search.trim())}`);
    }
  }

  function handleLogout() {
    localStorage.removeItem('vc_access');
    localStorage.removeItem('vc_refresh');
    navigate('/admin-login');
  }

  async function handleMarkAllRead() {
    try {
      if (typeof admin.markNotificationsRead === 'function') {
        await admin.markNotificationsRead();
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch (err) {
      console.error(err);
    }
  }

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
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <Leaf size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="logo-text">
            Winners<span>Admin</span>
          </div>
        </div>

        <nav>
          {NAV_BASE.map((item, i) => {
            if (item.section) {
              return (
                <div key={`sec-${item.section}`} className="sidebar-section">
                  {item.section}
                </div>
              );
            }
            const badgeVal = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">
                  <item.Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                </span>
                {item.label}
                {badgeVal > 0 && (
                  <span className="nav-badge">
                    {badgeVal > 99 ? '99+' : badgeVal}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div
            className="nav-item"
            onClick={handleLogout}
            style={{ color: 'var(--danger)' }}
            role="button"
          >
            <span className="nav-icon">
              <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            Logout
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 0' }}>
            <div className="avatar" style={{ fontSize: 13 }}>
              {adminName[0]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{adminName}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Admin</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
            type="button"
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          <form onSubmit={handleSearch} className="search-wrap">
            <span className="search-icon">
              <Search size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <input
              type="text"
              placeholder="Search orders, products, customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <div className="header-actions">
            <ThemeToggle />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/admin/products/add')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} strokeWidth={2.2} /> Add Product
            </button>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <div
                className="icon-btn"
                onClick={() => setNotifOpen((o) => !o)}
                role="button"
                aria-label="Notifications"
              >
                <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
                {unread > 0 && <div className="notif-dot" />}
              </div>

              {notifOpen && (
                <div
                  className="notif-panel"
                  style={{ position: 'absolute', top: 44, right: 0, minWidth: 320, zIndex: 50 }}
                >
                  <div className="notif-header">
                    Notifications
                    {unread > 0 && (
                      <span
                        style={{ color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}
                        onClick={handleMarkAllRead}
                        role="button"
                      >
                        Mark all read
                      </span>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="notif-item" style={{ color: 'var(--muted)', fontSize: 13 }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="notif-item"
                        style={{
                          opacity: n.read ? 0.65 : 1,
                          cursor: n.link ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (n.link) {
                            navigate(n.link);
                            setNotifOpen(false);
                          }
                        }}
                      >
                        <n.Icon
                          size={16}
                          strokeWidth={1.8}
                          color={n.color}
                          style={{ flexShrink: 0, marginTop: 2 }}
                          aria-hidden="true"
                        />
                        <div>
                          <div className="notif-text">{n.text}</div>
                          {n.time ? <div className="notif-time">{n.time}</div> : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div
              className="icon-btn"
              onClick={() => navigate('/admin/settings')}
              aria-label="Settings"
              role="button"
            >
              <SettingsIcon size={18} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div
              className="avatar"
              style={{ width: 34, height: 34, fontSize: 13, cursor: 'pointer' }}
            >
              {adminName[0]}
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          <div>
            Winners Admin ·{' '}
            {new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <div className="footer-links">
            <a href="/help">Help Center</a>
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
          </div>
        </footer>
      </div>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }}
        />
      )}
    </div>
  );
}