import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import api from '../utils/api';
import BottomNav from '../components/Layout/BottomNav';
import ProductCard from '../components/Product/ProductCard';

export default function FavouritesPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['favourites'],
    queryFn: () => api.get('/auth/favourites').then(r => r.data.data.favourites),
  });

  const favourites = data || [];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 1000, height: 56, background: 'white',
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 16px', borderBottom: '1px solid #EBEBEB',
      }}>
        <button onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>My Favourites</span>
        <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>
          {favourites.length} item{favourites.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ paddingTop: 8, paddingBottom: 80 }}>
        {isLoading ? (
          /* Skeleton */
          <div style={{ padding: '16px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 120, background: '#f3f4f6', borderRadius: 12, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : favourites.length === 0 ? (
          /* Empty state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 64, lineHeight: 1 }}>💔</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A' }}>No favourites yet</div>
            <div style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.5, maxWidth: 260 }}>
              Tap the ❤️ on any dish to save it here for quick ordering
            </div>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/menu')}
              style={{ marginTop: 8 }}
            >
              Browse Menu
            </button>
          </div>
        ) : (
          /* Product grid */
          <div style={{ padding: '16px' }}>
            <div className="product-grid">
              {favourites.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
