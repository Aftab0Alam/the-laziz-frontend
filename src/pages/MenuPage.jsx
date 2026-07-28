import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X, ChevronLeft, Leaf, Flame } from 'lucide-react';
import Header from '../components/Layout/Header';
import BottomNav from '../components/Layout/BottomNav';
import Pagination from '../components/Pagination';
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
    if (searchQ.trim()) params.set('search', searchQ.trim());
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

  // Reset to page 1 whenever search query or filters change
  useEffect(() => { setPage(1); }, [searchQ, filters]);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['menuProducts', activeCategory, filters, searchQ, page],
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

  // Count active filters for badge
  const activeFilterCount = [
    filters.isVeg, filters.isBestSeller, filters.isFeatured,
    filters.sort !== 'default', !!filters.minPrice, !!filters.maxPrice,
  ].filter(Boolean).length;

  // Map category slug → emoji for visual tabs
  const CATEGORY_EMOJI = {
    biryani: '🍚', chicken: '🍗', momos: '🥟', rolls: '🌯',
    'fried-chicken': '🍗', pizza: '🍕', burger: '🍔', noodles: '🍜',
    drinks: '🥤', desserts: '🍰', starters: '🍽️', kebab: '🍢',
    mutton: '🥩', fish: '🐟', veg: '🌿', sandwich: '🥪',
    default: '🍴',
  };
  const getCatEmoji = (slug) => CATEGORY_EMOJI[slug] || CATEGORY_EMOJI.default;

  return (
    <div className="page-wrapper">
      <Header />

      {/* ── STICKY TOP BAR: Search + Categories ──────────────────── */}
      <div style={{
        position: 'sticky',
        top: 60,        // stick right below the fixed header
        zIndex: 900,
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        {/* Search row */}
        <div style={{ padding: '10px 16px', display: 'flex', gap: 8, borderBottom: '1px solid #F0F0F0' }}>
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
            style={{
              background: showFilters || activeFilterCount > 0 ? '#FFEBEE' : '#F5F5F5',
              borderRadius: 999, padding: '9px 14px',
              display: 'flex', alignItems: 'center', gap: 4,
              color: showFilters || activeFilterCount > 0 ? '#E53935' : '#666',
              fontWeight: 600, fontSize: 13, position: 'relative',
            }}
          >
            <SlidersHorizontal size={15} /> Filter
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: '#E53935', color: 'white',
                width: 16, height: 16, borderRadius: '50%',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Filter Panel — slides in below search */}
        {showFilters && (
          <div style={{ background: '#FAFAFA', padding: '12px 16px', borderBottom: '1px solid #EBEBEB' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
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
        <div className="menu-category-tabs hide-scrollbar" style={{ position: 'static', boxShadow: 'none', borderBottom: 'none' }}>
          <button
            className={`menu-tab${activeCategory === 'all' ? ' active' : ''}`}
            onClick={() => { setActiveCategory('all'); setPage(1); }}
          >
            🍴 All
          </button>
          {(categories || []).map(cat => (
            <button
              key={cat._id}
              className={`menu-tab${activeCategory === cat.slug ? ' active' : ''}`}
              onClick={() => { setActiveCategory(cat.slug); setPage(1); }}
            >
              {getCatEmoji(cat.slug)} {cat.name}
            </button>
          ))}
        </div>
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
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        variant="user"
      />

      <BottomNav />
    </div>
  );
};

export default MenuPage;
