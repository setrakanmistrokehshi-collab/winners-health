import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orders as ordersApi } from '@/api/client';
import { PageLoader, EmptyState, OrderStatusBadge, Modal } from '@/components/ui';
import PaymentStatusBanner from '@/pages/Paymentstatusbanner';
import { formatNaira } from '@/config/money';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Package, Truck, Box } from 'lucide-react';
import PriceTag from '@/components/PriceTag';

export default function OrdersPage() {
  const [orderList, setOrderList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    ordersApi.myOrders()
      .then(({ data }) => setOrderList(data.orders))
      .catch(() => setOrderList([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      await ordersApi.cancel(id);
      toast.success('Order cancelled', {
        icon: <Package size={18} strokeWidth={2} color="var(--rust)" />,
      });
      setOrderList((prev) =>
        prev.map((o) => o._id === id ? { ...o, status: 'cancelled' } : o)
      );
      setSelected((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cannot cancel this order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
      <div className='container'>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 'var(--space-8)', color: 'var(--forest)' }}>My Orders</h1>

        {orderList.length === 0 ? (
          <EmptyState
            icon={Package}
            title='No orders yet'
            message="You haven't placed any orders. Start shopping to see them here."
            action={<Link to='/products' className='btn btn-primary'>Shop Now</Link>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {orderList.map((order) => (
              <div key={order._id} className='card' style={{ padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--forest)', fontSize: 15 }}>
                        {order.orderNumber}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      {order.paymentStatus === 'completed' && (
                        <span className='badge badge-green' style={{ fontSize: 10 }}>Paid</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div><PriceTag text={formatNaira(order.total)} size="lg" /></div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <PaymentStatusBanner order={order} />

                {/* Items preview */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                  {order.items?.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--parchment)', borderRadius: 'var(--radius)',
                      padding: '4px 10px', fontSize: 13,
                    }}>
                      <Box size={13} strokeWidth={2} color="var(--sage)" aria-hidden="true" />
                      <span style={{ fontWeight: 500, color: 'var(--forest)' }}>{item.name}</span>
                      <span style={{ color: 'var(--muted)' }}>×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className='btn btn-outline btn-sm' onClick={() => setSelected(order)}>
                    View Details
                  </button>
                  {['pending', 'paid'].includes(order.status) && (
                    <button
                      className='btn btn-ghost btn-sm'
                      style={{ color: 'var(--rust)' }}
                      onClick={() => handleCancel(order._id)}
                      disabled={cancelling}
                    >
                      Cancel Order
                    </button>
                  )}
                  {order.trackingNumber && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--muted)' }}>
                      <Truck size={14} strokeWidth={2} aria-hidden="true" /> Track: <code style={{ fontFamily: 'var(--font-mono)' }}>{order.trackingNumber}</code>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderNumber}`} maxWidth={580}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Status timeline */}
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: 14 }}>Status History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.statusHistory?.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sage)', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{s.status}</div>
                      {s.note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.note}</div>}
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        {format(new Date(s.timestamp), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <hr className='divider' />

            {/* Items */}
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)', fontSize: 14 }}>Items</h4>
              {selected.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14, gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <Box size={14} strokeWidth={2} color="var(--sage)" aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--forest)' }}>{item.name} ×{item.quantity}</span>
                  </span>
                  <span style={{ flexShrink: 0 }}><PriceTag text={formatNaira(item.price * item.quantity)} size="sm" /></span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { l: 'Subtotal', v: formatNaira(selected.subtotal) },
                { l: 'Shipping', v: selected.shipping === 0 ? 'Free' : formatNaira(selected.shipping) },
                ...(selected.discount > 0 ? [{ l: 'Discount', v: `-${formatNaira(selected.discount)}` }] : []),
              ].map((r) => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--muted)' }}>
                  <span>{r.l}</span><PriceTag text={r.v} size="sm" muted />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 16, paddingTop: 8, borderTop: '1px solid var(--border-light)', color: 'var(--forest)' }}>
                <span>Total</span><span>{formatNaira(selected.total)}</span>
              </div>
            </div>

            {/* Shipping address */}
            <div style={{ background: 'var(--parchment)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', fontSize: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--forest)' }}>Delivery Address</div>
              <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                {selected.shippingAddress?.street}, {selected.shippingAddress?.city},{' '}
                {selected.shippingAddress?.state}
              </div>
            </div>

            {['pending', 'paid'].includes(selected.status) && (
              <button
                className='btn btn-full'
                style={{ background: 'rgba(184,92,56,0.1)', color: 'var(--rust)', border: '1px solid rgba(184,92,56,0.3)' }}
                onClick={() => handleCancel(selected._id)}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}