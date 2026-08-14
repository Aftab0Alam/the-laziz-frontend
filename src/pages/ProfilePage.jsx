import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight, ArrowLeft, Camera, User, Phone, Mail, Calendar,
  ShoppingBag, Heart, Lock, LogOut, Edit2, Eye, EyeOff, X, MapPin
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import BottomNav from '../components/Layout/BottomNav';

const getInitials = (name) =>
  (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const fmtDob = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Modal = ({ title, onClose, children }) => (
  <div className="profile-modal-overlay" onClick={onClose}>
    <div className="profile-modal" onClick={e => e.stopPropagation()}>
      <div className="profile-modal-header">
        <span className="profile-modal-title">{title}</span>
        <button className="profile-modal-close" onClick={onClose}><X size={20} /></button>
      </div>
      <div className="profile-modal-body">{children}</div>
    </div>
  </div>
);

const EditProfileModal = ({ user, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
    gender: user?.gender || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.phone.trim() || !/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/profile', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || undefined,
      });
      onSuccess(data.data.user);
      toast.success('Profile updated!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit Profile" onClose={onClose}>
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="profile-form-group">
          <label>Full Name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Your full name"
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="profile-form-error">{errors.name}</span>}
        </div>
        <div className="profile-form-group">
          <label>Mobile Number</label>
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="10-digit mobile"
            maxLength={10}
            className={errors.phone ? 'error' : ''}
          />
          {errors.phone && <span className="profile-form-error">{errors.phone}</span>}
        </div>
        <div className="profile-form-group">
          <label>Date of Birth</label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="profile-form-group">
          <label>Gender</label>
          <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <button type="submit" className="profile-form-submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </Modal>
  );
};

