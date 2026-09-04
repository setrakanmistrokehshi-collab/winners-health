// src/pages/admin/Reports.jsx
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useFetch from '../../hooks/useFetch';
import { getRevenueReport, getTopProducts } from '../../api/adminApi';
import { Pill, Shield, Sparkles, Zap, Scale, Droplet, Wallet, Package, ShoppingCart, TrendingUp, Download, ChevronUp, ChevronDown } from 'lucide-react';

const CATEGORY_ICON = {
  Immunity: Shield,
  Beauty:   Sparkles,
  Energy:   Zap,
  Weight:   Scale,
  Vitamins: Pill,
};

const MONTHLY_FALLBACK = [
  { month: 'Jan', revenue: 6200000, profit: 2860000, expenses: 3340000 },
  { month: 'Feb', revenue: 7100000, profit: 3280000, expenses: 3820000 },
  { month: 'Mar', revenue: 8400000, profit: 3880000, expenses: 4520000 },
  { month: 'Apr', revenue: 7800000, profit: 3600000, expenses: 4200000 },
  { month: 'May', revenue: 9100000, profit: 4200000, expenses: 4900000 },
  { month: 'Jun', revenue: 9800000, profit: 4540000, expenses: 5260000 },
];

const TOP_FALLBACK = [
  { rank:1, name:'Greens Plus Daily Formula',    category:'Immunity', units:850, revenue:12750000, margin:48, trend:'↑' },
  { rank:2, name:'Marine Collagen Beauty Blend', category:'Beauty',   units:640, revenue:11520000, margin:52, trend:'↑' },
  { rank:3, name:'Immunity Shield Pro',          category:'Immunity', units:780, revenue:8580000,  margin:44, trend:'↑' },
  { rank:4, name:'Energy Pro Complex',            category:'Energy',   units:600, revenue:7200000,  margin:41, trend:'→' },
  { rank:5, name:'Complete Multivitamin',         category:'Vitamins', units:720, revenue:6840000,  margin:46, trend:'↑' },
  { rank:6, name:'SlimBalance Weight Support',   category:'Weight',   units:410, revenue:5740000,  margin:39, trend:'↓' },
  { rank:7, name:'Vitamin C 1000mg + Zinc',      category:'Immunity', units:820, revenue:5330000,  margin:55, trend:'↑' },
  { rank:8, name:'Omega-3 Fish Oil 1000mg',      category:'Vitamins', units:590, revenue:5020000,  margin:43, trend:'→' },
  { rank:9, name:'Magnesium Complex 400mg',      category:'Vitamins', units:480, revenue:3600000,  margin:47, trend:'↑' },
];

const fmt = v => `₦${(v/1000000).toFixed(1)}M`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e2130', border:'1px solid #262b3d', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'#7b829a', marginBottom:6, fontWeight:600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color, display:'flex', gap:8, marginBottom:3 }}>
          <span>{p.name}:</span> <strong>₦{(p.value/1000000).toFixed(2)}M</strong>
        </div>
      ))}
    </div>
  );
};

export default function Reports() {
  const [period, setPeriod] = useState('monthly');

  const { data: revenueData } = useFetch(() => getRevenueReport(period), [period]);
  const { data: topData }     = useFetch(() => getTopProducts(9));

  const chartData  = revenueData?.data  ?? MONTHLY_FALLBACK;
  const topProds   = topData?.products  ?? TOP_FALLBACK;

  return (
    <>
      <div className="page-header">
        <div><h1>Reports</h1><p>Detailed analytics and performance data</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} strokeWidth={2.2} /> Download PDF
          </button>
          <button className="btn btn-primary">Generate Report</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { Icon: Wallet,       label:'Monthly Revenue', bg:'rgba(0,200,150,.12)',  val:'₦9.8M', delta:'+18.4%', up:true },
          { Icon: Package,      label:'Units Sold',      bg:'rgba(124,92,252,.12)', val:'4,821', delta:'+12.1%', up:true },
          { Icon: ShoppingCart, label:'Avg Order Value', bg:'rgba(245,158,11,.12)', val:'₦11.2K',delta:'+4.3%',  up:true },
          { Icon: TrendingUp,   label:'Profit Margin',   bg:'rgba(255,77,109,.12)', val:'46.2%', delta:'+1.8%',  up:true },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label"><div className="kpi-icon" style={{ background: k.bg }}><k.Icon size={16} strokeWidth={1.8} aria-hidden="true" /></div>{k.label}</div>
            <div className="kpi-value">{k.val}</div>
            <div className={`kpi-delta ${k.up?'up':'down'}`}>
              {k.up ? <ChevronUp size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} /> : <ChevronDown size={12} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: -1 }} />} {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Revenue — 2026</div>
              <div className="card-sub">Total revenue per month</div>
            </div>
            <div className="date-filter">
              {['monthly','weekly'].map(p => (
                <button key={p} className={`filter-btn ${period===p?'active':''}`}
                  onClick={() => setPeriod(p)} style={{ textTransform: 'capitalize' }}>{p}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top:4, right:4, bottom:0, left:-10 }}>
              <CartesianGrid stroke="#262b3d" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:'#7b829a', fontSize:12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'#7b829a', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="revenue" name="Revenue" fill="#00c896" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Profit vs Expenses</div>
              <div className="card-sub">Monthly breakdown</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top:4, right:4, bottom:0, left:-10 }}>
              <CartesianGrid stroke="#262b3d" vertical={false}/>
              <XAxis dataKey="month" tick={{ fill:'#7b829a', fontSize:12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'#7b829a', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{ fontSize:12, color:'#7b829a', paddingTop:8 }}/>
              <Bar dataKey="profit"   name="Profit"   fill="#00c896" radius={[4,4,0,0]}/>
              <Bar dataKey="expenses" name="Expenses" fill="#ff4d6d" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products table */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Revenue by Product — Top 9</div></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Product</th><th>Category</th><th>Units</th><th>Revenue</th><th>Margin</th><th>Trend</th></tr>
            </thead>
            <tbody>
              {topProds.map(p => (
                <tr key={p.rank}>
                  <td style={{ fontFamily:'var(--mono)', color:'var(--muted)' }}>{p.rank}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {(() => {
                        const CatIcon = CATEGORY_ICON[p.category] || Pill;
                        return <CatIcon size={16} strokeWidth={1.8} color="var(--muted)" aria-hidden="true" />;
                      })()}
                      {p.name}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize:11, background:'rgba(124,92,252,.12)', color:'var(--accent2)', padding:'2px 8px', borderRadius:20 }}>
                      {p.category}
                    </span>
                  </td>
                  <td style={{ fontFamily:'var(--mono)' }}>{(p.units ?? 0).toLocaleString()}</td>
                  <td style={{ fontFamily:'var(--mono)', color:'var(--accent)' }}>₦{(p.revenue/1000000).toFixed(2)}M</td>
                  <td style={{ fontFamily:'var(--mono)' }}>{p.margin}%</td>
                  <td style={{ fontSize:18, color: p.trend==='↑' ? 'var(--accent)' : p.trend==='↓' ? 'var(--danger)' : 'var(--muted)' }}>
                    {p.trend}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
