import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Star, MapPin, Edit2, Check, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';
import BottomNav from '../components/Layout/BottomNav';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

const emptyForm = () => ({
  label: 'Home',
  recipientName: '',
  phone: '',
  street: '',
  landmark: '',
  area: '',
  city: '',
  state: '',
  postalCode: '',
});

const AddressForm = ({ initial = emptyForm(), onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.recipientName.trim()) e.recipientName = 'Name required';
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Valid 10-digit phone required';
    if (!form.street.trim()) e.street = 'Street required';
    if (!form.area.trim()) e.area = 'Area required';
    if (!form.city.trim()) e.city = 'City required';
    if (!form.state.trim()) e.state = 'State required';
    if (!/^\d{6}$/.test(form.postalCode)) e.postalCode = '6-digit PIN required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = () => {
    if (validate()) onSave(form);
  };

  const fields = [
    { key: 'recipientName', label: 'Full Name', placeholder: 'Recipient name', col: 2 },
    { key: 'phone', label: 'Mobile', placeholder: '9876543210', type: 'tel', col: 2 },
    { key: 'street', label: 'Street / House No.', placeholder: 'H.No 123, Street Name', col: 2 },
    { key: 'landmark', label: 'Landmark (optional)', placeholder: 'Near school, mosque…', col: 2 },
    { key: 'area', label: 'Area / Locality', placeholder: 'Your locality', col: 1 },
    { key: 'city', label: 'City', placeholder: 'City', col: 1 },
    { key: 'state', label: 'State', placeholder: 'State', col: 1 },
    { key: 'postalCode', label: 'PIN Code', placeholder: '825109', col: 1 },
  ];

  return (
    <div className="addr-form-card">
      {/* Label selector */}
      <div style={{ marginBottom: 16 }}>
        <div className="form-label" style={{ marginBottom: 8 }}>Address Label</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {LABEL_OPTIONS.map(lbl => (
            <button
              key={lbl}
              className={`addr-label-chip${form.label === lbl ? ' active' : ''}`}
              onClick={() => set('label', lbl)}
            >
              {lbl === 'Home' ? '🏠' : lbl === 'Work' ? '💼' : '📍'} {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {fields.map(field => (
          <div key={field.key} className="form-group" style={{ gridColumn: `span ${field.col}` }}>
            <label className="form-label">{field.label}</label>
            <input
              className={`form-input${errors[field.key] ? ' error' : ''}`}
              type={field.type || 'text'}
              placeholder={field.placeholder}
              value={form[field.key] || ''}
              onChange={e => set(field.key, e.target.value)}
            />
            {errors[field.key] && <div className="form-error">{errors[field.key]}</div>}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, padding: '13px' }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving…' : <><Check size={14} style={{ marginRight: 6 }} />Save Address</>}
        </button>
        <button
          className="btn btn-outline"
          style={{ padding: '13px 20px' }}
          onClick={onCancel}
          disabled={saving}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const AddressesPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const addresses = user?.addresses || [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // _id of address being edited
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* ── helpers ── */
  const syncAddresses = (newAddresses) => updateUser({ addresses: newAddresses });

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post('/auth/addresses', form);
      syncAddresses(data.data.addresses);
      toast.success('Address saved!');
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/auth/addresses/${editingId}`, form);
      syncAddresses(data.data.addresses);
      toast.success('Address updated!');
      setEditingId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update address');
    } finally { setSaving(false); }
  };

  const handleDelete = async (addr) => {
    setDeletingId(addr._id);
    try {
      const { data } = await api.delete(`/auth/addresses/${addr._id}`);
      syncAddresses(data.data.addresses);
      toast.success('Address removed');
    } catch {
      toast.error('Failed to remove address');
    } finally { setDeletingId(null); }
  };

  const handleSetDefault = async (addr) => {
    try {
      const { data } = await api.patch(`/auth/addresses/${addr._id}`, { isDefault: true });
      syncAddresses(data.data.addresses);
      toast.success('Default address updated');
    } catch {
      toast.error('Failed to update default');
    }
  };

  const editingAddress = addresses.find(a => a._id === editingId);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 1000, height: 56, background: 'white', display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', borderBottom: '1px solid #EBEBEB' }}>
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>Saved Addresses</span>
        {!showForm && !editingId && (
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#E53935', fontWeight: 700, fontSize: 13 }}
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} /> Add New
          </button>
        )}
      </div>

      <div style={{ paddingTop: 8 }}>

        {/* Add new form */}
        {showForm && !editingId && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#E53935' }}>
              <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              New Address
            </div>
            <AddressForm
              onSave={handleAdd}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        )}

        {/* Empty state */}
        {!showForm && addresses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 60, marginBottom: 14 }}>📍</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1A1A1A', marginBottom: 6 }}>No Saved Addresses</div>
            <div style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>Save your delivery addresses for faster checkout</div>
            <button className="btn btn-primary" style={{ padding: '12px 28px' }} onClick={() => setShowForm(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> Add First Address
            </button>
          </div>
        )}

        {/* Address list */}
        {addresses.map(addr => (
          <div key={addr._id} style={{ margin: '0 16px 12px' }}>

            {/* Edit form inline */}
            {editingId === addr._id ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#E53935' }}>
                  <Edit2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Edit Address
                </div>
                <AddressForm
                  initial={{ ...addr }}
                  onSave={handleEdit}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <div className="addr-saved-card">
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>
                      {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '💼' : '📍'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>{addr.label}</span>
                    {addr.isDefault && (
                      <span className="addr-default-badge">✓ Default</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="addr-action-btn"
                      onClick={() => setEditingId(addr._id)}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="addr-action-btn addr-action-delete"
                      onClick={() => handleDelete(addr)}
                      disabled={deletingId === addr._id}
                      title="Delete"
                    >
                      {deletingId === addr._id ? '…' : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Address details */}
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600 }}>{addr.recipientName} · {addr.phone}</div>
                  <div>{addr.street}{addr.landmark ? `, Near ${addr.landmark}` : ''}</div>
                  <div>{addr.area}, {addr.city} – {addr.postalCode}</div>
                  <div>{addr.state}</div>
                </div>

                {/* Set as default */}
                {!addr.isDefault && (
                  <button
                    className="addr-set-default-btn"
                    onClick={() => handleSetDefault(addr)}
                  >
                    <Star size={12} style={{ marginRight: 4 }} />
                    Set as Default
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add more button at bottom of list */}
        {!showForm && !editingId && addresses.length > 0 && (
          <div style={{ padding: '8px 16px 24px' }}>
            <button
              className="addr-add-more-btn"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} style={{ marginRight: 6 }} /> Add Another Address
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AddressesPage;
