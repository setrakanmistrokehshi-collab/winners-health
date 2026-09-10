// src/pages/admin/Reports.jsx
import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { admin } from '@/api/client'; // or '../../api/client'
import {
  Pill, Shield, Sparkles, Zap, Scale,
  Wallet, Package, ShoppingCart, TrendingUp, Download, ChevronUp, ChevronDown,
} from 'lucide-react';

const CATEGORY_ICON = {
  Immunity: Shield,
  Beauty: Sparkles,
  Energy: Zap,
  Weight: Scale,
  Vitamins: Pill,
};

function formatNaira(n) {
  const v = Number(n) || 0;
  return `₦${v.toLocaleString()}`;
}

function formatNairaShort(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(1)}K`;
  return `₦${v.toLocaleString()}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--admin-card)',
      border: '1px solid var(--admin-border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--admin-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8, marginBottom: 3 }}>
          <span>{p.name}:</span>
          <strong>{formatNaira(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

function unwrap(res) {
  return res?.data?.data ?? res?.data ?? res ?? null;
}

export default function Reports() {
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [topProds, setTopProds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      admin.revenueAnalytics
        ? admin.revenueAnalytics(period === 'weekly' ? 3 : 6)
        : Promise.reject(new Error('admin.revenueAnalytics missing')),
      admin.topProducts
        ? admin.topProducts(9)
        : Promise.reject(new Error('admin.topProducts missing')),
      // optional summary from same stats endpoint if you have it
      typeof admin.dashboard === 'function'
        ? admin.dashboard(period === 'weekly' ? '7d' : '30d')
        : Promise.resolve(null),
    ])
      .then(([revRes, topRes, statsRes]) => {
        if (cancelled) return;

        const rev = unwrap(revRes);
        const tops = unwrap(topRes);
        const stats = unwrap(statsRes);

        // revenue report: array of { month, revenue, profit?, expenses? }
        const series = Array.isArray(rev)
          ? rev
          : Array.isArray(rev?.months)
            ? rev.months
            : Array.isArray(rev?.data)
              ? rev.data
              : [];

        // top products: array of { name, category, units/totalSold, revenue, margin?, trend? }
        const products = Array.isArray(tops)
          ? tops
          : Array.isArray(tops?.products)
            ? tops.products
            : Array.isArray(tops?.data)
              ? tops.data
              : [];

        setChartData(series);
        setTopProds(products);
        setSummary(stats && typeof stats === 'object' ? stats : null);
      })
      .catch((err) => {
        console.error('Reports load failed:', err);
        if (!cancelled) {
          setError(err?.message || 'Failed to load reports');
          setChartData([]);
          setTopProds([]);
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [period]);

  // KPIs from backend only — no fixed strings
  const monthlyRevenue =
    summary?.totalRevenue ??
    summary?.revenue ??
    summary?.monthlyRevenue ??
    (chartData.length
      ? chartData[chartData.length - 1]?.revenue
      : null);

  const unitsSold =
    summary?.unitsSold ??
    summary?.totalUnits ??
    topProds.reduce((s, p) => s + Number(p.units ?? p.totalSold ?? 0), 0);

  const avgOrderValue =
    summary?.avgOrderValue ??
    summary?.aov ??
    null;

  const profitMargin =
    summary?.margin ??
    summary?.profitMargin ??
    null;

  const revenueDelta = summary?.revenueDelta ?? summary?.revenue?.delta ?? null;
  const unitsDelta = summary?.unitsDelta ?? null;
  const aovDelta = summary?.aovDelta ?? null;
  const marginDelta = summary?.marginDelta ?? null;

  if (loading) {
    return (
      <div style={{ color: 'var(--admin-muted)', padding: 40, textAlign: 'center' }}>
        Loading reports…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'var(--error)', padding: 40, textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  const kpis = [
    {
      Icon: Wallet,
      label: 'Revenue',
      bg: 'rgba(0,200,150,.12)',
      val: monthlyRevenue != null ? formatNairaShort(monthlyRevenue) : '—',
      delta: revenueDelta,
      up: summary?.revenueUp !== false,
    },
    {
      Icon: Package,
      label: 'Units Sold',
      bg: 'rgba(124,92,252,.12)',
      val: unitsSold != null ? Number(unitsSold).toLocaleString() : '—',
      delta: unitsDelta,
      up: true,
    },
    {
      Icon: ShoppingCart,
      label: 'Avg Order Value',
      bg: 'rgba(245,158,11,.12)',
      val: avgOrderValue != null ? formatNairaShort(avgOrderValue) : '—',
      delta: aovDelta,
      up: true,
    },
    {
      Icon: TrendingUp,
      label: 'Profit Margin',
      bg: 'rgba(255,77,109,.12)',
      val: profitMargin != null
        ? (String(profitMargin).includes('%') ? profitMargin : `${profitMargin}%`)
        : '—',
      delta: marginDelta,
      up: true,
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Detailed analytics and performance data</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} strokeWidth={2.2} /> Download PDF
          </button>
          <button type="button" className="btn btn-primary">Generate Report</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">
              <div className="kpi-icon" style={{ background: k.bg }}>
                <k.Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              </div>
              {k.label}
            </div>
            <div className="kpi-value">{k.val}</div>
            {k.delta != null && (
              <div className={`kpi-delta ${k.up ? 'up' : 'down'}`}>
                {k.up
                  ? <ChevronUp size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} />
                  : <ChevronDown size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} />}
                {' '}{k.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue</div>
              <div className="card-sub">Total revenue per period</div>
            </div>
            <div className="date-filter">
              {['monthly', 'weekly'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`filter-btn ${period === p ? 'active' : ''}`}
                  onClick={() => setPeriod(p)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="var(--admin-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--admin-muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--admin-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatNairaShort}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#00c896" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: 40 }}>
              No revenue data yet
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Profit vs Expenses</div>
              <div className="card-sub">Period breakdown</div>
            </div>
          </div>
          {chartData.some((d) => d.profit != null || d.expenses != null) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="var(--admin-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'var(--admin-muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--admin-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatNairaShort}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--admin-muted)', paddingTop: 8 }} />
                <Bar dataKey="profit" name="Profit" fill="#00c896" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ff4d6d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: 40 }}>
              No profit/expense fields in API response
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Revenue by Product — Top {topProds.length || 9}</div>
          </div>
        </div>
        <div className="table-wrap">
          {topProds.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Units</th>
                  <th>Revenue</th>
                  <th>Margin</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {topProds.map((p, i) => {
                  const CatIcon = CATEGORY_ICON[p.category] || Pill;
                  const units = p.units ?? p.totalSold ?? 0;
                  const revenue = p.revenue ?? 0;
                  const margin = p.margin;
                  const trend = p.trend;
                  return (
                    <tr key={p._id || p.name || i}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--admin-muted)' }}>
                        {p.rank ?? i + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CatIcon size={16} strokeWidth={1.8} color="var(--admin-muted)" aria-hidden="true" />
                          {p.name}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11,
                          background: 'rgba(124,92,252,.12)',
                          color: 'var(--admin-accent)',
                          padding: '2px 8px',
                          borderRadius: 20,
                        }}>
                          {p.category ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {Number(units).toLocaleString()}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--admin-accent)' }}>
                        {formatNaira(revenue)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {margin != null ? `${margin}%` : '—'}
                      </td>
                      <td style={{
                        fontSize: 18,
                        color: trend === '↑' || trend === 'up'
                          ? 'var(--admin-accent)'
                          : trend === '↓' || trend === 'down'
                            ? 'var(--error)'
                            : 'var(--admin-muted)',
                      }}>
                        {trend ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--admin-muted)', padding: 40 }}>
              No product sales data yet
            </div>
          )}
        </div>
      </div>
    </>
  );
}