const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.current) e.current = 'Enter your current password';
    if (form.newPass.length < 8) e.newPass = 'Minimum 8 characters';
    if (form.newPass !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword: form.current, newPassword: form.newPass });
      toast.success('Password changed successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const PwdField = ({ field, label, placeholder }) => (
    <div className="profile-form-group">
      <label>{label}</label>
      <div className="profile-password-wrapper">
        <input
          type={show[field] ? 'text' : 'password'}
          value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          className={errors[field] ? 'error' : ''}
        />
        <button type="button" className="profile-password-eye" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}>
          {show[field] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {errors[field] && <span className="profile-form-error">{errors[field]}</span>}
    </div>
  );

  return (
    <Modal title="Change Password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="profile-form">
        <PwdField field="current" label="Current Password" placeholder="Enter current password" />
        <PwdField field="newPass" label="New Password" placeholder="At least 8 characters" />
        <PwdField field="confirm" label="Confirm New Password" placeholder="Re-enter new password" />
        <button type="submit" className="profile-form-submit" disabled={saving}>
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </Modal>
  );
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const fileRef = useRef(null);
  const [modal, setModal] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => api.get('/auth/stats').then(r => r.data.data),
    staleTime: 60_000,
  });

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    setAvatarLoading(true);
    try {
      const { data } = await api.patch('/auth/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ profileImageUrl: data.data.user.profileImageUrl });
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleProfileSaved = (updatedUser) => {
    updateUser({
      name: updatedUser.name,
      phone: updatedUser.phone,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
    });
  };

  const genderLabel = {
    male: 'Male',
    female: 'Female',
    prefer_not_to_say: 'Prefer not to say',
  };

  const menuItems = [
    { icon: <ShoppingBag size={18} />, bg: '#FFF3E0', label: 'My Orders', path: '/orders', badge: stats?.totalOrders },
    { icon: <Heart size={18} />, bg: '#FFEBEE', label: 'Favourites', path: '/favourites', badge: stats?.totalFavourites },
    { icon: <MapPin size={18} />, bg: '#E3F2FD', label: 'Saved Addresses', path: '/addresses' },
  ];

  return (
    <div className="page-wrapper">
      <div className="profile-top-bar">
        <button className="profile-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <span className="profile-top-title">My Profile</span>
        <button className="profile-edit-btn" onClick={() => setModal('edit')}>
          <Edit2 size={14} style={{ marginRight: 4 }} />Edit
        </button>
      </div>

      <div className="profile-hero-card">
        <div className="profile-avatar-ring" onClick={() => !avatarLoading && fileRef.current?.click()} title="Tap to change photo">
          {avatarLoading ? (
            <div className="profile-avatar profile-avatar-loading"><div className="avatar-spinner" /></div>
          ) : user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user?.name} className="profile-avatar profile-avatar-img" />
          ) : (
            <div className="profile-avatar profile-avatar-initials">{getInitials(user?.name)}</div>
          )}
          <div className="profile-camera-badge"><Camera size={11} /></div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
        <div className="profile-hero-name">{user?.name || 'Guest User'}</div>
        <div className="profile-hero-email">{user?.email}</div>
        {user?.role && user.role !== 'user' && (
          <span className="profile-role-badge">
            {user.role === 'superadmin' ? 'Super Admin' : 'Admin'}
          </span>
        )}
      </div>

      <div className="profile-stats-row">
        <div className="profile-stat">
          {statsLoading
            ? <div className="skeleton" style={{ width: 32, height: 22, borderRadius: 6, margin: '0 auto 4px' }} />
            : <div className="profile-stat-value">{stats?.totalOrders ?? 0}</div>
          }
          <div className="profile-stat-label">Orders</div>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          {statsLoading
            ? <div className="skeleton" style={{ width: 32, height: 22, borderRadius: 6, margin: '0 auto 4px' }} />
            : <div className="profile-stat-value">{stats?.totalFavourites ?? 0}</div>
          }
          <div className="profile-stat-label">Favourites</div>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <div className="profile-stat-value">{user?.addresses?.length ?? 0}</div>
          <div className="profile-stat-label">Addresses</div>
        </div>
      </div>

      <div className="profile-body-grid">

      <div className="profile-section">
        <div className="profile-section-title">Personal Information</div>
        <div className="profile-info-card">
          <div className="profile-info-row">
            <div className="profile-info-icon-wrap" style={{ background: '#EEF2FF' }}><User size={16} color="#4F46E5" /></div>
            <div className="profile-info-content">
              <div className="profile-info-label">Full Name</div>
              <div className="profile-info-value">{user?.name || 'Not set'}</div>
            </div>
          </div>
          <div className="profile-info-row">
            <div className="profile-info-icon-wrap" style={{ background: '#FFF3E0' }}><Phone size={16} color="#F57C00" /></div>
            <div className="profile-info-content">
              <div className="profile-info-label">Mobile</div>
              <div className="profile-info-value">{user?.phone || 'Not set'}</div>
            </div>
          </div>
          <div className="profile-info-row">
            <div className="profile-info-icon-wrap" style={{ background: '#E8F5E9' }}><Mail size={16} color="#388E3C" /></div>
            <div className="profile-info-content">
              <div className="profile-info-label">Email</div>
              <div className="profile-info-value">{user?.email || 'Not set'}</div>
            </div>
          </div>
          {(user?.dateOfBirth || user?.gender) && (
            <div className="profile-info-row">
              <div className="profile-info-icon-wrap" style={{ background: '#FCE4EC' }}><Calendar size={16} color="#C2185B" /></div>
              <div className="profile-info-content">
                <div className="profile-info-label">Birthday & Gender</div>
                <div className="profile-info-value">
                  {[fmtDob(user?.dateOfBirth), genderLabel[user?.gender]].filter(Boolean).join('  �  ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Quick Actions</div>
        <div className="profile-menu-card">
          {menuItems.map(item => (
            <button key={item.label} className="profile-menu-row" onClick={() => navigate(item.path)}>
              <div className="profile-menu-icon-wrap" style={{ background: item.bg }}>{item.icon}</div>
              <span className="profile-menu-row-label">{item.label}</span>
              {item.badge > 0 && <span className="profile-menu-badge">{item.badge}</span>}
              <ChevronRight size={17} className="profile-menu-chevron" />
            </button>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Account Settings</div>
        <div className="profile-menu-card">
          <button className="profile-menu-row" onClick={() => setModal('password')}>
            <div className="profile-menu-icon-wrap" style={{ background: '#F3E5F5' }}><Lock size={18} color="#7B1FA2" /></div>
            <span className="profile-menu-row-label">Change Password</span>
            <ChevronRight size={17} className="profile-menu-chevron" />
          </button>
          <button className="profile-menu-row profile-menu-row-danger" onClick={handleLogout}>
            <div className="profile-menu-icon-wrap" style={{ background: '#FFEBEE' }}><LogOut size={18} color="#E53935" /></div>
            <span className="profile-menu-row-label" style={{ color: '#E53935' }}>Logout</span>
            <ChevronRight size={17} color="#E53935" />
          </button>
        </div>
      </div>{/* end Account Settings */}

      </div>{/* end profile-body-grid */}

      <div className="profile-footer">LAZIZ RESTAURANT v1.0.0 � Made with love</div>
      <BottomNav />

      {modal === 'edit' && (
        <EditProfileModal user={user} onClose={() => setModal(null)} onSuccess={handleProfileSaved} />
      )}
      {modal === 'password' && (
        <ChangePasswordModal onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default ProfilePage;

