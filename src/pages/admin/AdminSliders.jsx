import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const LINK_TYPES = ['none', 'category', 'product', 'external'];

const emptyForm = () => ({
  title: '',
  subtitle: '',
  ctaButtonText: 'Order Now',
  linkType: 'none',
  linkedCategoryId: '',
  linkedProductId: '',
  externalUrl: '',
  displayOrder: 0,
  isActive: true,
  // image source: 'upload' | 'existing'
  imageMode: 'upload',
  image: null,           // File object (upload mode)
  imagePreview: null,    // preview URL shown in zone
  existingImageUrl: '',  // URL from picker (existing mode)
});

export default function AdminSliders() {
  const [sliders, setSliders]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(emptyForm());

  // Picker state
  const [pickerItems, setPickerItems]     = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch]   = useState('');

  const fileRef = useRef(null);

  /* ─── Load sliders ─────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sliders/admin/all');
      setSliders(data.data.sliders || []);
    } catch { toast.error('Failed to load sliders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  /* ─── Load picker items (products + categories) ─────────────────── */
  const loadPickerItems = async () => {
    if (pickerItems.length) return; // already loaded
    setPickerLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products?limit=100&available=all'),
        api.get('/categories'),
      ]);
      const products   = (prodRes.data.data.products   || []).map(p => ({ _id: p._id, label: p.name,  imageUrl: p.imageUrl,  type: 'product' }));
      const categories = (catRes.data.data.categories  || []).filter(c => c.imageUrl).map(c => ({ _id: c._id, label: c.name, imageUrl: c.imageUrl, type: 'category' }));
      setPickerItems([...categories, ...products]);
    } catch { toast.error('Could not load items'); }
    finally { setPickerLoading(false); }
  };

  /* ─── Form helpers ─────────────────────────────────────────────── */
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    set('image', file);
    set('imagePreview', URL.createObjectURL(file));
    set('existingImageUrl', '');
  };

  const handlePickExisting = (item) => {
    set('existingImageUrl', item.imageUrl);
    set('imagePreview', item.imageUrl);
    set('image', null);
    // Auto-fill title if blank
    setForm(f => ({
      ...f,
      existingImageUrl: item.imageUrl,
      imagePreview: item.imageUrl,
      image: null,
      title: f.title || item.label,
    }));
  };

  const switchMode = (mode) => {
    set('imageMode', mode);
    if (mode === 'existing') loadPickerItems();
  };

  const openAdd = () => {
    setForm(emptyForm());
    setEditingId('new');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (slider) => {
    setForm({
      title:            slider.title || '',
      subtitle:         slider.subtitle || '',
      ctaButtonText:    slider.ctaButtonText || 'Order Now',
      linkType:         slider.linkType || 'none',
      linkedCategoryId: slider.linkedCategoryId || '',
      linkedProductId:  slider.linkedProductId || '',
      externalUrl:      slider.externalUrl || '',
      displayOrder:     slider.displayOrder ?? 0,
      isActive:         slider.isActive ?? true,
      imageMode:        'upload',
      image:            null,
      imagePreview:     slider.imageUrl || null,
      existingImageUrl: '',
    });
    setEditingId(slider._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm()); };

  /* ─── Save ──────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const hasImage = form.image || form.existingImageUrl || (editingId !== 'new' && form.imagePreview);
    if (!hasImage) { toast.error('Please select or upload an image'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title',         form.title);
      fd.append('subtitle',      form.subtitle);
      fd.append('ctaButtonText', form.ctaButtonText);
      fd.append('linkType',      form.linkType);
      fd.append('displayOrder',  form.displayOrder);
      fd.append('isActive',      form.isActive);
      if (form.linkType === 'external') fd.append('externalUrl', form.externalUrl);
      if (form.linkType === 'category') fd.append('linkedCategoryId', form.linkedCategoryId);
      if (form.linkType === 'product')  fd.append('linkedProductId', form.linkedProductId);

      // Image: new file upload takes priority; otherwise pass URL
      if (form.image) {
        fd.append('image', form.image);
      } else if (form.existingImageUrl) {
        fd.append('imageUrl', form.existingImageUrl);
      }

      if (editingId === 'new') {
        await api.post('/sliders', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Slider created!');
      } else {
        await api.put(`/sliders/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Slider updated!');
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slider');
    } finally { setSaving(false); }
  };

  /* ─── Delete & toggle ────────────────────────────────────────────── */
  const handleDelete = async (slider) => {
    if (!window.confirm(`Delete "${slider.title}"? This cannot be undone.`)) return;
    setDeletingId(slider._id);
    try {
      await api.delete(`/sliders/${slider._id}`);
      toast.success('Slider deleted');
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  };

  const handleToggleActive = async (slider) => {
    try {
      const fd = new FormData();
      fd.append('title',    slider.title);
      fd.append('isActive', !slider.isActive);
      await api.put(`/sliders/${slider._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(slider.isActive ? 'Slider hidden' : 'Slider visible');
      load();
    } catch { toast.error('Failed to update'); }
  };

  /* ─── Filtered picker ─────────────────────────────────────────────── */
  const filteredPicker = pickerItems.filter(item =>
    !pickerSearch || item.label.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="admin-page">
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">🖼️ Carousel Sliders</h1>
          <span className="admin-page-sub">Manage homepage hero carousel images and links</span>
        </div>
        {!editingId && (
          <button className="admin-btn admin-btn-primary" onClick={openAdd}>+ Add Slide</button>
        )}
      </div>

      {/* ── Add / Edit Form ─────────────────────────────────────────── */}
      {editingId && (
        <div className="admin-card" style={{ marginBottom: 24 }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              {editingId === 'new' ? '➕ New Slide' : '✏️ Edit Slide'}
            </h2>
            <button className="admin-btn admin-btn-ghost" onClick={cancelEdit}>✕ Cancel</button>
          </div>

          <div className="admin-form admin-form-grid" style={{ padding: '20px' }}>

            {/* ── IMAGE SECTION — full width ── */}
            <div className="admin-span-full">
              <div className="admin-label" style={{ marginBottom: 10 }}>Slide Image *</div>

              {/* Mode tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  className={`slider-mode-tab${form.imageMode === 'upload' ? ' active' : ''}`}
                  onClick={() => switchMode('upload')}
                >
                  📤 Upload New
                </button>
                <button
                  className={`slider-mode-tab${form.imageMode === 'existing' ? ' active' : ''}`}
                  onClick={() => switchMode('existing')}
                >
                  🗂️ Pick from Existing
                </button>
              </div>

              {/* Upload mode */}
              {form.imageMode === 'upload' && (
                <div
                  className="slider-upload-zone"
                  onClick={() => fileRef.current?.click()}
                  style={{ backgroundImage: form.imagePreview ? `url(${form.imagePreview})` : 'none' }}
                >
                  {!form.imagePreview && (
                    <div className="slider-upload-placeholder">
                      <div style={{ fontSize: 36 }}>🖼️</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Click to upload image</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                        Recommended: 1200×450px · JPG / PNG / WebP
                      </div>
                    </div>
                  )}
                  {form.imagePreview && (
                    <div className="slider-upload-change">🔄 Click to change image</div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </div>
              )}

              {/* Pick from existing mode */}
              {form.imageMode === 'existing' && (
                <div className="slider-picker-panel">
                  {/* Selected preview */}
                  {form.existingImageUrl && (
                    <div className="slider-picker-selected">
                      <img src={form.existingImageUrl} alt="selected" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>✅ Image selected</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, wordBreak: 'break-all' }}>
                          {form.existingImageUrl.split('/').pop()}
                        </div>
                      </div>
                      <button
                        onClick={() => { set('existingImageUrl', ''); set('imagePreview', null); }}
                        style={{ color: '#DC2626', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        ✕ Clear
                      </button>
                    </div>
                  )}

                  {/* Search */}
                  <input
                    className="admin-input"
                    placeholder="🔍 Search products or categories…"
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    style={{ marginBottom: 12 }}
                  />

                  {/* Grid */}
                  {pickerLoading ? (
                    <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Loading images…</div>
                  ) : (
                    <div className="slider-picker-grid">
                      {filteredPicker.map(item => (
                        <div
                          key={item._id}
                          className={`slider-picker-item${form.existingImageUrl === item.imageUrl ? ' selected' : ''}`}
                          onClick={() => handlePickExisting(item)}
                        >
                          <img src={item.imageUrl} alt={item.label} />
                          <div className="slider-picker-label">{item.label}</div>
                          <span className="slider-picker-type">{item.type}</span>
                          {form.existingImageUrl === item.imageUrl && (
                            <div className="slider-picker-check">✓</div>
                          )}
                        </div>
                      ))}
                      {filteredPicker.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>
                          No items found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Title ── */}
            <div className="admin-form-group">
              <label className="admin-label">Title *</label>
              <input className="admin-input" placeholder="e.g. CHICKEN LOLLIPOP" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            {/* ── Subtitle ── */}
            <div className="admin-form-group">
              <label className="admin-label">Subtitle / Tag</label>
              <input className="admin-input" placeholder="e.g. CRISPY & SPICY" value={form.subtitle} onChange={e => set('subtitle', e.target.value)} />
            </div>

            {/* ── CTA Text ── */}
            <div className="admin-form-group">
              <label className="admin-label">Button Text</label>
              <input className="admin-input" placeholder="Order Now" value={form.ctaButtonText} onChange={e => set('ctaButtonText', e.target.value)} />
            </div>

            {/* ── Display Order ── */}
            <div className="admin-form-group">
              <label className="admin-label">Display Order</label>
              <input className="admin-input" type="number" min={0} value={form.displayOrder} onChange={e => set('displayOrder', Number(e.target.value))} />
            </div>

            {/* ── Link Type ── */}
            <div className="admin-form-group">
              <label className="admin-label">Link Type</label>
              <select className="admin-input" value={form.linkType} onChange={e => set('linkType', e.target.value)}>
                {LINK_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            {/* Conditional link field */}
            {form.linkType === 'external' && (
              <div className="admin-form-group">
                <label className="admin-label">External URL</label>
                <input className="admin-input" placeholder="https://…" value={form.externalUrl} onChange={e => set('externalUrl', e.target.value)} />
              </div>
            )}
            {form.linkType === 'category' && (
              <div className="admin-form-group">
                <label className="admin-label">Category ID</label>
                <input className="admin-input" placeholder="Category ObjectId" value={form.linkedCategoryId} onChange={e => set('linkedCategoryId', e.target.value)} />
              </div>
            )}
            {form.linkType === 'product' && (
              <div className="admin-form-group">
                <label className="admin-label">Product ID</label>
                <input className="admin-input" placeholder="Product ObjectId" value={form.linkedProductId} onChange={e => set('linkedProductId', e.target.value)} />
              </div>
            )}

            {/* ── Active toggle ── */}
            <div className="admin-form-group" style={{ justifyContent: 'flex-end', paddingTop: 8 }}>
              <label className="admin-toggle-label" style={{ margin: 0 }}>
                <input type="checkbox" className="admin-toggle-input" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
                <span className="admin-toggle-track" />
                <span style={{ fontSize: 12, fontWeight: 700, color: form.isActive ? '#10b981' : '#9ca3af' }}>
                  {form.isActive ? 'Visible on site' : 'Hidden'}
                </span>
              </label>
            </div>

            {/* ── Save ── */}
            <div className="admin-span-full" style={{ display: 'flex', gap: 10 }}>
              <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 13 }}>
                {saving ? '⏳ Saving…' : '💾 Save Slide'}
              </button>
              <button className="admin-btn admin-btn-ghost" onClick={cancelEdit} style={{ padding: '13px 22px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Slider List ────────────────────────────────────────────── */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">All Slides ({sliders.length})</h2>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>Ordered by Display Order field</span>
        </div>

        {loading ? (
          <div className="admin-loading">Loading sliders…</div>
        ) : sliders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No sliders yet</div>
            <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>Add your first carousel slide</div>
            <button className="admin-btn admin-btn-primary" onClick={openAdd}>+ Add First Slide</button>
          </div>
        ) : (
          sliders.map((slider, idx) => (
            <div key={slider._id} className="slider-list-row" style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none' }}>
              <div className="slider-thumb-wrap">
                <img src={slider.imageUrl} alt={slider.title} className="slider-thumb" />
                {!slider.isActive && <div className="slider-thumb-hidden">Hidden</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 3 }}>
                  {slider.title}
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 99 }}>
                    Order: {slider.displayOrder}
                  </span>
                </div>
                {slider.subtitle && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 3 }}>{slider.subtitle}</div>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: slider.isActive ? '#d1fae5' : '#f3f4f6', color: slider.isActive ? '#065f46' : '#9ca3af' }}>
                    {slider.isActive ? '✅ Visible' : '👁️ Hidden'}
                  </span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>Link: {slider.linkType}</span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>CTA: "{slider.ctaButtonText || 'Order Now'}"</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => handleToggleActive(slider)}>
                  {slider.isActive ? '👁️ Hide' : '✅ Show'}
                </button>
                <button className="admin-btn admin-btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => openEdit(slider)}>
                  ✏️ Edit
                </button>
                <button
                  className="admin-btn"
                  style={{ fontSize: 12, padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}
                  onClick={() => handleDelete(slider)}
                  disabled={deletingId === slider._id}
                >
                  {deletingId === slider._id ? '…' : '🗑️'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
