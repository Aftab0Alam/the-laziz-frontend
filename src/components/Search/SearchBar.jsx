import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import api from '../../utils/api';

const RECENT_KEY = 'laziz_recent_searches';
const getRecents = () => JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
const addRecent = (q) => {
  const recents = getRecents().filter(r => r !== q).slice(0, 4);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...recents]));
};

const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/search?q=${encodeURIComponent(query)}&limit=6`);
        setResults(data.data.products || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  useEffect(() => {
    const handleClick = (e) => { if (!wrapperRef.current?.contains(e.target)) setFocused(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleFocus = () => { setFocused(true); setRecents(getRecents()); };

  const handleSelect = (product) => {
    addRecent(product.name);
    setFocused(false); setQuery('');
    navigate(`/product/${product.slug}`);
  };

  const handleSearch = (q) => {
    const term = q || query.trim();
    if (!term) return;
    addRecent(term);
    setFocused(false); setQuery('');
    navigate(`/menu?search=${encodeURIComponent(term)}`);
  };

  const showDropdown = focused && (query.trim() ? results.length > 0 || loading : recents.length > 0);

  return (
    <div className="search-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          className="search-input"
          type="text"
          placeholder="Search for Biryani, Roll, Momos..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          aria-label="Search food items"
        />
        {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16} color="#999" /></button>}
        <button className="search-filter-btn" aria-label="Filter" onClick={() => navigate('/menu')}>
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="search-dropdown">
          {!query.trim() && recents.length > 0 && (
            <div className="search-dropdown-section">
              <div className="search-dropdown-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 }}>
                <span>Recent Searches</span>
                <button onClick={() => { localStorage.removeItem(RECENT_KEY); setRecents([]); }} style={{ fontSize: 11, color: '#E53935', fontWeight: 600 }}>Clear</button>
              </div>
              {recents.map(r => (
                <div key={r} className="search-result-item" onClick={() => handleSearch(r)}>
                  <Search size={14} color="#999" />
                  <span className="search-result-name">{r}</span>
                </div>
              ))}
            </div>
          )}
          {query.trim() && (
            <div className="search-dropdown-section">
              <div className="search-dropdown-label">Dishes</div>
              {loading && <div style={{ padding: '10px 16px', fontSize: 12, color: '#999' }}>Searching...</div>}
              {results.map(product => (
                <div key={product._id} className="search-result-item" onClick={() => handleSelect(product)}>
                  <img src={product.imageUrl} alt={product.name} className="search-result-img" loading="lazy" />
                  <div className="search-result-info">
                    <div className="search-result-name">{product.name}</div>
                    <div className="search-result-cat">{product.categoryId?.name}</div>
                  </div>
                  <span className="search-result-price">₹{product.discountedPrice || product.price}</span>
                </div>
              ))}
              <div className="search-result-item" style={{ color: '#E53935', fontWeight: 600, fontSize: 13 }} onClick={() => handleSearch()}>
                <Search size={14} />
                See all results for "{query}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
