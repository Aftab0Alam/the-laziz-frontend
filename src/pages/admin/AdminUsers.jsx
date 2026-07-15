import { useEffect, useState, useCallback } from 'react';
import { fetchAllUsers, updateUserStatus, updateUserRole } from '../../utils/adminApi';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const ROLE_COLORS = { user: '#6b7280', admin: '#3b82f6', superadmin: '#8b5cf6' };
const ROLE_LABELS = { user: '👤 User', admin: '🛡️ Admin', superadmin: '👑 Superadmin' };

/* ── Confirm modal ─────────────────────────────────────────────── */
function ConfirmModal({ target, newRole, onConfirm, onCancel, loading }) {
  if (!target) return null;
  const isPromote = newRole === 'admin' || newRole === 'superadmin';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>
          {isPromote ? '🛡️' : '👤'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', marginBottom: 8 }}>
          {isPromote ? 'Grant Admin Access?' : 'Remove Admin Access?'}
        </div>
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
          {isPromote
            ? <>You are granting <strong>{target.name}</strong> admin access. They will be able to manage orders, products, categories and users.</>
            : <>You are removing admin access from <strong>{target.name}</strong>. They will only have regular user access.</>
          }
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="admin-btn admin-btn-ghost" onClick={onCancel} style={{ flex: 1 }} disabled={loading}>Cancel</button>
          <button
            className={`admin-btn ${isPromote ? 'admin-btn-primary' : 'admin-btn-danger'}`}
            onClick={onConfirm}
            style={{ flex: 1 }}
            disabled={loading}
          >
            {loading ? 'Saving…' : isPromote ? 'Yes, Make Admin' : 'Yes, Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function AdminUsers() {
  const { user: currentUser } = useAuthStore();

  const [users, setUsers]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  // Role change state
  const [roleModal, setRoleModal] = useState(null); // { user, newRole }
  const [roleLoading, setRoleLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchAllUsers({ page, limit: 15, search })
      .then(d => { setUsers(d.users || []); setTotal(d.total); setPages(d.pages); })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };

  const handleToggleStatus = async (user) => {
    setTogglingId(user._id);
    try {
      await updateUserStatus(user._id, !user.isActive);
      toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'}`);
      load();
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setTogglingId(null);
    }
  };

  /* ── Open role confirm modal ─────────────────────────────────── */
  const handleRoleClick = (user) => {
    if (user._id === currentUser?._id) { toast.error("You can't change your own role"); return; }
    const newRole = user.role === 'user' ? 'admin' : 'user';
    setRoleModal({ user, newRole });
  };

  /* ── Confirm role change ─────────────────────────────────────── */
  const confirmRoleChange = async () => {
    if (!roleModal) return;
    setRoleLoading(true);
    try {
      await updateUserRole(roleModal.user._id, roleModal.newRole);
      toast.success(
        roleModal.newRole === 'admin'
          ? `✅ ${roleModal.user.name} is now an Admin`
          : `${roleModal.user.name} is now a regular User`
      );
      setRoleModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setRoleLoading(false);
    }
  };

  const isSelf = (userId) => userId === currentUser?._id;

  return (
    <div className="admin-page">

      {/* ── Confirm Modal ───────────────────────────────────────── */}
      <ConfirmModal
        target={roleModal?.user}
        newRole={roleModal?.newRole}
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleModal(null)}
        loading={roleLoading}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <span className="admin-page-sub">{total} registered users</span>
        </div>
      </div>

      {/* ── Admin count chips ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, padding: '0 0 16px' }}>
        {[
          { role: 'user',       label: 'Regular Users', bg: '#f3f4f6', color: '#6b7280' },
          { role: 'admin',      label: 'Admins',        bg: '#eff6ff', color: '#3b82f6' },
          { role: 'superadmin', label: 'Superadmins',   bg: '#f5f3ff', color: '#8b5cf6' },
        ].map(({ role, label, bg, color }) => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} style={{ background: bg, color, borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 700 }}>
              {ROLE_LABELS[role].split(' ')[0]} {count} {label}
            </div>
          );
        })}
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="admin-filters">
        <form onSubmit={handleSearch} className="admin-search-form">
          <input className="admin-input" placeholder="Search by name, email or phone…" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          <button type="submit" className="admin-btn admin-btn-primary">Search</button>
          {search && (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>
          )}
        </form>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">Loading users…</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="admin-table-empty">No users found.</td></tr>
                  ) : users.map(u => (
                    <tr key={u._id} style={isSelf(u._id) ? { background: '#fafffe' } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="admin-user-avatar-sm" style={{ background: ROLE_COLORS[u.role] + '33', color: ROLE_COLORS[u.role] }}>
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="admin-customer-name">
                              {u.name}
                              {isSelf(u._id) && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginLeft: 6 }}>YOU</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: '#555' }}>{u.phone}</td>
                      <td>
                        <span className="admin-badge" style={{ background: ROLE_COLORS[u.role] + '20', color: ROLE_COLORS[u.role], fontWeight: 700, fontSize: 11 }}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="admin-date">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className={`admin-btn admin-btn-sm ${u.isActive ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                            onClick={() => handleToggleStatus(u)}
                            disabled={togglingId === u._id || isSelf(u._id)}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {u.role !== 'superadmin' && !isSelf(u._id) && (
                            <button
                              className="admin-btn admin-btn-sm"
                              onClick={() => handleRoleClick(u)}
                              style={{
                                background: u.role === 'user' ? '#eff6ff' : '#fff3f3',
                                color:      u.role === 'user' ? '#3b82f6' : '#ef4444',
                                border:     `1.5px solid ${u.role === 'user' ? '#bfdbfe' : '#fecaca'}`,
                                fontWeight: 700,
                              }}
                            >
                              {u.role === 'user' ? 'Make Admin' : 'Remove Admin'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="admin-mobile-cards">
              {users.length === 0 ? (
                <div className="admin-table-empty">No users found.</div>
              ) : users.map(u => (
                <div key={u._id} className="admin-mobile-card">
                  <div className="admin-mobile-card-header">
                    <div className="admin-user-avatar-sm" style={{ background: ROLE_COLORS[u.role] + '33', color: ROLE_COLORS[u.role] }}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="admin-customer-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {u.name}
                        {isSelf(u._id) && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>YOU</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                    <span className={`admin-badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="admin-mobile-card-body">
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Phone</span>
                      <span className="admin-mobile-value">{u.phone || '—'}</span>
                    </div>
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Role</span>
                      <span className="admin-badge" style={{ background: ROLE_COLORS[u.role] + '20', color: ROLE_COLORS[u.role], fontWeight: 700, fontSize: 11 }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>
                    <div className="admin-mobile-row">
                      <span className="admin-mobile-label">Joined</span>
                      <span className="admin-date">{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="admin-mobile-card-footer">
                    <button
                      className={`admin-btn admin-btn-sm ${u.isActive ? 'admin-btn-danger' : 'admin-btn-primary'}`}
                      onClick={() => handleToggleStatus(u)}
                      disabled={togglingId === u._id || isSelf(u._id)}
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {u.role !== 'superadmin' && !isSelf(u._id) && (
                      <button
                        className="admin-btn admin-btn-sm"
                        onClick={() => handleRoleClick(u)}
                        style={{
                          background: u.role === 'user' ? '#eff6ff' : '#fff3f3',
                          color:      u.role === 'user' ? '#3b82f6' : '#ef4444',
                          border:     `1.5px solid ${u.role === 'user' ? '#bfdbfe' : '#fecaca'}`,
                          fontWeight: 700,
                        }}
                      >
                        {u.role === 'user' ? 'Make Admin' : 'Remove Admin'}
                      </button>
                    )}
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
