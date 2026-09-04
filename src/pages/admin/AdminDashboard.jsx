// src/pages/admin/AdminDashboard.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useFetch from '../../hooks/useFetch';
import { admin, orders as ordersApi } from '../../api/client';
import {
  Wallet, ShoppingCart, Users, PackageX, Inbox, XCircle, TrendingUp,
  Download, ChevronUp, ChevronDown, Droplet, Sparkles, Shield, Zap, Pill,
} from 'lucide-react';

// ── Fallback data shown while API loads or if endpoint not yet built ──
const FALLBACK_STATS = {
  revenue:       { value: '₦2.4M', delta: '+14.2%', up: true  },
  orders:        { value: '10.7K', delta: '+12.8%', up: true  },
  customers:     { value: '3.2K',  delta: '+8.1%',  up: true  },
  outOfStock:    { value: '3',     delta: '2 items', up: false },
  pendingOrders: 509,
  cancelled:     94,
  netProfit:     '₦1.1M',
  margin:        '46.2%',
};

const FALLBACK_SALES = [
  { day: 'Mon', thisWeek: 285000, lastWeek: 240000 },
  { day: 'Tue', thisWeek: 320000, lastWeek: 290000 },
  { day: 'Wed', thisWeek: 410000, lastWeek: 350000 },
  { day: 'Thu', thisWeek: 380000, lastWeek: 330000 },
  { day: 'Fri', thisWeek: 450000, lastWeek: 390000 },
  { day: 'Sat', thisWeek: 520000, lastWeek: 460000 },
  { day: 'Sun', thisWeek: 395000, lastWeek: 340000 },
];

const FALLBACK_CATEGORIES = [
  { name: 'Immunity', value: 34, color: '#00c896' },
  { name: 'Vitamins',  value: 28, color: '#7c5cfc' },
  { name: 'Beauty',    value: 22, color: '#f59e0b' },
  { name: 'Energy',    value: 16, color: '#ff4d6d' },
];

const FALLBACK_ORDERS = [
  { _id: 'VC-10241', user: { name: 'Chidi Okonkwo' }, items: [{ product: { name: 'Greens Plus' } }], createdAt: '2026-06-10', status: 'delivered', totalPrice: 15000 },
  { _id: 'VC-10240', user: { name: 'Amaka Eze' },    items: [{ product: { name: 'Marine Collagen' } }], createdAt: '2026-06-10', status: 'pending',   totalPrice: 18000 },
  { _id: 'VC-10239', user: { name: 'Emeka Nwosu' },  items: [{ product: { name: 'Immunity Shield' } }], createdAt: '2026-06-09', status: 'shipped',   totalPrice: 11000 },
  { _id: 'VC-10238', user: { name: 'Fatima Bello' }, items: [{ product: { name: 'Omega-3 Fish Oil' } }], createdAt: '2026-06-09', status: 'delivered', totalPrice: 8500  },
  { _id: 'VC-10237', user: { name: 'Tunde Adeyemi' },items: [{ product: { name: 'SlimBalance' } }], createdAt: '2026-06-08', status: 'cancelled', totalPrice: 14000 },
];

const FALLBACK_TOP = [
  { Icon: Droplet,  name: 'Greens Plus Daily Formula', category: 'Immunity', revenue: '₦375K', units: 25 },
  { Icon: Sparkles, name: 'Marine Collagen Blend',      category: 'Beauty',   revenue: '₦324K', units: 18 },
  { Icon: Shield,   name: 'Immunity Shield Pro',        category: 'Immunity', revenue: '₦286K', units: 26 },
  { Icon: Zap,      name: 'Energy Pro Complex',          category: 'Energy',   revenue: '₦240K', units: 20 },
];

const FALLBACK_INVENTORY = [
  { name: 'SlimBalance Weight',  stock: 12,  max: 90,  alert: true  },
  { name: 'Marine Collagen',     stock: 28,  max: 80,  alert: true  },
  { name: 'Greens Plus',         stock: 120, max: 150, alert: false },
  { name: 'Vitamin C + Zinc',    stock: 285, max: 300, alert: false },
  { name: 'Omega-3 Fish Oil',    stock: 144, max: 200, alert: false },
];

