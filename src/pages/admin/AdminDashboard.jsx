import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { admin, orders as ordersApi } from '../../api/client';
import {
  Wallet, ShoppingCart, Users, PackageX, Inbox, XCircle, TrendingUp,
  Download, ChevronUp, ChevronDown, Pill,
} from 'lucide-react';

const PERIOD_MAP = {
  Today: 'today',
  '7 Days': '7d',
  '30 Days': '30d',
  '90 Days': '90d',
};

const COLORS = ['#00c896', '#7c5cfc', '#f59e0b', '#ff4d6d', '#7a9e7e', '#c8854a'];

const nairaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--admin-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: p.color, display: 'inline-block',
          }} />
          {p.name}: ₦{Number(p.value || 0).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

function formatNaira(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(1)}K`;
  return `₦${v.toLocaleString()}`;
}

function formatCount(n) {
  const v = Number(n) || 0;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// api/client.js's response shape is inconsistent across endpoints —
// some handlers return the raw axios response, some pre-unwrap with
// .then(r => r.data). This cascade handles both without guessing
// which one a given call returns.
function unwrapEnvelope(res, fallback) {
  return res?.data?.data ?? res?.data ?? res ?? fallback;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7 Days');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodParam = PERIOD_MAP[period] || '7d';

      const [statsRes, ordersRes] = await Promise.all([
        admin.dashboard(periodParam),
        ordersApi.all({ limit: 10, sort: '-createdAt' }),
      ]);

      const rawStats = unwrapEnvelope(statsRes, {});
      const rawOrders = unwrapEnvelope(ordersRes, {})?.orders
        ?? unwrapEnvelope(ordersRes, []);

      setStats(rawStats);
      setOrders(Array.isArray(rawOrders) ? rawOrders : []);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard');
      setStats(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  // Normalized KPI fields — support multiple backend response shapes
  // without silently defaulting live numbers to zero
  const revenue = stats?.revenue ?? stats?.totalRevenue ?? 0;
  const revenueDelta = stats?.revenueDelta ?? stats?.revenue?.delta ?? null;
  const revenueUp = stats?.revenueUp ?? stats?.revenue?.up ?? true;

  const ordersCount = stats?.orders ?? stats?.totalOrders ?? 0;
  const ordersDelta = stats?.ordersDelta ?? stats?.orders?.delta ?? null;
  const ordersUp = stats?.ordersUp ?? stats?.orders?.up ?? true;

  const customers = stats?.customers ?? stats?.activeCustomers ?? stats?.totalCustomers ?? 0;
  const customersDelta = stats?.customersDelta ?? stats?.customers?.delta ?? null;
  const customersUp = stats?.customersUp ?? stats?.customers?.up ?? true;

  const outOfStock = stats?.outOfStock ?? stats?.outOfStockCount ?? 0;
  const pendingOrders = stats?.pendingOrders ?? stats?.pending ?? 0;
  const cancelled = stats?.cancelled ?? stats?.cancelledOrders ?? 0;
  const netProfit = stats?.netProfit ?? 0;
  const margin = stats?.margin ?? stats?.profitMargin ?? null;

  const salesData = stats?.salesChart ?? stats?.sales ?? stats?.dailySales ?? [];
  const catData = stats?.categoryBreakdown ?? stats?.categories ?? [];
  const topProds = stats?.topProducts ?? [];
  const inventory = stats?.inventory ?? stats?.lowStock ?? [];

  const pieData = catData.map((entry, i) => ({
    ...entry,
    fill: entry.color || COLORS[i % COLORS.length],
  }));

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) {
    return (
      <div style={{ color: 'var(--admin-muted)', padding: 40, textAlign: 'center' }}>
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'var(--error)', padding: 40, textAlign: 'center' }}>
        {error}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={load} type="button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Sales Overview</h1>
          <p>{today} — Welcome back, Admin</p>
        </div>
        <div className="date-filter">
          {Object.keys(PERIOD_MAP).map((p) => (
            <button
              key={p}
              className={`filter-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
              type="button"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          Icon={Wallet}
          label="Total Revenue"
          bg="rgba(0,200,150,.12)"
          value={typeof revenue === 'object' ? revenue.value : formatNaira(revenue)}
          delta={typeof revenue === 'object' ? revenue.delta : revenueDelta}
          up={typeof revenue === 'object' ? revenue.up : revenueUp}
          sub="vs previous period"
        />
        <KpiCard
          Icon={ShoppingCart}
          label="Total Orders"
          bg="rgba(124,92,252,.12)"
          value={typeof ordersCount === 'object' ? ordersCount.value : formatCount(ordersCount)}
          delta={typeof ordersCount === 'object' ? ordersCount.delta : ordersDelta}
          up={typeof ordersCount === 'object' ? ordersCount.up : ordersUp}
          sub="vs previous period"
        />
        <KpiCard
          Icon={Users}
          label="Active Customers"
          bg="rgba(245,158,11,.12)"
          value={typeof customers === 'object' ? customers.value : formatCount(customers)}
          delta={typeof customers === 'object' ? customers.delta : customersDelta}
          up={typeof customers === 'object' ? customers.up : customersUp}
          sub="vs previous period"
        />
        <KpiCard
          Icon={PackageX}
          label="Out of Stock"
          bg="rgba(255,77,109,.12)"
          value={typeof outOfStock === 'object' ? outOfStock.value : String(outOfStock)}
          delta={typeof outOfStock === 'object' ? outOfStock.delta : null}
          up={false}
          sub="need restock"
        />
      </div>

      <div className="charts-row">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue Performance</div>
              <div className="card-sub">Daily sales — selected period</div>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, alignItems: 'center' }}>
              <LegendDot color="#00c896" label="This period" />
              <LegendDot color="#7b829a" label="Previous" dashed />
            </div>
          </div>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="thisWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c896" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00c896" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lastWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7b829a" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#7b829a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--admin-border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--admin-muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--admin-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={nairaTooltip} />
                <Area
                  type="monotone"
                  dataKey="thisWeek"
                  name="This period"
                  stroke="#00c896"
                  strokeWidth={2}
                  fill="url(#thisWeek)"
                  dot={{ fill: '#00c896', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="lastWeek"
                  name="Previous"
                  stroke="#7b829a"
                  strokeWidth={1.5}
                  fill="url(#lastWeek)"
                  strokeDasharray="4 4"
                  dot={{ fill: '#7b829a', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty>No sales chart data for this period</Empty>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue by Category</div>
              <div className="card-sub">Selected period breakdown</div>
            </div>
          </div>
          {catData.length > 0 ? (
            <>
            <ResponsiveContainer width="100%" height={160}>
        <PieChart>
    <Pie
      data={pieData}
      cx="50%"
      cy="50%"
      innerRadius={45}
      outerRadius={72}
      dataKey="value"
      nameKey="name"
      paddingAngle={3}
      stroke="transparent"
    />
    <Tooltip formatter={(v, n) => [`${v}%`, n]} />
  </PieChart>
</ResponsiveContainer>
              
              <div style={{ marginTop: 8 }}>
                {catData.map((c, i) => (
                  <div
                    key={c.name || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 0',
                      borderBottom: i < catData.length - 1 ? '1px solid var(--admin-border)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: 3,
                      background: c.color || COLORS[i % COLORS.length], flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--admin-text)' }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--admin-muted)' }}>
                      {c.value}%
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty>No category data</Empty>
          )}
        </div>
      </div>

      <div className="stats-strip">
        <StatStrip Icon={Inbox} label="Pending Orders" value={pendingOrders} color="var(--warning)" sub="Awaiting fulfillment" />
        <StatStrip Icon={XCircle} label="Cancelled" value={cancelled} color="var(--error)" sub="This period" />
        <StatStrip
          Icon={TrendingUp}
          label="Net Profit"
          value={formatNaira(netProfit)}
          color="var(--admin-accent)"
          sub={margin != null ? `Margin: ${margin}` : '—'}
        />
      </div>

      <div className="bottom-row">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Orders</div>
              <div className="card-sub">Latest transactions</div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              type="button"
            >
              <Download size={13} strokeWidth={2.2} /> Export
            </button>
          </div>
          <div className="table-wrap">
            {orders.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o) => (
                    <tr
                      key={o._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/orders/${o._id}`)}
                    >
                      <td>
                        <span className="order-id">#{o._id?.slice(-6) ?? o._id}</span>
                      </td>
                      <td>{o.user?.name ?? o.customerName ?? '—'}</td>
                      <td style={{ color: 'var(--admin-muted)' }}>
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td>
                        <span className={`status-badge s-${o.status}`}>{cap(o.status)}</span>
                      </td>
                      <td
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: o.status === 'cancelled' ? 'var(--admin-muted)' : 'var(--admin-accent)',
                        }}
                      >
                       
                        ₦{(Number(o.total ?? o.totalPrice ?? 0) / 100).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty>No orders yet</Empty>
            )}
          </div>
          <div
            className="view-all"
            onClick={() => navigate('/admin/orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
              borderTop: '1px solid var(--admin-border)',
              color: 'var(--admin-accent)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              margin: '12px -20px -20px',
            }}
          >
            View All Orders →
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Top Products</div>
                <div className="card-sub">By revenue this period</div>
              </div>
            </div>
            {topProds.length > 0 ? (
              topProds.map((p, i) => (
                <div
                  key={p._id || p.name || i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: i < topProds.length - 1 ? '1px solid var(--admin-border)' : 'none',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                    color: 'var(--admin-muted)', width: 20, textAlign: 'center',
                  }}>
                    #{i + 1}
                  </div>
                  <div style={{
                    width: 36, height: 36, background: 'var(--admin-surface)',
                    borderRadius: 8, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Pill size={17} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--admin-text)',
                    }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                      {p.category ?? '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--admin-accent)' }}>
                      {p.revenue != null
                        ? (typeof p.revenue === 'string' ? p.revenue : formatNaira(p.revenue))
                        : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                      {p.units ?? p.totalSold ?? 0} sold
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <Empty>No product sales yet</Empty>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Inventory Status</div>
                <div className="card-sub">Stock levels</div>
              </div>
              <span style={{
                fontSize: 11,
                background: 'rgba(255,77,109,.12)',
                color: 'var(--error)',
                padding: '3px 8px',
                borderRadius: 20,
                fontWeight: 600,
              }}>
                {inventory.filter((i) => i.alert || i.stock < (i.max || 0) * 0.25).length} Low
              </span>
            </div>
            {inventory.length > 0 ? (
              inventory.map((item, i) => {
                const max = item.max || item.capacity || 100;
                const stock = item.stock ?? 0;
                const pct = Math.min(100, Math.round((stock / max) * 100));
                const alert = item.alert ?? pct < 25;
                const color = alert ? (pct < 20 ? 'var(--error)' : 'var(--warning)') : 'var(--admin-accent)';
                return (
                  <div
                    key={item._id || item.name || i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 0',
                      borderBottom: i < inventory.length - 1 ? '1px solid var(--admin-border)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--admin-text)' }}>
                      {item.name}
                    </div>
                    <div style={{ width: 80 }}>
                      <div style={{
                        height: 5, background: 'var(--admin-surface)',
                        borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                      width: 40, textAlign: 'right', color,
                    }}>
                      {stock}
                    </div>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                      background: alert ? 'rgba(255,77,109,.12)' : 'rgba(0,200,150,.12)',
                      color: alert ? 'var(--error)' : 'var(--admin-accent)',
                    }}>
                      {alert ? 'Low' : 'OK'}
                    </span>
                  </div>
                );
              })
            ) : (
              <Empty>No inventory data</Empty>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Empty({ children }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: 32, fontSize: 13 }}>
      {children}
    </div>
  );
}

function KpiCard({ Icon, label, bg, value, delta, up, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">
        <div className="kpi-icon" style={{ background: bg }}>
          {Icon && <Icon size={16} strokeWidth={1.8} aria-hidden="true" />}
        </div>
        {label}
      </div>
      <div className="kpi-value">{value ?? '—'}</div>
      {delta != null && (
        <div className={`kpi-delta ${up ? 'up' : 'down'}`}>
          {up
            ? <ChevronUp size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} />
            : <ChevronDown size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} />}
          {' '}{delta}{' '}
          <span className="kpi-sub">{sub}</span>
        </div>
      )}
    </div>
  );
}

function StatStrip({ Icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, flexShrink: 0 }}>
        {Icon && <Icon size={28} strokeWidth={1.6} color={color} aria-hidden="true" />}
      </div>
      <div>
        <div style={{
          fontSize: 11, color: 'var(--admin-muted)', textTransform: 'uppercase',
          letterSpacing: '.6px', marginBottom: 4,
        }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color }}>
          {value ?? '—'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>{sub}</div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, dashed }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 10, height: 3,
        background: dashed ? 'none' : color,
        borderTop: dashed ? `2px dashed ${color}` : 'none',
        display: 'inline-block', borderRadius: 2,
      }} />
      <span style={{ color: dashed ? 'var(--admin-muted)' : color }}>{label}</span>
    </span>
  );
}