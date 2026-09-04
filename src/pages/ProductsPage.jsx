import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { products as productsApi } from '@/api/client';
import { ProductCard, PageLoader, EmptyState, Pagination } from '@/components/ui';
import { Search, X } from 'lucide-react';

const CATEGORIES = ['immunity', 'energy', 'vitamins', 'weight', 'beauty', 'general'];
const SORTS = [
  { value: '-createdAt', label: 'Newest' },
  { value: '-rating',    label: 'Top Rated' },
  { value: '-totalSold', label: 'Best Selling' },
  { value: 'price',      label: 'Price: Low to High' },
  { value: '-price',     label: 'Price: High to Low' },
];

export default function ProductsPage() {
  const [items, setItems]     = useState([]);
  const [params, setParams] = useSearchParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

  const category = params.get('category') || '';
  const search   = params.get('search')   || '';
  const sort     = params.get('sort')     || '-createdAt';
  const page     = parseInt(params.get('page') || '1');
  const featured = params.get('featured') || '';

  const set = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const fetchProducts = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const q = { sort, page, limit: 12 };
    if (category) q.category = category;
    if (search)   q.search   = search;
    if (featured) q.featured = featured;

    productsApi.list(q, { signal: controller.signal })
    .then(({ data }) => setData(data))
    .catch((err) => {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Failed to load products:', err);
      setError(err);
      setData(null);
    })
    .finally(() => setLoading(false));

  return () => controller.abort();
}, [category, search, sort, page, featured]);

useEffect(() => fetchProducts(), [fetchProducts]);
  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Header */}
      <div style={{
        background: 'var(--parchment)', padding: 'var(--space-10) 0 var(--space-8)',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div className='container'>
          <h1 className='products-title' style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--forest-deep)', marginBottom: 6 }}>
            {category ? category.charAt(0).toUpperCase() + category.slice(1) : featured ? 'Bestsellers' : 'All Products'}
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            {data ? `${data.pagination?.total || 0} products found` : 'Explore our collection'}
          </p>
        </div>
      </div>

      <div className='container' style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        {/* Filters bar */}
        <div className='filters-bar' style={{
          display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)',
          alignItems: 'center', marginBottom: 'var(--space-8)',
          padding: 'var(--space-4)', background: 'var(--white)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
        }}>
          {/* Search */}
          <div className='filter-search' style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search
              size={16}
              strokeWidth={2}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}
            />
            <input
              className='input'
              style={{ paddingLeft: 38 }}
              placeholder='Search products...'
              defaultValue={search}
              onChange={(e) => set('search', e.target.value)}
            />
          </div>

          {/* Category filter */}
          <select
            className='input filter-select'
            style={{ flex: '0 1 160px' }}
            value={category}
            onChange={(e) => set('category', e.target.value)}
          >
            <option value=''>All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            className='input filter-select'
            style={{ flex: '0 1 200px' }}
            value={sort}
            onChange={(e) => set('sort', e.target.value)}
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Clear filters */}
          {(category || search || featured) && (
            <button className='btn btn-ghost btn-sm' onClick={() => setParams({})} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <X size={14} strokeWidth={2.2} /> Clear
            </button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
          <button
            onClick={() => set('category', '')}
            style={{
              padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500,
              background: !category ? 'var(--sage-dark)' : 'var(--parchment)',
              color: !category ? '#ffffff' : 'var(--forest)',
              border: 'none', cursor: 'pointer',
            }}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => set('category', c)}
              style={{
                padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500,
                background: category === c ? 'var(--sage-dark)' : 'var(--parchment)',
                color: category === c ? '#ffffff' : 'var(--forest)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <PageLoader />
        ) : data?.products?.length === 0 ? (
          <EmptyState
            icon={Search}
            title='No products found'
            message='Try adjusting your filters or search terms.'
            action={<button className='btn btn-outline' onClick={() => setParams({})}>Clear filters</button>}
          />
        ) : (
          <>
            <div className='product-grid' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
              {data?.products?.map((p, i) => (
                <ProductCard key={p._id} product={p} delay={i * 60} />
              ))}
            </div>
            <Pagination
              page={page}
              pages={data?.pagination?.pages || 1}
              onPage={(p) => {
                const next = new URLSearchParams(params);
                next.set('page', p);
                setParams(next);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}