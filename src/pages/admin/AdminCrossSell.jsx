import { useEffect, useState, useMemo } from 'react';
import { fetchCrossSellAdmin, fetchCrossSellProducts, updateCrossSell } from '../../utils/adminApi';
import toast from 'react-hot-toast';

const PRESET_BADGES = [
  { label: 'HOT DEAL',        color: '#E53935' },
  { label: '50% OFF',         color: '#f97316' },
  { label: 'WEEKEND SPECIAL', color: '#8b5cf6' },
  { label: 'NEW OFFER',       color: '#10b981' },
  { label: 'FLASH SALE',      color: '#eab308' },
  { label: 'LIMITED TIME',    color: '#3b82f6' },
];

export default function AdminCrossSell() {
  const [current, setCurrent]   = useState(null);      // saved doc from DB
  const [products, setProducts] = useState([]);         // all available products
  // selected: [{ productId, offerPrice }]
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({
    title:      "🔥 Today's Offer",
    subtitle:   "Limited time deals — grab them before they're gone!",
    badgeLabel: 'HOT DEAL',
    badgeColor: '#E53935',
    isActive:   true,
  });
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load existing config + all products ──────────────────────────
  useEffect(() => {
    Promise.all([fetchCrossSellAdmin(), fetchCrossSellProducts()])
      .then(([cs, prods]) => {
        setCurrent(cs);
        setProducts(prods);
        if (cs) {
          setForm({
            title:      cs.title      || "🔥 Today's Offer",
            subtitle:   cs.subtitle   || '',
            badgeLabel: cs.badgeLabel || 'HOT DEAL',
            badgeColor: cs.badgeColor || '#E53935',
            isActive:   cs.isActive   ?? true,
          });
          // Restore selected products with their saved offerPrices
          const saved = (cs.products || cs.productIds || []).map(p => ({
            productId:  p._id || p.productId,
            offerPrice: p.offerPrice != null ? String(p.offerPrice) : '',
          }));
          setSelected(saved);
        }
      })
      .catch(() => toast.error('Failed to load cross-sell data'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    products.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    ), [products, search]);

  // ── Toggle a product in/out of selected list ─────────────────────
  const toggleProduct = (id) => {
    setSelected(prev => {
      const exists = prev.find(x => x.productId === id);
      if (exists) return prev.filter(x => x.productId !== id);
      return [...prev, { productId: id, offerPrice: '' }];
    });
  };

  // ── Update offer price for a specific product ─────────────────────
  const setOfferPrice = (productId, value) => {
    setSelected(prev =>
      prev.map(x => x.productId === productId ? { ...x, offerPrice: value } : x)
    );
  };

  // ── Save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selected.length === 0) { toast.error('Select at least one product!'); return; }

    // Validate: offer prices must be positive numbers if provided
    for (const s of selected) {
      if (s.offerPrice !== '' && s.offerPrice !== null) {
        const n = Number(s.offerPrice);
        if (isNaN(n) || n <= 0) {
          const p = products.find(x => x._id === s.productId);
          toast.error(`Invalid offer price for "${p?.name || 'product'}"`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        products: selected.map(s => ({
          productId:  s.productId,
          offerPrice: s.offerPrice !== '' ? Number(s.offerPrice) : null,
        })),
      };
      const saved = await updateCrossSell(payload);
      setCurrent(saved);
      toast.success('✅ Today\'s Offer updated!');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-loading">⏳ Loading…</div>;

  const selectedIds = selected.map(x => x.productId);

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">🎯 Today's Offer</h1>
          <span className="admin-page-sub">
            Set products &amp; custom offer prices shown on the homepage. Changes go live immediately.
          </span>
        </div>
        <button
          className="admin-btn admin-btn-primary"
          onClick={handleSave}
          disabled={saving}
          id="crosssell-save-btn"
        >
          {saving ? '⏳ Saving…' : '💾 Save Changes'}
        </button>
      </div>

      <div className="cs-grid">
        {/* ── Left: Config Panel ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Section Settings */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Section Settings</h2>
              <label className="admin-toggle-label" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  className="admin-toggle-input"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  id="cs-active-toggle"
                />
                <span className="admin-toggle-track" />
                <span style={{ fontSize: 12, color: form.isActive ? '#10b981' : '#9ca3af', fontWeight: 700 }}>
                  {form.isActive ? 'Visible on site' : 'Hidden'}
                </span>
              </label>
            </div>
            <div className="admin-form" style={{ paddingTop: 16 }}>
              <div className="admin-form-group" style={{ marginBottom: 14 }}>
                <label className="admin-label">Section Title</label>
                <input
                  className="admin-input"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. 🔥 Today's Offer"
                  id="cs-title"
                />
              </div>
              <div className="admin-form-group" style={{ marginBottom: 14 }}>
                <label className="admin-label">Subtitle / Description</label>
                <input
                  className="admin-input"
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="e.g. Limited time deals — grab them before they're gone!"
                  id="cs-subtitle"
                />
              </div>

              {/* Badge */}
              <div className="admin-form-group">
                <label className="admin-label">Offer Badge Label</label>
                <div className="cs-badge-presets">
                  {PRESET_BADGES.map(b => (
                    <button
                      key={b.label}
                      className={`cs-badge-preset ${form.badgeLabel === b.label && form.badgeColor === b.color ? 'selected' : ''}`}
                      style={{ '--badge-color': b.color }}
                      onClick={() => setForm(f => ({ ...f, badgeLabel: b.label, badgeColor: b.color }))}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                  <input
                    className="admin-input"
                    value={form.badgeLabel}
                    onChange={e => setForm(f => ({ ...f, badgeLabel: e.target.value }))}
                    placeholder="Custom badge text…"
                    style={{ flex: 1 }}
                    id="cs-badge-label"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Colour
                    <input
                      type="color"
                      value={form.badgeColor}
                      onChange={e => setForm(f => ({ ...f, badgeColor: e.target.value }))}
                      style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }}
                      id="cs-badge-color"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">👁️ Live Preview</h2>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>How the section header looks</span>
            </div>
            <div style={{ padding: '20px 24px', background: '#fafafa', borderRadius: '0 0 14px 14px' }}>
              <div className="cs-preview-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      className="cs-preview-badge"
                      style={{ background: form.badgeColor + '22', color: form.badgeColor, border: `1.5px solid ${form.badgeColor}` }}
                    >
                      {form.badgeLabel || 'OFFER'}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{form.title || "Today's Offer"}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{form.subtitle}</div>
                </div>
                <div style={{ fontSize: 11, color: '#E53935', fontWeight: 700 }}>View All →</div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, overflow: 'hidden' }}>
                {selected.slice(0, 3).map(({ productId, offerPrice }) => {
                  const p = products.find(x => x._id === productId);
                  if (!p) return null;
                  const displayPrice = offerPrice !== '' ? Number(offerPrice) : (p.discountedPrice || p.price);
                  return (
                    <div key={productId} style={{ width: 90, flexShrink: 0, background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
                      <img src={p.imageUrl} alt={p.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                      <div style={{ padding: '4px 6px', fontSize: 10, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ padding: '0 6px 6px', fontSize: 10, color: '#E53935', fontWeight: 800 }}>₹{displayPrice}</div>
                    </div>
                  );
                })}
                {selected.length === 0 && (
                  <div style={{ color: '#9ca3af', fontSize: 12, alignSelf: 'center' }}>No products selected yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Selected products — price editor */}
          {selected.length > 0 && (
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">💰 Set Offer Prices</h2>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Leave blank to use product's own price</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.map(({ productId, offerPrice }) => {
                  const p = products.find(x => x._id === productId);
                  if (!p) return null;
                  return (
                    <div key={productId} className="cs-price-row">
                      <img src={p.imageUrl} alt={p.name} className="cs-product-img" />
                      <div className="cs-product-info">
                        <div className="cs-product-name">{p.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          Regular: <span style={{ fontWeight: 700, color: '#374151' }}>₹{p.discountedPrice || p.price}</span>
                          {p.discountedPrice && (
                            <span style={{ marginLeft: 4, textDecoration: 'line-through', color: '#d1d5db' }}>₹{p.price}</span>
                          )}
                        </div>
                      </div>
                      <div className="cs-price-input-wrap">
                        <span className="cs-price-rupee">₹</span>
                        <input
                          className="admin-input cs-price-input"
                          type="number"
                          min="1"
                          step="0.5"
                          placeholder={`${p.discountedPrice || p.price}`}
                          value={offerPrice}
                          onChange={e => setOfferPrice(productId, e.target.value)}
                          id={`cs-price-${productId}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Product Picker ─────────────────────────────────────── */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              Select Products
              <span className="cs-count-pill">{selected.length} selected</span>
            </h2>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <input
              className="admin-input"
              placeholder="🔍 Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="cs-product-search"
            />
          </div>

          {/* Product list */}
          <div className="cs-product-list">
            {filtered.length === 0 && (
              <div className="admin-empty-state">No products found</div>
            )}
            {filtered.map(p => {
              const isSelected = selectedIds.includes(p._id);
              const entry = selected.find(x => x.productId === p._id);
              return (
                <div
                  key={p._id}
                  className={`cs-product-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleProduct(p._id)}
                  id={`cs-product-${p._id}`}
                >
                  <div className="cs-product-check">
                    {isSelected ? '✅' : <span className="cs-empty-check" />}
                  </div>
                  <img src={p.imageUrl} alt={p.name} className="cs-product-img" />
                  <div className="cs-product-info">
                    <div className="cs-product-name">{p.name}</div>
                    <div className="cs-product-meta">
                      <span style={{ color: '#E53935', fontWeight: 700 }}>₹{p.discountedPrice || p.price}</span>
                      {p.discountedPrice && (
                        <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: 11 }}>₹{p.price}</span>
                      )}
                      {p.isBestSeller && <span className="admin-badge badge-yellow" style={{ fontSize: 10 }}>⭐ Bestseller</span>}
                      {p.isFeatured   && <span className="admin-badge badge-blue"   style={{ fontSize: 10 }}>✨ Featured</span>}
                    </div>
                    {isSelected && entry?.offerPrice !== '' && entry?.offerPrice != null && (
                      <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginTop: 2 }}>
                        🏷️ Offer price: ₹{entry.offerPrice}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', background: '#fafafa', borderRadius: '0 0 14px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Selected ({selected.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selected.map(({ productId, offerPrice }) => {
                  const p = products.find(x => x._id === productId);
                  if (!p) return null;
                  return (
                    <span key={productId} className="cs-chip">
                      {p.name}
                      {offerPrice !== '' && offerPrice != null && (
                        <span style={{ fontWeight: 800, marginLeft: 4 }}>₹{offerPrice}</span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); toggleProduct(productId); }} className="cs-chip-remove">×</button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Last updated info */}
      {current?.updatedAt && (
        <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: -8 }}>
          Last updated: {new Date(current.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      )}
    </div>
  );
}
