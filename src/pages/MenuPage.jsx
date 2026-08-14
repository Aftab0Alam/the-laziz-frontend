import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X, Leaf, Flame, Loader2 } from 'lucide-react';
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

const LIMIT = 12;

/* Skeleton for a single menu item row */
const MenuItemSkeleton = () => (
  <div style={{ display: 'flex', gap: 12, background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div className="skeleton" style={{ width: 90, height: 90, borderRadius: 8, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div className="skeleton" style={{ height: 14, marginBottom: 8, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 4 }} />
    </div>
  </div>
);

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem, getItemQuantity, updateQuantity } = useCartStore();

  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [searchQ, setSearchQ] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    isVeg: false,
    isBestSeller: false,
    isFeatured: false,
    sort: 'default',
    minPrice: '',
    maxPrice: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sentinel element at the bottom triggers auto-load via IntersectionObserver
  const sentinelRef = useRef(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data.categories),
    staleTime: 60 * 60 * 1000,
  });

  const buildQuery = (page) => {
    const params = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    if (filters.isVeg) params.set('isVeg', 'true');
    if (filters.isBestSeller) params.set('isBestSeller', 'true');
    if (filters.isFeatured) params.set('isFeatured', 'true');
    if (filters.sort !== 'default') params.set('sort', filters.sort);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    params.set('page', page);
    params.set('limit', LIMIT);
    return params.toString();
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['menuProducts', activeCategory, filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get(`/products?${buildQuery(pageParam)}`).then(r => r.data.data),
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage.pages || 1;
      const nextPage = allPages.length + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Flatten all pages into one products array
  const products = data?.pages.flatMap(p => p.products) ?? [];

  // Auto-load next page when sentinel enters viewport
  const handleObserver = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleAddItem = (product, e) => {
    e.stopPropagation();
    addItem(product);
    toast.success(`${product.name} added!`, { duration: 1200 });
  };

  const handleCategoryChange = (slug) => {
    setActiveCategory(slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-wrapper">
      <Header />

      {/* Sticky top controls */}
      <div className="menu-sticky-controls">
        {/* Search bar */}
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
                { key: 'isFeatured', label: "⭐ Today's Special" },
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
        <div className="menu-category-tabs hide-scrollbar">
          <button className={`menu-tab${activeCategory === 'all' ? ' active' : ''}`} onClick={() => handleCategoryChange('all')}>All</button>
          {(categories || []).map(cat => (
            <button key={cat._id} className={`menu-tab${activeCategory === cat.slug ? ' active' : ''}`} onClick={() => handleCategoryChange(cat.slug)}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>{/* end menu-sticky-controls */}

      {/* Products — append-only, no full-page replace */}
      <div className="menu-grid">

        {/* Initial loading skeletons */}
        {isLoading && [...Array(6)].map((_, i) => <MenuItemSkeleton key={i} />)}

        {/* Empty state */}
        {!isLoading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No items found</div>
            <div style={{ fontSize: 13 }}>Try a different category or filter</div>
          </div>
        )}

        {/* Rendered products — all pages combined */}
        {products.map(product => {
          const qty = getItemQuantity(product._id);
          const price = product.discountedPrice || product.price;
          return (
            <div key={product._id} className="menu-item-card" onClick={() => navigate(`/product/${product.slug}`)}>
              <div className="menu-item-image">
                <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" />
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

        {/* Skeletons appended at bottom while fetching next page */}
        {isFetchingNextPage && [...Array(3)].map((_, i) => <MenuItemSkeleton key={`next-${i}`} />)}
      </div>

      {/* Invisible sentinel — IntersectionObserver auto-loads next page */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Spinner shown during auto-load */}
      {isFetchingNextPage && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', color: '#E53935' }}>
          <Loader2 size={22} style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* Manual "Load More" — explicit fallback */}
      {hasNextPage && !isFetchingNextPage && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px' }}>
          <button
            onClick={() => fetchNextPage()}
            style={{
              padding: '10px 28px', borderRadius: 999,
              border: '1.5px solid #E53935', background: 'white',
              color: '#E53935', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            Load More
          </button>
        </div>
      )}

      {/* End of list */}
      {!hasNextPage && products.length > 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#bbb', fontSize: 12, fontWeight: 500 }}>
          — You've seen all {products.length} items —
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MenuPage;

