import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, Check, Trash2 } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import api from '../utils/api';
import { buildWhatsAppUrl } from '../utils/helpers';
import toast from 'react-hot-toast';
import BottomNav from '../components/Layout/BottomNav';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

const emptyAddress = (user) => ({
  recipientName: user?.name || '',
  phone: user?.phone || '',
  street: '',
  landmark: '',
  area: '',
  city: '',
  state: '',
  postalCode: '',
  label: 'Home',
});

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { user, updateUser } = useAuthStore();

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const deliveryCharge = 20; // Flat ₹20 delivery
  const total = subtotal + deliveryCharge;

  const savedAddresses = user?.addresses || [];

  // 'new' | index of saved address
  const [activeTab, setActiveTab] = useState(() => {
    if (!savedAddresses.length) return 'new';
    const defIdx = savedAddresses.findIndex(a => a.isDefault);
    return defIdx >= 0 ? defIdx : 0;
  });

  const [address, setAddress] = useState(() => {
    if (!savedAddresses.length) return emptyAddress(user);
    const defIdx = savedAddresses.findIndex(a => a.isDefault);
    const src = savedAddresses[defIdx >= 0 ? defIdx : 0];
    return { ...src };
  });

  const [errors, setErrors] = useState({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Home');
  const [deletingId, setDeletingId] = useState(null);

  // When user switches tabs, update the form
  useEffect(() => {
    if (activeTab === 'new') {
      setAddress(emptyAddress(user));
      setErrors({});
    } else {
      const src = savedAddresses[activeTab];
      if (src) { setAddress({ ...src }); setErrors({}); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const validate = () => {
    const e = {};
    if (!address.recipientName) e.recipientName = 'Name is required';
    if (!address.phone || !/^[6-9]\d{9}$/.test(address.phone)) e.phone = 'Valid phone required';
    if (!address.street) e.street = 'Street address is required';
    if (!address.area) e.area = 'Area is required';
    if (!address.city) e.city = 'City is required';
    if (!address.postalCode || !/^\d{6}$/.test(address.postalCode)) e.postalCode = '6-digit PIN required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleDeleteAddress = async (addr, idx) => {
    setDeletingId(addr._id);
    try {
      const { data } = await api.delete(`/auth/addresses/${addr._id}`);
      updateUser({ addresses: data.data.addresses });
      toast.success('Address removed');
      // If we deleted the active tab, switch to 0 or new
      if (activeTab === idx) {
        setActiveTab(data.data.addresses.length > 0 ? 0 : 'new');
      } else if (activeTab > idx) {
        setActiveTab(prev => prev - 1);
      }
    } catch {
      toast.error('Failed to remove address');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePlaceOrder = async () => {
    if (!validate()) { toast.error('Please fill all required fields'); return; }
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    setLoading(true);
    try {
      // Optionally save new address before placing order
      if (activeTab === 'new' && saveAddress) {
        try {
          const { data } = await api.post('/auth/addresses', {
            label: saveLabel,
            recipientName: address.recipientName,
            phone: address.phone,
            street: address.street,
            landmark: address.landmark,
            area: address.area,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          });
          updateUser({ addresses: data.data.addresses });
        } catch {
          // Non-blocking — don't prevent order from being placed
          toast.error('Could not save address, but order will continue');
        }
      }

      const orderPayload = {
        items: items.map(i => ({ productId: i.productId, name: i.name, imageUrl: i.imageUrl, price: i.price, quantity: i.quantity, subtotal: i.subtotal })),
        deliveryAddress: address,
        customerPhone: address.phone,
        subtotal,
        discountAmount: 0,
        totalAmount: total,
        specialInstructions,
      };
      const { data } = await api.post('/orders', orderPayload);
      const order = data.data.order;

      let whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210';
      try {
        const settingsRes = await api.get('/settings');
        whatsappNumber = settingsRes.data.data.settings.whatsappNumber;
      } catch { }

      clearCart();
      const waUrl = buildWhatsAppUrl({ ...order, deliveryAddress: address, deliveryCharge }, whatsappNumber);
      window.open(waUrl, '_blank');
      navigate(`/order-success?code=${order.orderCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally { setLoading(false); }
  };

  const addressFields = [
    { key: 'recipientName', label: 'Full Name', placeholder: 'Your full name', col: 2 },
    { key: 'phone', label: 'Mobile', placeholder: '9876543210', type: 'tel', col: 2 },
    { key: 'street', label: 'Street / House No.', placeholder: 'H.No 123, Street Name', col: 2 },
    { key: 'landmark', label: 'Landmark (Optional)', placeholder: 'Near school / temple', col: 2 },
    { key: 'area', label: 'Area / Locality', placeholder: 'Your locality', col: 1 },
    { key: 'city', label: 'City', placeholder: 'City', col: 1 },
    { key: 'state', label: 'State', placeholder: 'State', col: 1 },
    { key: 'postalCode', label: 'PIN Code', placeholder: '825109', col: 1 },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 1000, height: 56, background: 'white', display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', borderBottom: '1px solid #EBEBEB' }}>
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Checkout</span>
      </div>

      <div style={{ paddingTop: 8 }}>

        {/* ── Address Section ── */}
        <div className="checkout-section">
          <div className="checkout-section-title">
            <MapPin size={16} color="#E53935" /> Delivery Address
          </div>

          {/* Address tab row */}
          <div className="addr-tab-row hide-scrollbar">
            {savedAddresses.map((addr, idx) => (
              <div key={addr._id || idx} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  className={`addr-tab${activeTab === idx ? ' active' : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  {activeTab === idx && <Check size={11} style={{ marginRight: 4 }} />}
                  {addr.label || 'Address'}
                  {addr.isDefault && <span className="addr-default-dot" />}
                </button>
                {/* Delete button — show on active saved tab */}
                {activeTab === idx && (
                  <button
                    className="addr-delete-btn"
                    onClick={() => handleDeleteAddress(addr, idx)}
                    disabled={deletingId === addr._id}
                    title="Remove address"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {/* New address tab */}
            <button
              className={`addr-tab${activeTab === 'new' ? ' active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              <Plus size={12} style={{ marginRight: 3 }} />New
            </button>
          </div>

          {/* Auto-fill notice for saved addresses */}
          {activeTab !== 'new' && (
            <div className="addr-autofill-notice">
              <Check size={13} color="#4CAF50" />
              <span>Address auto-filled — edit below if needed</span>
            </div>
          )}

          {/* Address form (always shown, pre-filled or empty) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            {addressFields.map(field => (
              <div key={field.key} className="form-group" style={{ gridColumn: `span ${field.col}` }}>
                <label className="form-label">{field.label}</label>
                <input
                  className={`form-input${errors[field.key] ? ' error' : ''}`}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={address[field.key] || ''}
                  onChange={e => setAddress(a => ({ ...a, [field.key]: e.target.value }))}
                />
                {errors[field.key] && <div className="form-error">{errors[field.key]}</div>}
              </div>
            ))}
          </div>

          {/* Save address option — only for new addresses */}
          {activeTab === 'new' && (
            <div className="save-addr-row">
              <label className="save-addr-checkbox">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={e => setSaveAddress(e.target.checked)}
                />
                <span>Save this address for future orders</span>
              </label>
              {saveAddress && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {LABEL_OPTIONS.map(lbl => (
                    <button
                      key={lbl}
                      className={`addr-label-chip${saveLabel === lbl ? ' active' : ''}`}
                      onClick={() => setSaveLabel(lbl)}
                    >
                      {lbl === 'Home' ? '🏠' : lbl === 'Work' ? '💼' : '📍'} {lbl}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Special Instructions */}
        <div className="checkout-section">
          <div className="checkout-section-title" style={{ marginBottom: 10 }}>📝 Special Instructions</div>
          <textarea
            className="form-input" rows={3}
            placeholder="Add cooking notes, preferences, allergy info..."
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            style={{ resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Order Summary */}
        <div className="checkout-section">
          <div className="checkout-section-title" style={{ marginBottom: 10 }}>🛒 Order Summary</div>
          {items.map(item => (
            <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
              <span style={{ color: '#333' }}>{item.name} ×{item.quantity}</span>
              <span style={{ fontWeight: 700 }}>₹{item.subtotal}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #EBEBEB', marginTop: 10, paddingTop: 10 }}>
            <div className="cart-summary-row"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="cart-summary-row"><span>Delivery</span><span>₹20</span></div>
            <div className="cart-summary-row total"><span>Total Amount</span><span style={{ color: '#E53935' }}>₹{total}</span></div>
          </div>
        </div>

        {/* Payment */}
        <div className="checkout-section">
          <div className="checkout-section-title">💵 Payment Method</div>
          <div className="payment-option selected">
            <span className="payment-option-icon">💵</span>
            <div>
              <div className="payment-option-label">Cash on Delivery</div>
              <div className="payment-option-desc">Pay when your food arrives</div>
            </div>
          </div>
        </div>

        {/* Place Order */}
        <div style={{ padding: '0 16px 24px' }}>
          <button
            className="cart-checkout-btn"
            onClick={handlePlaceOrder}
            disabled={loading}
            id="place-order-btn"
          >
            {loading ? 'Placing Order...' : `🚀 Place Order — ₹${total}`}
          </button>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#999' }}>
            Your order will be confirmed via WhatsApp
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CheckoutPage;
