import { useEffect, useState, useCallback } from 'react';
import { fetchAdminProducts, fetchCategories, createProduct, updateProduct, deleteProduct } from '../../utils/adminApi';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', categoryId: '', description: '', price: '', discountedPrice: '',
  isVegetarian: 'false', spicyLevel: '0', tags: '', servingSize: '',
  prepTimeMinutes: '', isAvailable: 'true', isBestSeller: 'false',
  isFeatured: 'false', isNewArrival: 'false', displayOrder: '0',
};

export default function AdminProducts() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null); // product object or null
  const [form, setForm]             = useState(EMPTY_FORM);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchAdminProducts(), fetchCategories()])
      .then(([p, c]) => { setProducts(p.products || []); setCategories(c || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || '',
      categoryId: product.categoryId?._id || product.categoryId || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      discountedPrice: product.discountedPrice?.toString() || '',
      isVegetarian: product.isVegetarian ? 'true' : 'false',
      spicyLevel: product.spicyLevel?.toString() || '0',
      tags: (product.tags || []).join(', '),
      servingSize: product.servingSize || '',
      prepTimeMinutes: product.prepTimeMinutes?.toString() || '',
      isAvailable: product.isAvailable !== false ? 'true' : 'false',
      isBestSeller: product.isBestSeller ? 'true' : 'false',
      isFeatured: product.isFeatured ? 'true' : 'false',
      isNewArrival: product.isNewArrival ? 'true' : 'false',
      displayOrder: product.displayOrder?.toString() || '0',
    });
    setImageFile(null);
    setImagePreview(product.imageUrl || '');
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editing && !imageFile) { toast.error('Product image is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      if (editing) {
        await updateProduct(editing._id, fd);
        toast.success('Product updated!');
      } else {
        await createProduct(fd);
        toast.success('Product created!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeletingId(product._id);
    try {
      await deleteProduct(product._id);
      toast.success('Product deleted');
      load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Products</h1>
          <span className="admin-page-sub">{products.length} items</span>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="admin-loading">Loading products…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Badges</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={7} className="admin-table-empty">No products found.</td></tr>
                ) : products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <img src={p.imageUrl} alt={p.name} className="admin-product-thumb" />
                    </td>
                    <td>
                      <div className="admin-product-name">{p.name}</div>
                      <div className="admin-product-slug">{p.slug}</div>
                    </td>
                    <td>{p.categoryId?.name || '—'}</td>
                    <td>
                      <div>₹{p.price}</div>
                      {p.discountedPrice && <div className="admin-old-price">₹{p.discountedPrice}</div>}
                    </td>
                    <td>
                      <div className="admin-badge-row">
                        {p.isVegetarian && <span className="admin-badge badge-green">🌿 Veg</span>}
                        {p.isBestSeller && <span className="admin-badge badge-orange">🔥 Best</span>}
                        {p.isFeatured  && <span className="admin-badge badge-purple">⭐ Featured</span>}
                        {p.isNewArrival && <span className="admin-badge badge-blue">🆕 New</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${p.isAvailable ? 'badge-green' : 'badge-red'}`}>
                        {p.isAvailable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-btns">
                        <button className="admin-btn admin-btn-sm admin-btn-ghost" onClick={() => openEdit(p)}>✏️ Edit</button>
                        <button
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p._id}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-grid">
                {/* Image */}
                <div className="admin-form-group admin-span-full">
                  <label className="admin-label">Product Image {!editing && '*'}</label>
                  <div className="admin-image-upload">
                    {imagePreview && <img src={imagePreview} alt="preview" className="admin-image-preview" />}
                    <label className="admin-btn admin-btn-ghost" style={{ cursor: 'pointer' }}>
                      📷 {imagePreview ? 'Change Image' : 'Upload Image'}
                      <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Name *</label>
                  <input className="admin-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Category *</label>
                  <select className="admin-input" required value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">Select category…</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Price (₹) *</label>
                  <input className="admin-input" type="number" min="0" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Discounted Price (₹)</label>
                  <input className="admin-input" type="number" min="0" value={form.discountedPrice} onChange={e => setForm(f => ({ ...f, discountedPrice: e.target.value }))} />
                </div>

                <div className="admin-form-group admin-span-full">
                  <label className="admin-label">Description</label>
                  <textarea className="admin-input admin-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Tags (comma separated)</label>
                  <input className="admin-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="spicy, popular, lunch" />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Serving Size</label>
                  <input className="admin-input" value={form.servingSize} onChange={e => setForm(f => ({ ...f, servingSize: e.target.value }))} placeholder="e.g. 2 persons" />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Prep Time (min)</label>
                  <input className="admin-input" type="number" min="0" value={form.prepTimeMinutes} onChange={e => setForm(f => ({ ...f, prepTimeMinutes: e.target.value }))} />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Spicy Level</label>
                  <select className="admin-input" value={form.spicyLevel} onChange={e => setForm(f => ({ ...f, spicyLevel: e.target.value }))}>
                    <option value="0">🌶️ None</option>
                    <option value="1">🌶️ Mild</option>
                    <option value="2">🌶️🌶️ Medium</option>
                    <option value="3">🌶️🌶️🌶️ Hot</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Display Order</label>
                  <input className="admin-input" type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))} />
                </div>

                {/* Toggles */}
                <div className="admin-form-group admin-span-full">
                  <label className="admin-label">Options</label>
                  <div className="admin-toggles">
                    {[
                      { key: 'isVegetarian', label: '🌿 Vegetarian' },
                      { key: 'isAvailable',  label: '✅ Available' },
                      { key: 'isBestSeller', label: '🔥 Best Seller' },
                      { key: 'isFeatured',   label: '⭐ Featured' },
                      { key: 'isNewArrival', label: '🆕 New Arrival' },
                    ].map(({ key, label }) => (
                      <label key={key} className="admin-toggle-label">
                        <input
                          type="checkbox"
                          checked={form[key] === 'true'}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.checked ? 'true' : 'false' }))}
                          className="admin-toggle-input"
                        />
                        <span className="admin-toggle-track" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
