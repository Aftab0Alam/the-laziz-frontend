import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X, ChevronLeft, Leaf, Flame } from 'lucide-react';
import Header from '../components/Layout/Header';
import BottomNav from '../components/Layout/BottomNav';
import api from '../utils/api';
import useCartStore from '../store/cartStore';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value: 'default', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const MenuPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem, getItemQuantity, updateQuantity } = useCartStore();

  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [searchQ, setSearchQ] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({ isVeg: false, isBestSeller: false, isFeatured: false, sort: 'default', minPrice: '', maxPrice: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data.categories),
    staleTime: 60 * 60 * 1000,
  });

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    if (filters.isVeg) params.set('isVeg', 'true');
    if (filters.isBestSeller) params.set('isBestSeller', 'true');
    if (filters.isFeatured) params.set('isFeatured', 'true');
    if (filters.sort !== 'default') params.set('sort', filters.sort);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    params.set('page', page);
    params.set('limit', 12);
    return params.toString();
  };

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['menuProducts', activeCategory, filters, page],
    queryFn: () => api.get(`/products?${buildQuery()}`).then(r => r.data.data),
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true,
  });

  const handleAddItem = (product, e) => {
    e.stopPropagation();
    addItem(product);
    toast.success(`${product.name} added!`, { duration: 1200 });
  };

  const products = productsData?.products || [];
  const totalPages = productsData?.pages || 1;

  return (
    <div className="page-wrapper">
      <Header />

      {/* Search bar for menu */}
      <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #EBEBEB', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F5', borderRadius: 999, padding: '9px 14px' }}>
          <Search size={16} color="#999" />
          <input
            type="text" value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search in menu..."
            style={{ flex: 1, background: 'transparent', fontSize: 13, color: '#1A1A1A' }}
          />
          {searchQ && <button onClick={() => setSearchQ('')}><X size={14} color="#999" /></button>}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ background: showFilters ? '#FFEBEE' : '#F5F5F5', borderRadius: 999, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 4, color: showFilters ? '#E53935' : '#666', fontWeight: 600, fontSize: 13 }}
        >
          <SlidersHorizontal size={15} /> Filter
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div style={{ background: 'white', padding: '12px 16px', borderBottom: '1px solid #EBEBEB' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {[
              { key: 'isVeg', label: '🌿 Veg Only' },
              { key: 'isBestSeller', label: '🔥 Best Sellers' },
              { key: 'isFeatured', label: '⭐ Today\'s Special' },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilters(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${filters[f.key] ? '#E53935' : '#EBEBEB'}`, background: filters[f.key] ? '#FFEBEE' : 'white', color: filters[f.key] ? '#E53935' : '#666', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>Sort:</span>
            <select value={filters.sort} onChange={e => setFilters(prev => ({ ...prev, sort: e.target.value }))}
              style={{ flex: 1, border: '1.5px solid #EBEBEB', borderRadius: 8, padding: '6px 10px', fontSize: 13, background: 'white' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="menu-category-tabs hide-scrollbar" style={{ top: '110px' }}>
        <button className={`menu-tab${activeCategory === 'all' ? ' active' : ''}`} onClick={() => { setActiveCategory('all'); setPage(1); }}>All</button>
        {(categories || []).map(cat => (
          <button key={cat._id} className={`menu-tab${activeCategory === cat.slug ? ' active' : ''}`} onClick={() => { setActiveCategory(cat.slug); setPage(1); }}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="menu-grid">
        {isLoading && [...Array(6)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="skeleton" style={{ width: 90, height: 90, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 14, marginBottom: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 12, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 4 }} />
            </div>
          </div>
        ))}

        {!isLoading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No items found</div>
            <div style={{ fontSize: 13 }}>Try a different category or filter</div>
          </div>
        )}

        {!isLoading && products.map(product => {
          const qty = getItemQuantity(product._id);
          const price = product.discountedPrice || product.price;
          return (
            <div key={product._id} className="menu-item-card" onClick={() => navigate(`/product/${product.slug}`)}>
              <div className="menu-item-image">
                <img src={product.imageUrl} alt={product.name} loading="lazy" />
              </div>
              <div className="menu-item-body">
                <div>
                  <div className="menu-item-top">
                    <div className="menu-item-name">{product.name}</div>
                    <span>{product.isVegetarian ? <Leaf size={14} color="#4CAF50" /> : <Flame size={14} color="#B71C1C" />}</span>
                  </div>
                  <div className="menu-item-badges">
                    {product.isBestSeller && <span className="badge badge-bestseller">Best Seller</span>}
                    {product.isFeatured && <span className="badge badge-special">Today's Special</span>}
                    {product.isNewArrival && <span className="badge badge-new">New</span>}
                  </div>
                  {product.description && <div className="menu-item-desc">{product.description}</div>}
                </div>
                <div className="menu-item-footer">
                  <div className="menu-item-price">
                    {product.discountedPrice && <span className="original">₹{product.price}</span>}
                    ₹{price}
                  </div>
                  {qty === 0 ? (
                    <button className="btn-add" onClick={e => handleAddItem(product, e)}>+ Add</button>
                  ) : (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #E53935', borderRadius: 999, padding: '4px 10px' }}>
                      <button onClick={() => updateQuantity(product._id, qty - 1)} style={{ color: '#E53935', fontSize: 18, fontWeight: 700 }}>−</button>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                      <button onClick={() => updateQuantity(product._id, qty + 1)} style={{ color: '#E53935', fontSize: 18, fontWeight: 700 }}>+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 999, border: '1.5px solid #EBEBEB', background: page === 1 ? '#F5F5F5' : 'white', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            Prev
          </button>
          <span style={{ padding: '8px 16px', fontSize: 13, color: '#666' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '8px 16px', borderRadius: 999, border: '1.5px solid #EBEBEB', background: page === totalPages ? '#F5F5F5' : 'white', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: '#E53935' }}>
            Next
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MenuPage;
