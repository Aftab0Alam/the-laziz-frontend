import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, X, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import useCartStore from '../store/cartStore';
import BottomNav from '../components/Layout/BottomNav';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const CANCEL_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/** Returns ms remaining in cancel window, or 0 if expired */
const getRemainingMs = (createdAt) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, CANCEL_WINDOW_MS - elapsed);
};

const formatCountdown = (ms) => {
  const totalSec = Math.ceil(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
};

/** Live countdown component — re-renders every second */
const CancelCountdown = ({ createdAt, onExpire }) => {
  const [remaining, setRemaining] = useState(() => getRemainingMs(createdAt));

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const timer = setInterval(() => {
      const r = getRemainingMs(createdAt);
      setRemaining(r);
      if (r <= 0) { clearInterval(timer); onExpire(); }
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt, onExpire]);

  return (
    <span className="cancel-timer">
      ⏱ {formatCountdown(remaining)}
    </span>
  );
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();

  // Track which order IDs still have the cancel window open (client-side)
  const [cancellableIds, setCancellableIds] = useState(new Set());
  // Confirmation modal state
  const [confirmOrderId, setConfirmOrderId] = useState(null);

  const prevStatusesRef = useRef({});

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => api.get('/orders/my-orders').then(r => r.data.data),
    refetchInterval: 10_000,           // poll every 10 s
    refetchIntervalInBackground: true, // keep polling even if tab is not focused
  });

  const orders = data?.orders || [];

  // Build initial set of cancellable orders + detect status changes
  useEffect(() => {
    if (!orders.length) return;

    const ids = new Set(
      orders
        .filter(o => o.currentStatus === 'Pending' && getRemainingMs(o.createdAt) > 0)
        .map(o => o._id)
    );
    setCancellableIds(ids);

    // Notify user if any order status changed since last fetch
    orders.forEach(o => {
      const prev = prevStatusesRef.current[o._id];
      if (prev && prev !== o.currentStatus) {
        toast(`📦 Order ${o.orderCode} is now ${o.currentStatus}`, { icon: '🔔', duration: 5000 });
      }
    });
    // Store current statuses for next comparison
    const map = {};
    orders.forEach(o => { map[o._id] = o.currentStatus; });
    prevStatusesRef.current = map;
  }, [orders]);

  const handleExpire = useCallback((id) => {
    setCancellableIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const cancelMutation = useMutation({
    mutationFn: (orderId) => api.patch(`/orders/my-orders/${orderId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      toast.success('Order cancelled successfully');
      setConfirmOrderId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
      setConfirmOrderId(null);
    },
  });

  const handleReorder = (order) => {
    order.items.forEach(item => {
      addItem({ _id: item.productId, name: item.name, imageUrl: item.imageUrl, price: item.price });
    });
    toast.success('Items added to cart!');
    navigate('/cart');
  };

  const confirmingOrder = orders.find(o => o._id === confirmOrderId);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 1000, height: 56, background: 'white', display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', borderBottom: '1px solid #EBEBEB' }}>
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>My Orders</div>
          {dataUpdatedAt > 0 && (
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>
              Updated {new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      <div style={{ paddingTop: 8 }}>
        {/* Skeleton loaders */}
        {isLoading && [...Array(3)].map((_, i) => (
          <div key={i} style={{ margin: '0 16px 12px', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="skeleton" style={{ height: 60, borderRadius: 0 }} />
            <div style={{ padding: 12 }}>
              <div className="skeleton" style={{ height: 12, marginBottom: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!isLoading && orders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 16px', color: '#999' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: '#1A1A1A' }}>No Orders Yet</div>
            <div style={{ fontSize: 13 }}>Start ordering delicious food!</div>
            <button className="btn btn-primary" style={{ marginTop: 20, padding: '12px 28px' }} onClick={() => navigate('/menu')}>Browse Menu</button>
          </div>
        )}

        {/* Order cards */}
        {orders.map(order => {
          const canCancel = cancellableIds.has(order._id);
          return (
            <div key={order._id} className="order-card">
              <div className="order-card-header">
                <div>
                  <div className="order-code">{order.orderCode}</div>
                  <div className="order-date">{formatDate(order.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`order-status-badge status-${order.currentStatus.replace(/ /g, '-')}`}>
                    {order.currentStatus}
                  </span>
                  {/* Live countdown timer */}
                  {canCancel && (
                    <CancelCountdown
                      createdAt={order.createdAt}
                      onExpire={() => handleExpire(order._id)}
                    />
                  )}
                </div>
              </div>

              <div className="order-card-body">
                <div className="order-items-preview">
                  {order.items.map(i => `${i.name} ×${i.quantity}`).join(' • ')}
                </div>
              </div>

              <div className="order-card-footer">
                <div className="order-total">₹{order.totalAmount}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Cancel button — only within 2-min window */}
                  {canCancel && (
                    <button
                      className="cancel-btn"
                      onClick={() => setConfirmOrderId(order._id)}
                      disabled={cancelMutation.isPending}
                    >
                      <X size={12} style={{ marginRight: 3 }} />Cancel
                    </button>
                  )}
                  <button className="reorder-btn" onClick={() => handleReorder(order)}>
                    <RotateCcw size={12} style={{ marginRight: 4 }} />Reorder
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />

      {/* ── Cancel Confirmation Modal ── */}
      {confirmOrderId && confirmingOrder && (
        <div className="confirm-overlay" onClick={() => setConfirmOrderId(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon">
              <AlertTriangle size={32} color="#E53935" />
            </div>
            <div className="confirm-modal-title">Cancel Order?</div>
            <div className="confirm-modal-body">
              Are you sure you want to cancel{' '}
              <strong>{confirmingOrder.orderCode}</strong>?
              This cannot be undone.
            </div>
            <div className="confirm-modal-actions">
              <button
                className="confirm-modal-dismiss"
                onClick={() => setConfirmOrderId(null)}
                disabled={cancelMutation.isPending}
              >
                Keep Order
              </button>
              <button
                className="confirm-modal-confirm"
                onClick={() => cancelMutation.mutate(confirmOrderId)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
