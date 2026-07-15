import { useEffect, useState, useRef } from 'react';
import { fetchDashboardStats, fetchAllOrders } from '../../utils/adminApi';

const STATUS_COLORS = {
  Pending:          '#f59e0b',
  Confirmed:        '#3b82f6',
  Preparing:        '#8b5cf6',
  Ready:            '#06b6d4',
  'Out for Delivery': '#f97316',
  Delivered:        '#10b981',
  Cancelled:        '#ef4444',
};

const POLL_INTERVAL = 30_000; // 30 seconds

function StatCard({ icon, label, value, color }) {
  return (
    <div className="admin-stat-card" style={{ borderTopColor: color }}>
      <div className="admin-stat-icon" style={{ background: color + '22', color }}>{icon}</div>
      <div className="admin-stat-body">
        <div className="admin-stat-value">{value}</div>
        <div className="admin-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const loadData = (initial = false) => {
    const p = Promise.all([
      fetchDashboardStats(),
      fetchAllOrders({ limit: 8, page: 1 }),
    ]);
    if (initial) setLoading(true);
    p.then(([s, o]) => {
      setStats(s);
      setRecentOrders(o.orders || []);
      setLastUpdated(new Date());
    }).finally(() => {
      if (initial) setLoading(false);
    });
  };

  // Initial load
  useEffect(() => {
    loadData(true);
  }, []);

  // Auto-poll every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => loadData(false), POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleManualRefresh = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadData(false), POLL_INTERVAL);
    loadData(true);
  };

  if (loading) return <div className="admin-loading">⏳ Loading dashboard…</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <span className="admin-page-sub">Welcome back! Here's what's happening today.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            className="admin-btn admin-btn-ghost"
            onClick={handleManualRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: 14 }}>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <StatCard icon="🛒" label="Today's Orders"   value={stats?.todayOrders    ?? '—'} color="#f59e0b" />
        <StatCard icon="⏳" label="Pending Orders"    value={stats?.pendingOrders  ?? '—'} color="#ef4444" />
        <StatCard icon="✅" label="Delivered Today"   value={stats?.deliveredToday ?? '—'} color="#10b981" />
        <StatCard icon="❌" label="Cancelled Today"   value={stats?.cancelledToday ?? '—'} color="#8b5cf6" />
        <StatCard icon="💰" label="Revenue Today (₹)" value={`₹${(stats?.revenueToday ?? 0).toLocaleString('en-IN')}`} color="#3b82f6" />
      </div>

      {/* Recent Orders */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Recent Orders</h2>
          <a href="/admin/orders" className="admin-link">View all →</a>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order Code</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">No orders yet today.</td></tr>
              ) : recentOrders.map(order => (
                <tr key={order._id}>
                  <td><span className="admin-order-code">{order.orderCode}</span></td>
                  <td>
                    <div className="admin-customer-name">{order.userId?.name || 'Guest'}</div>
                    <div className="admin-customer-phone">{order.customerPhone}</div>
                  </td>
                  <td><strong>₹{order.totalAmount.toLocaleString('en-IN')}</strong></td>
                  <td>
                    <span className="admin-badge" style={{ background: (STATUS_COLORS[order.currentStatus] || '#999') + '22', color: STATUS_COLORS[order.currentStatus] || '#999' }}>
                      {order.currentStatus}
                    </span>
                  </td>
                  <td className="admin-date">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
