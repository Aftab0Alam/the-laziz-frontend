import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ShoppingBag, MessageCircle } from 'lucide-react';
import useCartStore from '../store/cartStore';
import BottomNav from '../components/Layout/BottomNav';
import useAuthStore from '../store/authStore';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const deliveryCharge = subtotal > 0 ? 20 : 0; // Flat ₹20 delivery
  const total = subtotal + deliveryCharge;

  const handleCheckout = () => {
    if (!isAuthenticated) { navigate('/login?redirect=/checkout'); return; }
    navigate('/checkout');
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 1000, height: 56, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: '1px solid #EBEBEB' }}>
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>My Cart ({items.length})</span>
        {items.length > 0 && <button onClick={clearCart} style={{ fontSize: 12, color: '#E53935', fontWeight: 600 }}>Clear All</button>}
        {items.length === 0 && <div style={{ width: 64 }} />}
      </div>

      <div style={{ paddingTop: 8 }}>
        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <div className="cart-empty-title">Your cart is empty</div>
            <div className="cart-empty-text">Add some delicious items from our menu</div>
            <button className="btn btn-primary" onClick={() => navigate('/menu')}>
              <ShoppingBag size={16} />Browse Menu
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            {items.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-image">
                  <img src={item.imageUrl} alt={item.name} loading="lazy" />
                </div>
                <div className="cart-item-body">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">₹{item.price} each</div>
                  <div className="cart-item-controls">
                    <div className="qty-control">
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                    </div>
                    <span className="cart-item-subtotal">₹{item.subtotal}</span>
                  </div>
                  <button className="remove-btn" onClick={() => removeItem(item.productId)}><Trash2 size={12} /> Remove</button>
                </div>
              </div>
            ))}

            {/* Delivery Note */}
            {subtotal > 0 && (
              <div style={{ background: '#FFF8E1', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🚴</span>
                <span style={{ fontSize: 13, color: '#E65100' }}>Delivery charge: <strong>₹20</strong></span>
              </div>
            )}

            {/* Summary */}
            <div className="cart-summary">
              <div className="cart-summary-title">Order Summary</div>
              <div className="cart-summary-row"><span>Subtotal</span><span>₹{subtotal}</span></div>
              <div className="cart-summary-row">
                <span>Delivery</span>
                <span>{deliveryCharge === 0 ? <span style={{ color: '#4CAF50', fontWeight: 600 }}>FREE</span> : `₹${deliveryCharge}`}</span>
              </div>
              <div className="cart-summary-row total"><span>Total</span><span>₹{total}</span></div>
            </div>

            {/* Checkout Button */}
            <div style={{ padding: '0 16px 16px' }}>
              <button className="cart-checkout-btn" onClick={handleCheckout} id="checkout-btn">
                Proceed to Checkout →
              </button>

              {/* WhatsApp Order Option */}
              <button
                onClick={() => navigate('/checkout?method=whatsapp')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', border: 'none', borderRadius: 999, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 10 }}
              >
                <MessageCircle size={18} />Order via WhatsApp
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CartPage;
