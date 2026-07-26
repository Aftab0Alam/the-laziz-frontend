import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchAllOrders, updateOrderStatus } from '../../utils/adminApi';
import { useOrderAlarm } from '../../hooks/useOrderAlarm';
import toast from 'react-hot-toast';

const ALL_STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'];

const STATUS_COLORS = {
  Pending:            '#f59e0b',
  Confirmed:          '#3b82f6',
  Preparing:          '#8b5cf6',
  Ready:              '#06b6d4',
  'Out for Delivery': '#f97316',
  Delivered:          '#10b981',
  Cancelled:          '#ef4444',
};

const POLL_INTERVAL   = 30_000;
const CANCEL_WINDOW   = 2 * 60 * 1000; // 2 minutes — matches backend

/** ms remaining in the user cancel window */
const cancelRemaining = (createdAt) =>
  Math.max(0, CANCEL_WINDOW - (Date.now() - new Date(createdAt).getTime()));

/** Format ms → "1:45" */
const fmtMs = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ── Per-order countdown hook ─────────────────────────────────────── */
function OrderCountdown({ createdAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => cancelRemaining(createdAt));

  useEffect(() => {
    if (remaining === 0) { onExpire(); return; }
    const t = setInterval(() => {
      const r = cancelRemaining(createdAt);
      setRemaining(r);
      if (r === 0) { clearInterval(t); onExpire(); }
    }, 500);
    return () => clearInterval(t);
  }, [createdAt, onExpire]);

  if (remaining === 0) return null;

  return (
    <div className="alarm-countdown-wrap">
      <span className="alarm-countdown-label">User can cancel in</span>
      <span className="alarm-countdown-timer">{fmtMs(remaining)}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function AdminOrders() {
  const [orders, setOrders]           = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [pages, setPages]             = useState(1);
  const [status, setStatus]           = useState('all');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]         = useState(true);
  const [updatingId, setUpdatingId]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Alarm popup: { count, orders: [{...order, canConfirm: bool}] }
  const [alarmData, setAlarmData] = useState(null);

  const prevTotalRef    = useRef(0);
  const prevOrderIdsRef = useRef(new Set());
  const intervalRef     = useRef(null);

  const { enabled, enableSound, disableSound, playAlarm, stopAlarm } = useOrderAlarm();

  /* ── Load / Poll ──────────────────────────────────────────────── */
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetchAllOrders({ page, limit: 15, status, search })
      .then(d => {
        const incoming = d.orders || [];
        const newTotal = d.total ?? 0;

        if (prevTotalRef.current > 0) {
          const newOnes = incoming.filter(
            o => o.currentStatus === 'Pending' && !prevOrderIdsRef.current.has(o._id)
          );
          if (newOnes.length > 0) {
            playAlarm();
            setAlarmData(prev => {
              // Merge with any existing alarm orders (avoid duplicates)
              const existing = prev?.orders || [];
              const existingIds = new Set(existing.map(o => o._id));
              const merged = [...existing, ...newOnes.filter(o => !existingIds.has(o._id))];
              return { count: merged.length, orders: merged };
            });
          }
        }

        prevOrderIdsRef.current = new Set(incoming.map(o => o._id));
        prevTotalRef.current = newTotal;

        setOrders(incoming);
        setTotal(newTotal);
        setPages(d.pages);
        setLastUpdated(new Date());
      })
      .finally(() => setLoading(false));
  }, [page, status, search, playAlarm]);

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    intervalRef.current = setInterval(() => load(true), POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  /* ── Dismiss alarm ──────────────────────────────────────────────── */
  const dismissAlarm = () => { stopAlarm(); setAlarmData(null); };

  /* ── Confirm order from alarm ───────────────────────────────────── */
  const confirmFromAlarm = async (orderId) => {
    try {
      await updateOrderStatus(orderId, 'Confirmed');
      toast.success('✅ Order confirmed!');
      setAlarmData(prev => {
        if (!prev) return null;
        const remaining = prev.orders.filter(o => o._id !== orderId);
        if (remaining.length === 0) { stopAlarm(); return null; }
        return { ...prev, count: remaining.length, orders: remaining };
      });
      load(true);
    } catch {
      toast.error('Failed to confirm order');
    }
  };

  /* ── When countdown expires for a popup order ───────────────────── */
  const handleAlarmOrderExpire = useCallback((orderId) => {
    // Force re-render so the Confirm button unlocks
    setAlarmData(prev => {
      if (!prev) return null;
      return { ...prev, _tick: Date.now() }; // tiny change triggers re-render
    });
  }, []);

  /* ── Table actions ──────────────────────────────────────────────── */
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Status → "${newStatus}"`);
      load(true);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const handleManualRefresh = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => load(true), POLL_INTERVAL);
    load(false);
  };

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="admin-page">

      {/* ── NEW ORDER ALARM POPUP ─────────────────────────────────── */}
      {alarmData && (
        <>
          <div className="order-alarm-overlay" onClick={dismissAlarm} />
          <div className="order-alarm-card">

            <div className="order-alarm-bell">🔔</div>
            <div className="order-alarm-title">New Order!</div>
            <div className="order-alarm-sub">
              {alarmData.count} new order{alarmData.count > 1 ? 's' : ''} — wait for user cancel window before confirming
            </div>

            <div className="order-alarm-list">
              {alarmData.orders.map(order => {
                const remaining  = cancelRemaining(order.createdAt);
                const canConfirm = remaining === 0; // locked until 2-min window passes

                return (
                  <div key={order._id} className="order-alarm-item">
                    <div className="order-alarm-item-left">
                      <div className="order-alarm-item-code">#{order.orderCode}</div>
                      <div className="order-alarm-item-info">
                        {order.userId?.name || 'Guest'} · ₹{order.totalAmount?.toLocaleString('en-IN')}
                      </div>
                      <div className="order-alarm-item-items">
                        {order.items?.slice(0, 2).map((it, i) => (
                          <span key={i}>{it.name} ×{it.quantity}</span>
                        )).reduce((a, b) => [a, ', ', b])}
                        {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                      </div>

                      {/* Live countdown — shows while user can still cancel */}
                      {!canConfirm && (
                        <OrderCountdown
                          createdAt={order.createdAt}
                          onExpire={() => handleAlarmOrderExpire(order._id)}
                        />
                      )}
                      {canConfirm && (
                        <div className="alarm-ready-label">✅ Cancel window expired — ready to confirm</div>
                      )}
                    </div>

                    {/* Confirm button — locked (grey) during cancel window, green after */}
                    <button
                      className={`order-alarm-confirm-btn ${canConfirm ? 'unlocked' : 'locked'}`}
                      onClick={() => canConfirm && confirmFromAlarm(order._id)}
                      disabled={!canConfirm}
                      title={canConfirm ? 'Confirm this order' : 'Wait for user cancel window to expire'}
                    >
                      {canConfirm ? '✓ Confirm' : '⏳ Wait'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button className="order-alarm-dismiss" onClick={dismissAlarm}>
              Dismiss — confirm later from the table below
            </button>
          </div>
        </>
      )}

      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            Orders
            {alarmData && (
              <span className="order-new-badge">🛎 {alarmData.count} New!</span>
            )}
          </h1>
          <span className="admin-page-sub">{total} total orders</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Sound toggle — persists for 24 h via localStorage */}
          <button
            onClick={enabled ? disableSound : enableSound}
            className="admin-btn"
            title={enabled ? 'Sound is ON for 24h — click to disable' : 'Enable alarm sound (stays on for 24h)'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: enabled ? '#ecfdf5' : '#f9fafb',
              color:      enabled ? '#059669' : '#6b7280',
              border:     `1.5px solid ${enabled ? '#6ee7b7' : '#e5e7eb'}`,
              fontWeight: 700, fontSize: 12,
            }}
          >
            <span style={{ fontSize: 16 }}>{enabled ? '🔔' : '🔕'}</span>
            {enabled ? 'Sound On ·24h' : 'Enable Sound'}
          </button>

          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button className="admin-btn admin-btn-ghost" onClick={handleManualRefresh} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="admin-filters">
        <form onSubmit={handleSearch} className="admin-search-form">
          <input className="admin-input" placeholder="Search by order code or phone…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          <button type="submit" className="admin-btn admin-btn-primary">Search</button>
          {search && (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>
          )}
        </form>
        <div className="admin-status-tabs">
          {['all', ...ALL_STATUSES].map(s => (
            <button
              key={s}
              className={`admin-tab ${status === s ? 'active' : ''}`}
              onClick={() => { setStatus(s); setPage(1); }}
              style={status === s && s !== 'all' ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : {}}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Orders Table ──────────────────────────────────────────── */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">Loading orders…</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order Code</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={7} className="admin-table-empty">No orders found.</td></tr>
                  ) : orders.map(order => (
                    <tr key={order._id} className={order.currentStatus === 'Pending' ? 'order-row-pending' : ''}>
                      <td><span className="admin-order-code">{order.orderCode}</span></td>
                      <td>
                        <div className="admin-customer-name">{order.userId?.name || 'Guest'}</div>
                        <div className="admin-customer-phone">{order.customerPhone}</div>
                      </td>
                      <td>
                        <div className="admin-items-list">
                          {order.items.slice(0, 2).map((it, i) => (
                            <span key={i} className="admin-item-chip">{it.name} x{it.quantity}</span>
                          ))}
                          {order.items.length > 2 && <span className="admin-item-more">+{order.items.length - 2} more</span>}
                        </div>
                      </td>
                      <td><strong>Rs.{order.totalAmount.toLocaleString('en-IN')}</strong></td>
                      <td>
                        <div style={{ fontSize: 12 }}>{order.paymentMethod}</div>
                        <span className={`admin-badge ${order.paymentStatus === 'Paid' ? 'badge-green' : 'badge-yellow'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <select
                          className="admin-status-select"
                          value={order.currentStatus}
                          onChange={e => handleStatusChange(order._id, e.target.value)}
                          disabled={updatingId === order._id}
                          style={{ borderColor: STATUS_COLORS[order.currentStatus], color: STATUS_COLORS[order.currentStatus] }}
                        >
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="admin-date">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (shown below 768px via CSS) */}
            <div className="admin-mobile-cards">
              {orders.length === 0 ? (
                <div className="admin-table-empty">No orders found.</div>
              ) : orders.map(order => (
                <div key={order._id} className={`admin-mobile-card${order.currentStatus === 'Pending' ? ' order-row-pending' : ''}`}>
                  <div className="admin-mobile-card-header">
                    <span className="admin-order-code">{order.orderCode}</span>
                    <span className={`admin-badge ${order.paymentStatus === 'Paid' ? 'badge-green' : 'badge-yellow'}`} style={{ marginLeft: 'auto' }}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  <div className="admin-mobile-card-body">
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Customer</span>
                      <div style={{ textAlign: 'right' }}>
                        <div className="admin-customer-name">{order.userId?.name || 'Guest'}</div>
                        <div className="admin-customer-phone">{order.customerPhone}</div>
                      </div>
                    </div>
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Items</span>
                      <div style={{ textAlign: 'right' }}>
                        {order.items.slice(0, 2).map((it, i) => (
                          <div key={i} className="admin-item-chip">{it.name} x{it.quantity}</div>
                        ))}
                        {order.items.length > 2 && <div className="admin-item-more">+{order.items.length - 2} more</div>}
                      </div>
                    </div>
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Amount</span>
                      <strong style={{ color: '#111827' }}>Rs.{order.totalAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Payment</span>
                      <span className="admin-mobile-value">{order.paymentMethod}</span>
                    </div>
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Date</span>
                      <span className="admin-date">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Status</span>
                      <select
                        className="admin-status-select"
                        value={order.currentStatus}
                        onChange={e => handleStatusChange(order._id, e.target.value)}
                        disabled={updatingId === order._id}
                        style={{ borderColor: STATUS_COLORS[order.currentStatus], color: STATUS_COLORS[order.currentStatus] }}
                      >
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {pages > 1 && (
          <div className="admin-pagination">
            <button className="admin-btn admin-btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <span className="admin-page-info">Page {page} of {pages}</span>
            <button className="admin-btn admin-btn-ghost" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
