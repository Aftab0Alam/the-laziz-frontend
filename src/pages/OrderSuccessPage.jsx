import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, MessageCircle, List } from 'lucide-react';
import BottomNav from '../components/Layout/BottomNav';

const OrderSuccessPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderCode = params.get('code') || 'LZ-ORDER';

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className="order-success" style={{ flex: 1 }}>
        <div className="order-success-icon">🎉</div>
        <h1 className="order-success-title">Order Placed!</h1>
        <div className="order-success-code"># {orderCode}</div>
        <p className="order-success-msg">
          Your order has been placed successfully and sent to our WhatsApp. We'll confirm it shortly!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
          <button className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={() => navigate('/orders')}>
            <List size={18} /> Track My Order
          </button>
          <button className="btn btn-outline" style={{ width: '100%', padding: 14, fontSize: 15 }} onClick={() => navigate('/menu')}>
            Order More 🍽
          </button>
        </div>

        <div style={{ background: '#E8F5E9', borderRadius: 12, padding: '12px 16px', marginTop: 8, textAlign: 'left', width: '100%', maxWidth: 300 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#2E7D32', marginBottom: 6 }}>✅ What happens next?</div>
          <div style={{ fontSize: 12, color: '#388E3C', lineHeight: 1.6 }}>
            1. We'll confirm your order on WhatsApp<br/>
            2. Our kitchen will start preparing<br/>
            3. Delivery in 30-45 minutes
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default OrderSuccessPage;
