// src/pages/admin/Customers.jsx
import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import { getCustomers } from '../../api/adminApi';
import { Download, Users, UserPlus, Repeat, Gem, Search, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

const NIGERIAN_STATES = ['Lagos','Abuja','Rivers','Oyo','Kano','Enugu','Anambra','Delta','Ogun','Kaduna'];

export default function Customers() {
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const LIMIT = 10;

  const { data, loading, error } = useFetch(
    () => getCustomers({ search, page, limit: LIMIT }),
    [search, page],
  );

  const customers = data?.users ?? data?.data ?? [];
  const total     = data?.total ?? 0;
  const pages     = Math.ceil(total / LIMIT) || 1;

  // Fallback customers for dev
  const display = customers.length ? customers : FALLBACK_CUSTOMERS;

  return (
    <>
      <div className="page-header">
        <div><h1>Customers</h1><p>Manage your customer base</p></div>
        <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} strokeWidth={2.2} /> Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {[
          { Icon: Users,    label:'Total Customers',   bg:'rgba(0,200,150,.12)',   val:'21.5K', delta:'+8.4%',  up:true  },
          { Icon: UserPlus, label:'New This Month',    bg:'rgba(124,92,252,.12)',  val:'1,284', delta:'+11.2%', up:true  },
          { Icon: Repeat,   label:'Retention Rate',    bg:'rgba(245,158,11,.12)',  val:'68.4%', delta:'+2.1%',  up:true  },
          { Icon: Gem,      label:'Avg Lifetime Value',bg:'rgba(255,77,109,.12)',  val:'₦42K',  delta:'+5.3%',  up:true  },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Customer table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">All Customers</div>
            <div style={{ position: 'relative' }}>
              <Search size={13} strokeWidth={2} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search customers…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 12, padding: '7px 10px 7px 28px', outline: 'none', width: 200 }}
              />
            </div>
          </div>

          {error   && <div className="error-state" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} strokeWidth={2} /> {error}</div>}
          {loading && <div className="spinner"/>}

          {!loading && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Customer</th><th>Email</th><th>State</th><th>Orders</th><th>LTV</th><th>Joined</th><th></th></tr>
                </thead>
                <tbody>
                  {display.map((c, i) => (
                    <tr key={c._id ?? i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{(c.name ?? 'U')[0]}</div>
                          {c.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.email}</td>
                      <td style={{ color: 'var(--muted)' }}>{c.state ?? '—'}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{c.orderCount ?? c.orders ?? 0}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                        ₦{(c.lifetimeValue ?? 0).toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 8 }}>
              <button className="filter-btn" disabled={page<=1}    onClick={() => setPage(p => p-1)}>← Prev</button>
              <button className="filter-btn" disabled={page>=pages} onClick={() => setPage(p => p+1)}>Next →</button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top states */}
          <div className="card">
            <div className="card-header"><div className="card-title">Top States</div></div>
            {[
              ['Lagos','38%','#00c896'],
              ['Abuja','22%','#7c5cfc'],
              ['Rivers','11%','#f59e0b'],
              ['Oyo','9%','#ff4d6d'],
              ['Enugu','8%','#00b4d8'],
              ['Others','12%','#7b829a'],
            ].map(([state, pct, color]) => (
              <div key={state} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }}/>
                <div style={{ flex: 1, fontSize: 13 }}>{state}</div>
                <div style={{ width: 70, height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: pct, height: '100%', background: color, borderRadius: 3 }}/>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', width: 32, textAlign: 'right' }}>{pct}</div>
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="card">
            <div className="card-header"><div className="card-title">Activity</div></div>
            {[
              ['Active today',     '1,241', 'var(--accent)'],
              ['Active this week', '8,420', 'var(--accent2)'],
              ['Inactive 30d+',   '3,180', 'var(--muted)'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 15, color, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const FALLBACK_CUSTOMERS = [
  { _id:'1', name:'Chidi Okonkwo',  email:'chidi@email.com',  state:'Lagos',   orderCount:14, lifetimeValue:210000, createdAt:'2025-01-15' },
  { _id:'2', name:'Amaka Eze',      email:'amaka@email.com',  state:'Abuja',   orderCount:9,  lifetimeValue:162000, createdAt:'2025-03-02' },
  { _id:'3', name:'Emeka Nwosu',    email:'emeka@email.com',  state:'Enugu',   orderCount:21, lifetimeValue:315000, createdAt:'2024-11-08' },
  { _id:'4', name:'Fatima Bello',   email:'fatima@email.com', state:'Kano',    orderCount:6,  lifetimeValue:51000,  createdAt:'2025-05-20' },
  { _id:'5', name:'Tunde Adeyemi',  email:'tunde@email.com',  state:'Oyo',     orderCount:3,  lifetimeValue:33500,  createdAt:'2025-06-01' },
  { _id:'6', name:'Ngozi Adaeze',   email:'ngozi@email.com',  state:'Anambra', orderCount:18, lifetimeValue:270000, createdAt:'2024-08-14' },
  { _id:'7', name:'Kemi Okafor',    email:'kemi@email.com',   state:'Lagos',   orderCount:11, lifetimeValue:132000, createdAt:'2025-02-28' },
  { _id:'8', name:'Seun Babatunde', email:'seun@email.com',   state:'Lagos',   orderCount:7,  lifetimeValue:75500,  createdAt:'2025-04-11' },
];
