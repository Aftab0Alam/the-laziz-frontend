import '../../admin.css';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useState } from 'react';

const navItems = [
  { to: '/admin',            label: 'Dashboard',     icon: '📊', end: true },
  { to: '/admin/orders',     label: 'Orders',        icon: '📦' },
  { to: '/admin/products',   label: 'Products',      icon: '🍽️' },
  { to: '/admin/categories', label: 'Categories',    icon: '🏷️' },
  { to: '/admin/offers',     label: "Today's Offer", icon: '🔥' },
  { to: '/admin/sliders',    label: 'Carousel',      icon: '🖼️' },
  { to: '/admin/users',      label: 'Users',         icon: '👥' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <span className="admin-brand-icon">🍽️</span>
          <div>
            <div className="admin-brand-name">Laziz</div>
            <div className="admin-brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-user-card">
          <div className="admin-user-avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
          <div className="admin-user-info">
            <div className="admin-user-name">{user?.name || 'Admin'}</div>
            <div className="admin-user-role">{user?.role}</div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      {/* Main area */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <button className="admin-menu-btn" onClick={() => setSidebarOpen(s => !s)}>☰</button>
          <div className="admin-topbar-title">Laziz Restaurant — Admin</div>
          <a href="/" target="_blank" rel="noreferrer" className="admin-view-site-btn">
            🌐 View Site
          </a>
        </header>

        {/* Page content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
