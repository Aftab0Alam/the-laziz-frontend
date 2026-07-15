import { useNavigate } from 'react-router-dom';
import { User, MapPin, Heart, ShoppingBag, Settings, LogOut, ChevronRight, Phone, Mail } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import BottomNav from '../components/Layout/BottomNav';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const menuItems = [
    { icon: '📦', label: 'My Orders', bg: '#FFF3E0', path: '/orders' },
    { icon: '❤️', label: 'Favourites', bg: '#FFEBEE', path: '/favourites' },
    { icon: '📍', label: 'Saved Addresses', bg: '#E3F2FD', path: '/addresses' },
    { icon: '⚙️', label: 'Settings', bg: '#F3E5F5', path: '/settings' },
    { icon: '❓', label: 'Help & Support', bg: '#E8F5E9', path: '/help' },
  ];

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="page-wrapper">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.name} className="profile-avatar" style={{ display: 'flex' }} />
          ) : (
            <div className="profile-avatar">{initials}</div>
          )}
          <div className="profile-avatar-edit">✏</div>
        </div>
        <div>
          <div className="profile-name">{user?.name || 'Guest User'}</div>
          <div className="profile-phone">📱 {user?.phone || 'Add phone number'}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>✉ {user?.email}</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'white', borderBottom: '1px solid #EBEBEB' }}>
        {[
          { label: 'Orders', value: '12' },
          { label: 'Points', value: '240' },
          { label: 'Reviews', value: '5' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1A1A1A' }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div style={{ marginTop: 8 }}>
        {menuItems.map(item => (
          <div
            key={item.label}
            className="profile-menu-item"
            onClick={() => navigate(item.path)}
          >
            <div className="profile-menu-icon" style={{ background: item.bg }}>{item.icon}</div>
            <span className="profile-menu-label">{item.label}</span>
            <ChevronRight size={18} className="profile-menu-arrow" />
          </div>
        ))}

        {/* Logout */}
        <div className="profile-menu-item profile-logout" onClick={handleLogout} style={{ marginTop: 8, borderTop: '6px solid #F5F5F5' }}>
          <div className="profile-menu-icon" style={{ background: '#FFEBEE' }}>🚪</div>
          <span className="profile-menu-label" style={{ color: '#E53935' }}>Logout</span>
          <ChevronRight size={18} color="#E53935" />
        </div>
      </div>

      {/* App Info */}
      <div style={{ textAlign: 'center', padding: '24px 16px', color: '#ccc', fontSize: 11 }}>
        LAZIZ RESTAURANT v1.0.0 • Made with ❤️
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