// ── Tooltip formatters ──────────────────────────────────────────────
const nairaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e2130', border: '1px solid #262b3d', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#7b829a', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: ₦{(p.value / 1000).toFixed(0)}K
        </div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const navigate   = useNavigate();
  const [period, setPeriod] = useState('7d');

  // Live data from your backend — falls back to static data on error
  const { data: statsData } = useFetch(admin.dashboard);
  const { data: ordersData } = useFetch(ordersApi);

  const stats     = statsData ?? {};
  const orders    = ordersData?.orders ?? [];
  const salesData = statsData?.salesChart ??  [];
  const catData   = statsData?.categoryBreakdown ?? [];
  const topProds  = statsData?.topProducts ?? [];
  const inventory = statsData?.inventory ?? [];

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Sales Overview</h1>
          <p>{today} — Welcome back, Admin</p>
        </div>
        <div className="date-filter">
          {['Today','7 Days','30 Days','90 Days'].map(p => (
            <button
              key={p}
              className={`filter-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard Icon={Wallet}       label="Total Revenue"    bg="rgba(0,200,150,.12)"   value={stats.revenue?.value}    delta={stats.revenue?.delta}    up={stats.revenue?.up}    sub="vs prev 7 days"/>
        <KpiCard Icon={ShoppingCart} label="Total Orders"     bg="rgba(124,92,252,.12)"  value={stats.orders?.value}     delta={stats.orders?.delta}     up={stats.orders?.up}     sub="vs prev 7 days"/>
        <KpiCard Icon={Users}       label="Active Customers" bg="rgba(245,158,11,.12)"  value={stats.customers?.value}  delta={stats.customers?.delta}  up={stats.customers?.up}  sub="vs prev 7 days"/>
        <KpiCard Icon={PackageX}    label="Out of Stock"     bg="rgba(255,77,109,.12)"  value={stats.outOfStock?.value} delta={stats.outOfStock?.delta} up={false}                sub="need restock"/>
      </div>

      {/* Charts Row */}
      <div className="charts-row">

        {/* Revenue area chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue Performance</div>
              <div className="card-sub">Daily sales — last 7 days</div>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, alignItems: 'center' }}>
              <Legend color="#00c896" label="This week"/>
              <Legend color="#7b829a" label="Last week" dashed/>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="thisWeek" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00c896" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00c896" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="lastWeek" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7b829a" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#7b829a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#262b3d" vertical={false}/>
              <XAxis dataKey="day" tick={{ fill: '#7b829a', fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#7b829a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}K`}/>
              <Tooltip content={nairaTooltip}/>
              <Area type="monotone" dataKey="thisWeek" name="This week" stroke="#00c896" strokeWidth={2} fill="url(#thisWeek)" dot={{ fill: '#00c896', r: 4 }} activeDot={{ r: 6 }}/>
              <Area type="monotone" dataKey="lastWeek" name="Last week" stroke="#7b829a" strokeWidth={1.5} fill="url(#lastWeek)" strokeDasharray="4 4" dot={{ fill: '#7b829a', r: 3 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue by Category</div>
              <div className="card-sub">This week's breakdown</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                {catData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent"/>)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v}%`, n]}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8 }}>
            {catData.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < catData.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }}/>
                <div style={{ flex: 1, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{c.value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="stats-strip">
        <StatStrip Icon={Inbox}      label="Pending Orders"  value={stats.pendingOrders} color="var(--warn)"   sub="Awaiting fulfillment"/>
        <StatStrip Icon={XCircle}    label="Cancelled"        value={stats.cancelled}     color="var(--danger)" sub="▲ 1.6% this week"/>
        <StatStrip Icon={TrendingUp} label="Net Profit"       value={stats.netProfit}     color="var(--accent)" sub={`Margin: ${stats.margin}`}/>
      </div>

      {/* Bottom row */}
      <div className="bottom-row">

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Orders</div>
              <div className="card-sub">Latest transactions</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={13} strokeWidth={2.2} /> Export
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th><th>Customer</th><th>Date</th><th>Status</th><th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map(o => (
                  <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/orders/${o._id}`)}>
                    <td><span className="order-id">#{o._id?.slice(-6) ?? o._id}</span></td>
                    <td>{o.user?.name ?? '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                    <td><span className={`status-badge s-${o.status}`}>{cap(o.status)}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', color: o.status === 'cancelled' ? 'var(--muted)' : 'var(--accent)' }}>
                      ₦{(o.totalPrice ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="view-all" onClick={() => navigate('/admin/orders')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, borderTop: '1px solid var(--border)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', margin: '12px -20px -20px' }}>
            View All Orders →
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top Products */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Top Products</div><div className="card-sub">By revenue this week</div></div>
            </div>
            {topProds.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < topProds.length-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', width: 20, textAlign: 'center' }}>#{i+1}</div>
                <div style={{ width: 36, height: 36, background: 'var(--surface2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {p.Icon ? <p.Icon size={17} strokeWidth={1.8} aria-hidden="true" /> : <Pill size={17} strokeWidth={1.8} aria-hidden="true" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)' }}>{p.revenue}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.units} sold</div>
                </div>
              </div>
            ))}
          </div>

          {/* Inventory */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Inventory Status</div><div className="card-sub">Stock levels</div></div>
              <span style={{ fontSize: 11, background: 'rgba(255,77,109,.12)', color: 'var(--danger)', padding: '3px 8px', borderRadius: 20, fontWeight: 600 }}>
                {inventory.filter(i => i.alert).length} Low
              </span>
            </div>
            {inventory.map((item, i) => {
              const pct = Math.round((item.stock / item.max) * 100);
              const color = item.alert ? (pct < 20 ? 'var(--danger)' : 'var(--warn)') : 'var(--accent)';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < inventory.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }}/>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, width: 40, textAlign: 'right', color }}>{item.stock}</div>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: item.alert ? 'rgba(255,77,109,.12)' : 'rgba(0,200,150,.12)', color: item.alert ? 'var(--danger)' : 'var(--accent)' }}>
                    {item.alert ? 'Low' : 'OK'}
                  </span>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}

// ── Small reusable sub-components ──────────────────────────────────
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
      <div className={`kpi-delta ${up ? 'up' : 'down'}`}>
        {up ? <ChevronUp size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} /> : <ChevronDown size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} />} {delta} <span className="kpi-sub">{sub}</span>
      </div>
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
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 500, color }}>{value ?? '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 3, background: dashed ? 'none' : color, borderTop: dashed ? `2px dashed ${color}` : 'none', display: 'inline-block', borderRadius: 2 }}/>
      <span style={{ color: dashed ? 'var(--muted)' : color }}>{label}</span>
    </span>
  );
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
